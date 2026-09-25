// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../fixtures/scenarios';
import { allocateContribution } from '../../src/domain/allocation';
import { parseSimulationInput } from '../../src/domain/input';
import { evaluateValuationAndEligibility, type AssetAssessment } from '../../src/domain/valuation';

function input(id = 'S01') {
  return parseSimulationInput(buildScenario(id)).input;
}

function quantities(result: ReturnType<typeof allocateContribution>) {
  return Object.fromEntries(result.lines.map(line => [line.ticker, line.quantity]));
}

function expectAccounting(result: ReturnType<typeof allocateContribution>) {
  expect(result.principalCents + result.reserveCents + result.feesCents).toBe(result.reservedTotalCents);
  expect(result.reservedTotalCents + result.unallocatedCents).toBe(result.budget.totalCents);
  expect(result.classAllocations.reduce((sum, row) => sum + row.budgetCents, result.unassignedCents))
    .toBe(result.budget.totalCents);
  expect(result.classAllocations.reduce((sum, row) => sum + row.spentCents, 0n)).toBe(result.reservedTotalCents);
  expect(result.lines.length).toBeLessThanOrEqual(5);
}

function only(assessments: readonly AssetAssessment[], tickers: readonly string[]) {
  const allowed = new Set(tickers);
  return assessments.map(row => allowed.has(row.ticker) ? row : { ...row, purchaseEligible: false });
}

describe('alocador mensal', () => {
  it('usa a marcação na capacidade das tentativas, sem perder uma unidade por ceil do débito', () => {
    const raw = buildScenario('S12');
    raw.fx.rate = '5.00001';
    raw.aporteCents = '55500';
    raw.policy.priceReserve = '0';
    raw.costs = { fixedCents: '0', variableRate: '0', fxSpread: '0', remittanceCents: '0' };
    const snapshot = parseSimulationInput(raw).input;
    const result = allocateContribution(snapshot, { assessments: only(evaluateValuationAndEligibility(snapshot), ['SYNTHUSD']) });
    expect(result.portfolioBefore.totals.postContributionCents).toBe(100000n);
    expect(result.lines).toEqual([expect.objectContaining({ ticker: 'SYNTHUSD', quantity: 20, principalCents: 10001n })]);
    expect(result.portfolioAfter.assets.find(row => row.ticker === 'SYNTHUSD')?.afterCents).toBe(10000n);
    expect(result.portfolioAfter.totals.wealthAfterCents).toBe(99999n);
    expectAccounting(result);
  });

  it('separa débito ceil e marcação half-up no FX de S12, conciliando patrimônio e exposições', () => {
    const raw = buildScenario('S12');
    raw.fx.rate = '5.00001';
    const snapshot = parseSimulationInput(raw).input;
    const result = allocateContribution(snapshot);
    const usd = result.lines.find(row => row.ticker === 'SYNTHUSD')!;
    expect(usd).toMatchObject({ quantity: 18, principalCents: 9001n });
    const after = result.portfolioAfter;
    const asset = after.assets.find(row => row.ticker === 'SYNTHUSD')!;
    expect(asset.afterCents - asset.currentCents).toBe(9000n);
    const markedPurchases = result.lines.reduce((sum, line) => sum +
      (line.ticker === 'SYNTHUSD' ? 9000n : line.principalCents), 0n);
    expect(after.totals.purchasesCents).toBe(markedPurchases);
    expect(after.totals.estimatedCostsCents).toBe(result.reserveCents + result.feesCents + 1n);
    expect(after.totals.wealthAfterCents).toBe(after.totals.postContributionCents - result.reserveCents - result.feesCents - 1n);
    expect(after.cash.afterCents).toBe(snapshot.portfolio.cashCents + snapshot.aporteCents - result.reservedTotalCents);
    expect(after.assets.reduce((sum, row) => sum + row.afterCents, after.cash.afterCents)).toBe(after.totals.wealthAfterCents);
    for (const exposure of after.exposures) {
      const scaled = snapshot.marketSnapshot.exposures.filter(row => row[exposure.kind] === exposure.id)
        .reduce((sum, row) => sum + after.assets.find(asset => asset.ticker === row.ticker)!.afterCents * BigInt(row.weightBps), 0n);
      expect(exposure.value.numerator * 10000n).toBe(scaled * exposure.value.denominator);
      expect(exposure.weight.numerator * 10000n * after.totals.wealthAfterCents).toBe(scaled * exposure.weight.denominator);
    }
    expectAccounting(result);
  });

  it('preserva as origens do orçamento sem contar caixa liberado duas vezes no patrimônio', () => {
    const raw = buildScenario('S01');
    raw.portfolio.cashCents = '10000';
    raw.portfolio.releasedCashCents = '3000';
    raw.portfolio.reinvestmentCents = '2000';
    const result = allocateContribution(parseSimulationInput(raw).input);
    expect(result.budget).toEqual({ contributionCents: 50000n, releasedCashCents: 3000n,
      reinvestmentCents: 2000n, totalCents: 55000n });
    expect(result.portfolioBefore.totals.postContributionCents).toBe(104500n);
    expectAccounting(result);
  });

  it('reproduz a divisão manual de S01, unidades inteiras, saturação e sobras por classe', () => {
    const result = allocateContribution(input());
    expect(result.classAllocations).toEqual([
      expect.objectContaining({ id: 'stocks', deficitCents: 14740n, budgetCents: 14740n,
        spentCents: 6533n, unallocatedCents: 8207n }),
      expect.objectContaining({ id: 'fiis', deficitCents: 6680n, budgetCents: 6680n,
        spentCents: 0n, unallocatedCents: 6680n }),
      expect.objectContaining({ id: 'etfs', deficitCents: 23855n, budgetCents: 23855n,
        spentCents: 16008n, unallocatedCents: 7847n }),
    ]);
    expect(result.unassignedCents).toBe(4725n);
    expect(quantities(result)).toEqual({ ABEV3: 1, BBSE3: 1, IVVB11: 2 });
    expect(result).toMatchObject({ principalCents: 22500n, reserveCents: 41n, feesCents: 0n,
      reservedTotalCents: 22541n, unallocatedCents: 27459n });
    expectAccounting(result);
  });

  it('aplica o limite global às maiores parcelas preliminares e recalcula linhas agregadas em S02', () => {
    const result = allocateContribution(input('S02'));
    expect(quantities(result)).toEqual({ ABEV3: 2, BBSE3: 2, IVVB11: 5, KNCR11: 1, XPML11: 1 });
    expect(result).toMatchObject({ principalCents: 63000n, reserveCents: 136n, feesCents: 0n,
      reservedTotalCents: 63136n, unallocatedCents: 36864n });
    expectAccounting(result);
  });

  it.each(['S03', 'S04', 'S05'])('aceita todo o orçamento em caixa quando %s não tem lote viável', id => {
    const result = allocateContribution(input(id));
    expect(result.lines).toEqual([]);
    expect(result.unallocatedCents).toBe(result.budget.totalCents);
    expectAccounting(result);
  });

  it('não transfere a reserva de uma classe bloqueada nem aumenta posição acima do limite', () => {
    const blockedClass = allocateContribution(input('S14'));
    const fiis = blockedClass.classAllocations.find(row => row.id === 'fiis')!;
    expect(fiis.spentCents).toBe(0n);
    expect(fiis.unallocatedCents).toBe(fiis.budgetCents);
    expect(blockedClass.lines.some(line => line.classId === 'fiis')).toBe(false);
    expect(allocateContribution(input('S08')).lines.some(line => line.ticker === 'WEGE3')).toBe(false);
  });

  it('converte USD, cobra remessa uma vez, preserva o teto e nunca libera SCHD', () => {
    const snapshot = input('S12');
    const result = allocateContribution(snapshot);
    const usd = result.lines.find(line => line.ticker === 'SYNTHUSD');
    expect(usd).toBeDefined();
    expect(usd!.quantity).toBeGreaterThan(1);
    expect(usd!.priceCents).toBe(100n);
    expect(usd!.priceLimitCents).toBeGreaterThanOrEqual(usd!.priceCents);
    expect(result.lines.some(line => line.ticker === 'SCHD')).toBe(false);
    expect(result.feesCents).toBeGreaterThanOrEqual(snapshot.costs.remittanceCents);
    const variable = result.lines.reduce((sum, line) =>
      sum + (line.principalCents + line.reserveCents + 999n) / 1000n, 0n);
    const spread = result.lines.filter(line => line.currency === 'USD').reduce((sum, line) =>
      sum + ((line.principalCents + line.reserveCents) * 2n + 99n) / 100n, 0n);
    expect(result.feesCents).toBe(BigInt(result.lines.length) * 10n + variable + spread + 25n);
    expectAccounting(result);
  });

  it('limita coletivamente o débito condicional a 20% e não abre posição condicional', () => {
    const raw = buildScenario('S13');
    raw.aporteCents = '50000';
    raw.portfolio.cashCents = '1000000';
    const snapshot = parseSimulationInput(raw).input;
    const assessed = evaluateValuationAndEligibility(snapshot);
    const forced = only(assessed, ['WEGE3', 'SYNTHNEW']).map(row =>
      row.ticker === 'SYNTHNEW' ? { ...row, purchaseEligible: true, eligibilityState: 'conditional' as const,
        conditionalRestrictions: true } : row);
    const result = allocateContribution(snapshot, { assessments: forced });
    expect(result.conditionalDebitCents * 10000n).toBeLessThanOrEqual(result.budget.totalCents * 2000n);
    expect(result.lines.some(line => line.ticker === 'SYNTHNEW')).toBe(false);
    expect(quantities(result).WEGE3).toBe(1);
    expectAccounting(result);
  });

  it('desempata por identificador estável, independentemente da ordem das coleções', () => {
    const raw = buildScenario('S15');
    raw.policy.limits.maxPurchases = 1;
    const snapshot = parseSimulationInput(raw).input;
    const assessed = evaluateValuationAndEligibility(snapshot);
    const result = allocateContribution(snapshot, { assessments: only(assessed, ['WEGE3', 'SYNTH-TIE']) });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.ticker).toBe('SYNTH-TIE');
  });

  it.each(['1', '50000', '100000', '100000000'])('termina e mantém invariantes com orçamento de %s centavos', cents => {
    const raw = buildScenario('S01');
    raw.aporteCents = cents;
    const result = allocateContribution(parseSimulationInput(raw).input);
    expectAccounting(result);
    expect(result.lines.every(line => Number.isSafeInteger(line.quantity) && line.quantity > 0)).toBe(true);
    expect(result.portfolioAfter.assets.filter(row => result.lines.some(line => line.ticker === row.ticker))
      .every(row => !row.reasonCodes.includes('CURRENT_LIMIT_EXCEEDED') &&
        !row.reasonCodes.includes('CURRENT_EXPOSURE_LIMIT_EXCEEDED'))).toBe(true);
  });

  it('não muta o snapshot validado nem as avaliações fornecidas', () => {
    const snapshot = input();
    const assessments = evaluateValuationAndEligibility(snapshot);
    const serialized = JSON.stringify(assessments, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
    allocateContribution(snapshot, { assessments });
    expect(JSON.stringify(assessments, (_key, value) => typeof value === 'bigint' ? value.toString() : value)).toBe(serialized);
    expect(Object.isFrozen(snapshot.portfolio.positions)).toBe(true);
  });
});
