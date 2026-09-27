// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { createSha256DecisionId } from '../../backend/src/adapters/decision-id';
import { canonicalDecisionPayload, simulateContribution } from '../../backend/src/application/simulation';
import { parseSimulationInput } from '../../backend/src/domain/input';

const dependencies = { createDecisionId: createSha256DecisionId };

function validated(id = 'S01') {
  return parseSimulationInput(buildScenario(id));
}

describe('caso de uso de simulação explicável', () => {
  it('não compra ETF com Q=74,6 mesmo com execução válida', async () => {
    const raw = buildScenario('S01');
    for (const row of raw.qualitativeAssessments.filter(row => row.ticker === 'IVVB11')) row.score = 50;
    raw.marketSnapshot.metrics.find(row => row.ticker === 'IVVB11' && row.ruleId.endsWith('.trading-spread'))!.value = '0.4';
    const result = await simulateContribution(parseSimulationInput(raw), dependencies);
    expect(result.evaluations.find(row => row.ticker === 'IVVB11')).toMatchObject({
      qualityScore: { numerator: 373n, denominator: 5n }, executionStatus: 'validated', purchaseEligible: false,
    });
    expect(result.purchases.some(row => row.ticker === 'IVVB11')).toBe(false);
    expect(result.excludedAssets.find(row => row.ticker === 'IVVB11')?.reasonCodes).toContain('ETF_QUALITY_BELOW_75');
  });

  it.each(['stale-quote', 'valuation-currency', 'metric-unit'] as const)(
    'bloqueia compra com erro local %s e preserva compras válidas', async defect => {
      const raw = buildScenario('S01');
      const code = defect === 'stale-quote' ? 'STALE_DATA' :
        defect === 'valuation-currency' ? 'CURRENCY_MISMATCH' : 'METRIC_RULE_MISMATCH';
      if (defect === 'stale-quote') raw.marketSnapshot.quotes.find(row => row.ticker === 'ABEV3')!.asOf = '2020-01-01';
      if (defect === 'valuation-currency') raw.providedValuations.find(row => row.ticker === 'ABEV3')!.currency = 'USD';
      if (defect === 'metric-unit') {
        for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'ABEV3')) row.unit = 'days';
      }
      const parsed = parseSimulationInput(raw);
      expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'ABEV3', code }));
      const result = await simulateContribution(parsed, dependencies);
      expect(result.evaluations.find(row => row.ticker === 'ABEV3')).toMatchObject({ purchaseEligible: false });
      expect(result.purchases.some(row => row.ticker === 'ABEV3')).toBe(false);
      expect(result.excludedAssets.find(row => row.ticker === 'ABEV3')?.reasonCodes).toContain(code);
      expect(result.purchases.some(row => row.ticker === 'IVVB11')).toBe(true);
      expect(result.snapshots).toEqual([parsed.snapshot]);
    });

  it('exclui candidato USD sem FX quando não há posição USD existente', async () => {
    const raw = buildScenario('S12');
    for (const position of raw.portfolio.positions.filter(row => row.currency === 'USD')) position.quantity = 0;
    const parsed = parseSimulationInput({ ...raw, fx: null });
    expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'SYNTHUSD', code: 'MISSING_FX' }));
    const result = await simulateContribution(parsed, dependencies);
    expect(result.evaluations.find(row => row.ticker === 'SYNTHUSD')).toMatchObject({ purchaseEligible: false });
    expect(result.excludedAssets.find(row => row.ticker === 'SYNTHUSD')?.reasonCodes).toContain('MISSING_FX');
    expect(result.purchases.length).toBeGreaterThan(0);
    expect(result.purchases.every(row => row.currency === 'BRL')).toBe(true);
    expect(result.feesCents).toBe(result.purchases.reduce((sum, row) =>
      sum + 10n + (row.principal + row.reserve + 999n) / 1000n, 0n));
  });

  it('preserva a redução de cobertura permitida para rubrica não crítica ausente', async () => {
    const raw = buildScenario('S01');
    raw.qualitativeAssessments.find(row => row.ticker === 'ITUB4' && row.ruleId.endsWith('.predictability'))!.score = null;
    const result = await simulateContribution(parseSimulationInput(raw), dependencies);
    expect(result.evaluations.find(row => row.ticker === 'ITUB4')).toMatchObject({ purchaseEligible: true });
  });

  it('compõe uma proposta completa, marcada como simulação e com snapshot original', async () => {
    const parsed = validated();
    const result = await simulateContribution(parsed, dependencies);
    expect(result).toMatchObject({ schemaVersion: '1.0', simulation: true,
      decisionId: expect.stringMatching(/^sha256:[0-9a-f]{64}$/), principalCents: 22500n,
      reserveCents: 41n, feesCents: 0n, unallocatedCents: 27459n });
    expect(result.snapshots).toEqual([parsed.snapshot]);
    expect(result.purchases.map(row => [row.ticker, row.quantity])).toEqual([
      ['ABEV3', 1], ['BBSE3', 1], ['IVVB11', 2],
    ]);
    expect(Object.keys(result)).not.toContain('durationMs');
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.evaluations.find(row => row.ticker === 'SCHD')?.currency).toBe('USD');
  });

  it('gera a mesma identidade e decisão após reexecução e permutação das coleções', async () => {
    const permuted = buildScenario('S01');
    permuted.portfolio.positions.reverse();
    permuted.marketSnapshot.quotes.reverse();
    permuted.marketSnapshot.metrics.reverse();
    permuted.marketSnapshot.exposures.reverse();
    permuted.qualitativeAssessments.reverse();
    permuted.providedValuations.reverse();
    permuted.policy.rules.reverse();
    const [first, repeated, reordered] = await Promise.all([
      simulateContribution(validated(), dependencies),
      simulateContribution(validated(), dependencies),
      simulateContribution(parseSimulationInput(permuted), dependencies),
    ]);
    expect(repeated).toEqual(first);
    expect(reordered.decisionId).toBe(first.decisionId);
    expect(reordered.purchases).toEqual(first.purchases);
    expect(reordered.evaluations).toEqual(first.evaluations);
  });

  it('inclui entradas, política, custos e versões na identidade canônica', async () => {
    const base = validated();
    const changedAporte = buildScenario('S01'); changedAporte.aporteCents = '50001';
    const changedCost = buildScenario('S01'); changedCost.costs.fixedCents = '1';
    const ids = await Promise.all([base, parseSimulationInput(changedAporte), parseSimulationInput(changedCost)]
      .map(row => simulateContribution(row, dependencies).then(result => result.decisionId)));
    expect(new Set(ids).size).toBe(3);
    expect(canonicalDecisionPayload(base)).toContain('"engineVersion":"1.0"');
    expect(canonicalDecisionPayload(base)).toContain('"priceReserve":"0.005"');
  });

  it('não deixa índices de diagnóstico local tornarem a identidade dependente da ordem', async () => {
    const original = buildScenario('S01');
    original.marketSnapshot.metrics.find(row => row.ticker === 'ITUB4')!.unit = 'invalid';
    const reordered = buildScenario('S01');
    reordered.marketSnapshot.metrics.find(row => row.ticker === 'ITUB4')!.unit = 'invalid';
    reordered.marketSnapshot.metrics.reverse();
    reordered.qualitativeAssessments.reverse();
    const [base, permuted] = await Promise.all([
      simulateContribution(parseSimulationInput(original), dependencies),
      simulateContribution(parseSimulationInput(reordered), dependencies),
    ]);
    expect(permuted.decisionId).toBe(base.decisionId);
    expect(permuted.purchases).toEqual(base.purchases);
  });

  it('explica compras, quantidades limitadas e exclusões a partir das evidências', async () => {
    const result = await simulateContribution(validated(), dependencies);
    const purchase = result.purchases.find(row => row.ticker === 'IVVB11')!;
    expect(purchase.reasonCodes).toEqual(expect.arrayContaining([
      'PURCHASE_ELIGIBLE', 'PRIORITY_SELECTED', 'INTEGER_QUANTITY', 'COSTS_RESERVED',
    ]));
    expect(purchase.explanations.every(row => row.message.length > 0 && row.reviewTrigger.length > 0)).toBe(true);
    expect(result.excludedAssets.find(row => row.ticker === 'ITUB4')?.reasonCodes).toContain('UNIT_EXCEEDS_CAPACITY');
    expect(result.excludedAssets.find(row => row.ticker === 'SCHD')?.reasonCodes).toContain('UNSUPPORTED_PURCHASE_PROFILE');
    const etf = result.evaluations.find(row => row.ticker === 'IVVB11')!;
    expect(etf.purchaseEligible).toBe(true);
    expect(etf.evidence).toContainEqual(expect.objectContaining({
      reasonCode: 'UNDERLYING_VALUATION_NOT_ASSESSED', applicability: 'not-applicable',
    }));
    expect(result.allocationsBefore.some(row => row.kind === 'sector')).toBe(true);
    expect(result.allocationsAfter.some(row => row.kind === 'group')).toBe(true);
  });

  it('trata ausência local como resultado parcial e ausência global como erro sem proposta', async () => {
    const partial = await simulateContribution(validated('S06'), dependencies);
    expect(partial.evaluations.find(row => row.ticker === 'ITUB4')?.reasonCodes)
      .toContain('MISSING_CRITICAL_SOLVENCY_DATA');
    expect(partial.purchases.some(row => row.ticker !== 'ITUB4')).toBe(true);
    expect(() => validated('S07')).toThrow(expect.objectContaining({ code: 'MISSING_PRICE' }));
  });

  it('considera cálculo válido sem compras um sucesso explicado', async () => {
    const result = await simulateContribution(validated('S04'), dependencies);
    expect(result.purchases).toEqual([]);
    expect(result).toMatchObject({ principalCents: 0n, reserveCents: 0n, feesCents: 0n,
      unallocatedCents: 50000n });
    expect(result.excludedAssets.find(row => row.ticker === 'WEGE3')?.reasonCodes).toContain('PRICE_ABOVE_CEILING');
    expect(result.warnings).toContain('NO_PURCHASES');
  });

  it('não muta entrada/carteira e não escreve logs automaticamente', async () => {
    const parsed = validated();
    const snapshot = JSON.stringify(parsed.snapshot);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await simulateContribution(parsed, dependencies);
    expect(JSON.stringify(parsed.snapshot)).toBe(snapshot);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    log.mockRestore(); error.mockRestore();
  });

  it('mantém conteúdo HTML malicioso como dado textual no snapshot', async () => {
    const result = await simulateContribution(validated('S21'), dependencies);
    expect(JSON.stringify(result.snapshots)).toContain('<script>alert(\\"fictício\\")</script>');
  });
});
