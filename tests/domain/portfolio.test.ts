// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { InputError } from '../../backend/src/domain/errors';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { analyzePortfolio } from '../../backend/src/domain/portfolio';

function input(id = 'S01') {
  return parseSimulationInput(buildScenario(id)).input;
}

function asset(result: ReturnType<typeof analyzePortfolio>, ticker: string) {
  const row = result.assets.find(item => item.ticker === ticker);
  expect(row).toBeDefined();
  return row!;
}

describe('pesos, déficits e capacidade', () => {
  it('valora as nove posições por preço e FX sem presumir pesos iguais', () => {
    const result = analyzePortfolio(input());
    expect(result.totals).toMatchObject({
      positionsBeforeCents: 44500n, cashBeforeCents: 0n, wealthBeforeCents: 44500n,
      postContributionCents: 94500n, wealthAfterCents: 94500n, cashAfterCents: 50000n,
    });
    expect(asset(result, 'ITUB4')).toMatchObject({ currentCents: 4000n,
      weightBefore: { numerator: 8n, denominator: 89n } });
    expect(asset(result, 'WEGE3').weightBefore).toEqual({ numerator: 10n, denominator: 89n });
    expect(asset(result, 'SCHD')).toMatchObject({ currentCents: 5000n,
      weightBefore: { numerator: 10n, denominator: 89n } });
  });

  it('calcula metas e déficits monetários independentes por classe e ativo', () => {
    const result = analyzePortfolio(input());
    expect(result.classes).toEqual([
      expect.objectContaining({ id: 'stocks', beforeCents: 15500n, targetCents: 30240n, deficitCents: 14740n }),
      expect.objectContaining({ id: 'fiis', beforeCents: 16000n, targetCents: 22680n, deficitCents: 6680n }),
      expect.objectContaining({ id: 'etfs', beforeCents: 13000n, targetCents: 36855n, deficitCents: 23855n }),
    ]);
    expect(asset(result, 'ITUB4')).toMatchObject({ targetCents: 7560n, deficitCents: 3560n, capacityCents: 3560n });
    expect(asset(result, 'IVVB11')).toMatchObject({ targetCents: 32130n, deficitCents: 24130n, capacityCents: 24130n });
    expect(asset(result, 'SCHD')).toMatchObject({ targetCents: 4725n, deficitCents: 0n, capacityCents: 0n,
      reasonCodes: expect.arrayContaining(['NO_DEFICIT']) });
    expect(result.cash.targetCents).toBe(4725n);
  });

  it('não conta caixa liberado e reinvestimento duas vezes no patrimônio', () => {
    const raw = buildScenario('S01');
    raw.portfolio.cashCents = '10000'; raw.portfolio.releasedCashCents = '3000'; raw.portfolio.reinvestmentCents = '2000';
    const result = analyzePortfolio(parseSimulationInput(raw).input);
    expect(result.budget).toEqual({ contributionCents: 50000n, releasedCashCents: 3000n,
      reinvestmentCents: 2000n, totalCents: 55000n });
    expect(result.totals.wealthBeforeCents).toBe(54500n);
    expect(result.totals.postContributionCents).toBe(104500n);
  });

  it('inclui exposição indireta de ETFs sem duplicar patrimônio', () => {
    const result = analyzePortfolio(input());
    expect(result.exposures).toContainEqual(expect.objectContaining({ kind: 'sector', id: 'finance',
      value: { numerator: 10100n, denominator: 1n }, limitBps: 2500, exceeded: false }));
    expect(result.exposures).toContainEqual(expect.objectContaining({ kind: 'sector', id: 'real-estate',
      value: { numerator: 16000n, denominator: 1n } }));
    expect(result.exposures.filter(row => row.kind === 'group' && row.id === 'SYNTH-ETF-ISSUER-0')).toContainEqual(
      expect.objectContaining({ value: { numerator: 2600n, denominator: 1n } }));
    expect(result.totals.positionsBeforeCents).toBe(44500n);
  });

  it('reduz capacidade direta quando compra de ETF consome o mesmo limite setorial', () => {
    const result = analyzePortfolio(input(), { purchases: [{ ticker: 'IVVB11', valueCents: 50000n }] });
    expect(result.exposures).toContainEqual(expect.objectContaining({ kind: 'sector', id: 'finance',
      value: { numerator: 20100n, denominator: 1n } }));
    expect(asset(result, 'ITUB4')).toMatchObject({ deficitCents: 3560n, limitCapacityCents: 3525n, capacityCents: 3525n });
  });

  it('bloqueia aumento de posição já acima do limite sem sugerir venda ou invalidar as demais', () => {
    const result = analyzePortfolio(input('S08'));
    expect(asset(result, 'WEGE3')).toMatchObject({ deficitCents: 0n, capacityCents: 0n,
      reasonCodes: expect.arrayContaining(['CURRENT_LIMIT_EXCEEDED', 'NO_DEFICIT']) });
    expect(asset(result, 'ITUB4').capacityCents).toBeGreaterThan(0n);
    expect(result.totals.positionsBeforeCents).toBe(139500n);
  });

  it('desconta custos do denominador pós-compra e preserva a soma exata', () => {
    const result = analyzePortfolio(input(), { purchases: [{ ticker: 'ITUB4', valueCents: 1000n }], estimatedCostsCents: 100n });
    expect(result.totals).toMatchObject({ purchasesCents: 1000n, estimatedCostsCents: 100n,
      wealthAfterCents: 94400n, cashAfterCents: 48900n });
    expect(asset(result, 'ITUB4')).toMatchObject({ afterCents: 5000n,
      weightAfter: { numerator: 25n, denominator: 472n } });
    expect(result.assets.reduce((sum, row) => sum + row.afterCents, 0n) + result.cash.afterCents).toBe(94400n);
    const withoutCost = analyzePortfolio(input());
    expect(asset(result, 'ITUB4').limitCapacityCents).toBeLessThan(asset(withoutCost, 'ITUB4').limitCapacityCents);
  });

  it('torna capacidade não verificável conservadoramente quando falta look-through', () => {
    const raw = buildScenario('S01');
    raw.marketSnapshot.exposures = raw.marketSnapshot.exposures.filter(row =>
      !(row.ticker === 'IVVB11' && row.sector === 'technology'));
    const parsed = parseSimulationInput(raw);
    expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'IVVB11', code: 'UNKNOWN_EXPOSURE' }));
    const result = analyzePortfolio(parsed.input);
    expect(asset(result, 'IVVB11')).toMatchObject({ exposureVerified: false, capacityCents: 0n,
      reasonCodes: expect.arrayContaining(['UNKNOWN_EXPOSURE']) });
  });

  it('rejeita ajustes fora do orçamento e não muta o snapshot congelado', () => {
    const snapshot = input();
    const positions = snapshot.portfolio.positions;
    const quantities = positions.map(row => row.quantity);
    expect(() => analyzePortfolio(snapshot, { purchases: [{ ticker: 'ITUB4', valueCents: 50001n }] })).toThrow(InputError);
    expect(() => analyzePortfolio(snapshot, { purchases: [{ ticker: 'UNKNOWN', valueCents: 1n }] })).toThrow(InputError);
    const result = analyzePortfolio(snapshot);
    expect(snapshot.portfolio.positions).toBe(positions);
    expect(snapshot.portfolio.positions.map(row => row.quantity)).toEqual(quantities);
    expect(Object.isFrozen(snapshot.portfolio.positions)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
