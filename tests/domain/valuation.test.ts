// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { evaluateQuality } from '../../backend/src/domain/quality';
import { scoreToNumber, type ExactScore } from '../../backend/src/domain/scoring';
import { calculateSafetyMargin, evaluateValuationAndEligibility } from '../../backend/src/domain/valuation';

const exact = (value: number): ExactScore => ({ numerator: BigInt(value), denominator: 1n });

function evaluate(id = 'S01') {
  const input = parseSimulationInput(buildScenario(id)).input;
  return evaluateValuationAndEligibility(input, evaluateQuality(input));
}

function asset(ticker: string, id = 'S01') {
  const result = evaluate(id).find(row => row.ticker === ticker);
  expect(result).toBeDefined();
  return result!;
}

describe('valuation, teto e elegibilidade', () => {
  it.each([
    [7499, false], [7500, true], [7501, true],
  ] as const)('exige Q >= 75 para ETF amplo na fronteira %s/100, inclusive com histerese', (q, eligible) => {
    for (const previousEligibility of [[], [{ ticker: 'IVVB11', state: 'full', policyVersion: '1.0' }]]) {
      const input = parseSimulationInput({ ...buildScenario('S01'), previousEligibility }).input;
      const quality = evaluateQuality(input).map(row => row.ticker === 'IVVB11' ?
        { ...row, qualityScore: { numerator: BigInt(q), denominator: 100n } } : row);
      const result = evaluateValuationAndEligibility(input, quality).find(row => row.ticker === 'IVVB11')!;
      expect(result.executionStatus).toBe('validated');
      expect(result.purchaseEligible).toBe(eligible);
      if (!eligible) {
        expect(result.eligibilityState).toBe('hold');
        expect(result.reasonCodes).toContain('ETF_QUALITY_BELOW_75');
      }
    }
  });

  it('calcula F, M, V, margem e teto em centavos sem usar o cenário favorável', () => {
    const result = asset('ITUB4');
    expect(scoreToNumber(result.fundamentalScore!)).toBe(100);
    expect(scoreToNumber(result.multipleScore!)).toBe(95);
    expect(scoreToNumber(result.priceScore!)).toBe(98.75);
    expect(result.safetyMarginBps).toBe(1000);
    expect(result.priceLimitCents).toBe(5600n);
    expect(result.priceLabel).toBe('attractive');
    expect(result.eligibilityState).toBe('full');
    expect(result.purchaseEligible).toBe(true);
  });

  it('pontua desconto contínuo e mantém preço acima do teto fora da compra sem alterar Q', () => {
    const raw = buildScenario('S01');
    raw.marketSnapshot.quotes.find(row => row.ticker === 'WEGE3')!.priceCents = '9000';
    const input = parseSimulationInput(raw).input;
    const quality = evaluateQuality(input);
    const before = quality.find(row => row.ticker === 'WEGE3')!.qualityScore;
    const result = evaluateValuationAndEligibility(input, quality).find(row => row.ticker === 'WEGE3')!;
    expect(scoreToNumber(result.fundamentalScore!)).toBe(76);
    expect(scoreToNumber(result.priceScore!)).toBe(82);
    expect(result.priceLimitCents).toBe(7000n);
    expect(result.priceLabel).toBe('reasonable');
    expect(result.eligibilityState).toBe('hold');
    expect(result.purchaseEligible).toBe(false);
    expect(result.qualityScore).toEqual(before);
    expect(result.reasonCodes).toContain('PRICE_ABOVE_CEILING');
    expect(result.evidences.find(row => row.ruleId === 'fundamental-discount')?.observedValue).toBe('1/10');
  });

  it.each([
    [85, 90, {}, 1000], [85, 89, {}, 1500], [75, 80, {}, 1500], [74, 100, {}, 2500],
    [65, 80, {}, 2500], [64, 100, {}, null], [90, 95, { materialUncertainty: true }, 1500],
    [90, 95, { cyclical: true }, 2500], [70, 90, { cyclical: true, materialUncertainty: true }, 3000],
  ])('aplica margem no limite Q=%s C=%s', (quality, confidence, options, expected) => {
    expect(calculateSafetyMargin(exact(quality), exact(confidence), options)).toBe(expected);
  });

  it('não transforma P/L inválido por lucro negativo em preço barato', () => {
    const result = asset('WEGE3', 'S10');
    const pe = result.evidences.find(row => row.ruleId === 'industrial.pe')!;
    expect(pe.applicability).toBe('not-applicable');
    expect(pe.score).toBeNull();
    expect(pe.reasonCode).toBe('NON_POSITIVE_NORMALIZED_PROFIT');
    expect(result.multipleScore).toEqual({ numerator: 100n, denominator: 1n });
  });

  it('trata ETF amplo como estratégico, com subjacente não avaliado e execução separada', () => {
    const valid = asset('IVVB11');
    expect(valid.valuationStatus).toBe('not-assessed');
    expect(valid.valuationLabel).toBe('não avaliado');
    expect(valid.priceScore).toBeNull();
    expect(valid.executionStatus).toBe('validated');
    expect(valid.priceLimitCents).not.toBeNull();
    expect(valid.purchaseEligible).toBe(true);
    expect(valid.reasonCodes).toContain('UNDERLYING_VALUATION_NOT_ASSESSED');
    expect(valid.evidences.map(row => row.reasonCode)).toEqual(expect.arrayContaining([
      'ETF_EXECUTION_EVIDENCE', 'UNDERLYING_VALUATION_NOT_ASSESSED',
    ]));

    const review = asset('IVVB11', 'S04');
    expect(review.executionStatus).toBe('review');
    expect(review.purchaseEligible).toBe(false);
    expect(review.reasonCodes).toContain('ETF_EXECUTION_REVIEW');
  });

  it('aplica bloqueios antes da classificação e isola dados críticos ausentes', () => {
    const blocked = evaluate('S05');
    expect(blocked.filter(row => row.profileId !== 'etf-dividend').every(row => !row.purchaseEligible)).toBe(true);
    expect(blocked.find(row => row.ticker === 'WEGE3')!.reasonCodes).toContain('UNRESOLVED_CONTINUITY_RISK');

    const missing = evaluate('S06');
    expect(missing.find(row => row.ticker === 'ITUB4')!.reasonCodes).toContain('MISSING_CRITICAL_SOLVENCY_DATA');
    expect(missing.find(row => row.ticker === 'ITUB4')!.purchaseEligible).toBe(false);
    expect(missing.find(row => row.ticker === 'WEGE3')!.purchaseEligible).toBe(true);
  });

  it('mantém SCHD valorável, mas bloqueia compra pelo perfil sem suporte', () => {
    const result = asset('SCHD');
    expect(result.reasonCodes).toContain('UNSUPPORTED_PURCHASE_PROFILE');
    expect(result.purchaseEligible).toBe(false);
    expect(result.valuationStatus).toBe('not-assessed');
    expect(result.priceLimitCents).toBeNull();
  });

  it('torna valuation ausente, vencido ou incoerente inconclusivo somente para o ativo', () => {
    const raw = buildScenario('S01');
    const valuation = raw.providedValuations.find(row => row.ticker === 'ITUB4')!;
    valuation.baseCents = '0';
    const parsed = parseSimulationInput(raw);
    expect(parsed.issues).toContainEqual(expect.objectContaining({ ticker: 'ITUB4', code: 'INVALID_VALUATION' }));
    const results = evaluateValuationAndEligibility(parsed.input, evaluateQuality(parsed.input));
    expect(results.find(row => row.ticker === 'ITUB4')).toEqual(expect.objectContaining({
      valuationStatus: 'inconclusive', purchaseEligible: false,
    }));
    expect(results.find(row => row.ticker === 'WEGE3')!.purchaseEligible).toBe(true);

    const incoherentRaw = buildScenario('S01');
    const incoherent = incoherentRaw.providedValuations.find(row => row.ticker === 'ITUB4')!;
    incoherent.conservativeCents = (BigInt(incoherent.baseCents) + 1n).toString();
    expect(parseSimulationInput(incoherentRaw).issues).toContainEqual(expect.objectContaining({
      ticker: 'ITUB4', code: 'INVALID_VALUATION',
    }));

    const staleRaw = buildScenario('S01');
    staleRaw.providedValuations.find(row => row.ticker === 'WEGE3')!.publishedOn = '2026-08-14';
    const staleInput = parseSimulationInput(staleRaw).input;
    const stale = evaluateValuationAndEligibility(staleInput).find(row => row.ticker === 'WEGE3')!;
    expect(stale.valuationStatus).toBe('inconclusive');
    expect(stale.reasonCodes).toContain('STALE_VALUATION');
    expect(stale.evidences).toContainEqual(expect.objectContaining({
      ruleId: 'fundamental-discount', applicability: 'stale', reasonCode: 'STALE_VALUATION',
    }));
  });

  it('alta participação terminal impede elegibilidade plena', () => {
    const raw = buildScenario('S01');
    const terminal = raw.marketSnapshot.metrics.find(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.terminal-share'))!;
    terminal.value = '71';
    const input = parseSimulationInput(raw).input;
    const result = evaluateValuationAndEligibility(input).find(row => row.ticker === 'WEGE3')!;
    expect(result.eligibilityState).toBe('conditional');
    expect(result.conditionalRestrictions).toBe(true);
    expect(result.reasonCodes).toContain('HIGH_TERMINAL_SENSITIVITY');
  });

  it('aplica exatamente Q=65/75 e C=80, bloqueando condicional em posição nova', () => {
    const raw = buildScenario('S01');
    const input = parseSimulationInput(raw).input;
    const quality = evaluateQuality(input);
    const base = quality.find(row => row.ticker === 'WEGE3')!;
    const assess = (q: ExactScore, c: ExactScore, quantity = 1) => {
      const changedInput = quantity === 1 ? input : { ...input, portfolio: { ...input.portfolio,
        positions: input.portfolio.positions.map(row => row.ticker === 'WEGE3' ? { ...row, quantity } : row) } };
      return evaluateValuationAndEligibility(changedInput as typeof input,
        quality.map(row => row.ticker === 'WEGE3' ? { ...base, qualityScore: q, confidenceScore: c } : row))
        .find(row => row.ticker === 'WEGE3')!;
    };
    expect(assess(exact(75), exact(80)).eligibilityState).toBe('full');
    expect(assess({ numerator: 7499n, denominator: 100n }, exact(100)).eligibilityState).toBe('conditional');
    expect(assess(exact(65), exact(80)).purchaseEligible).toBe(true);
    expect(assess({ numerator: 6499n, denominator: 100n }, exact(100)).eligibilityState).toBe('hold');
    expect(assess(exact(75), { numerator: 7999n, denominator: 100n }).eligibilityState).toBe('watch');
    const newPosition = assess(exact(65), exact(80), 0);
    expect(newPosition.eligibilityState).toBe('watch');
    expect(newPosition.reasonCodes).toContain('CONDITIONAL_NEW_POSITION');
  });

  it('só aplica histerese quando estado anterior e versão compatível estão no snapshot', () => {
    const raw = buildScenario('S13');
    const withHistory = parseSimulationInput({ ...raw, previousEligibility: [
      { ticker: 'WEGE3', state: 'full', policyVersion: '1.0' },
    ] }).input;
    const retained = evaluateValuationAndEligibility(withHistory).find(row => row.ticker === 'WEGE3')!;
    expect(retained.eligibilityState).toBe('full');
    expect(retained.conditionalRestrictions).toBe(true);
    expect(retained.reasonCodes).toContain('FULL_STATE_RETAINED_BY_HYSTERESIS');

    const mismatched = parseSimulationInput({ ...raw, previousEligibility: [
      { ticker: 'WEGE3', state: 'full', policyVersion: '0.9' },
    ] }).input;
    const ignored = evaluateValuationAndEligibility(mismatched).find(row => row.ticker === 'WEGE3')!;
    expect(ignored.eligibilityState).toBe('conditional');
    expect(ignored.reasonCodes).toContain('PREVIOUS_STATE_VERSION_MISMATCH');
  });

  it('preserva observação/revisão diante de preço ruim quando existe bloqueio precedente', () => {
    const raw = buildScenario('S05');
    raw.marketSnapshot.quotes.find(row => row.ticker === 'WEGE3')!.priceCents = '20000';
    const input = parseSimulationInput(raw).input;
    const result = evaluateValuationAndEligibility(input).find(row => row.ticker === 'WEGE3')!;
    expect(result.priceLabel).toBe('expensive');
    expect(result.eligibilityState).toBe('watch');
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['UNRESOLVED_CONTINUITY_RISK', 'PRICE_ABOVE_CEILING']));
  });

  it('aplica incerteza material ao teto e aceita preço exatamente no limite conservador', () => {
    const raw = buildScenario('S01');
    const valuation = raw.providedValuations.find(row => row.ticker === 'WEGE3')!;
    valuation.conservativeCents = '9500';
    raw.marketSnapshot.quotes.find(row => row.ticker === 'WEGE3')!.priceCents = '8500';
    raw.marketSnapshot.metrics.find(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.material-uncertainty'))!.value = '1';
    const input = parseSimulationInput(raw).input;
    const result = evaluateValuationAndEligibility(input).find(row => row.ticker === 'WEGE3')!;
    expect(result.safetyMarginBps).toBe(1500);
    expect(result.priceLimitCents).toBe(8500n);
    expect(result.priceLabel).toBe('attractive');
    expect(result.purchaseEligible).toBe(true);
  });

  it('considera valuation válido exatamente em 30 dias e vencido após a fronteira', () => {
    const validRaw = buildScenario('S01');
    validRaw.providedValuations.find(row => row.ticker === 'WEGE3')!.publishedOn = '2026-08-15';
    const validInput = parseSimulationInput(validRaw).input;
    expect(evaluateValuationAndEligibility(validInput).find(row => row.ticker === 'WEGE3')!.valuationStatus).toBe('assessed');

    const staleRaw = buildScenario('S01');
    staleRaw.providedValuations.find(row => row.ticker === 'WEGE3')!.publishedOn = '2026-08-14';
    const staleInput = parseSimulationInput(staleRaw).input;
    expect(evaluateValuationAndEligibility(staleInput).find(row => row.ticker === 'WEGE3')!.reasonCodes).toContain('STALE_VALUATION');
  });
});
