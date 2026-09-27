// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { evaluateQuality } from '../../backend/src/domain/quality';
import { scoreToNumber } from '../../backend/src/domain/scoring';

function evaluate(id = 'S01') {
  const parsed = parseSimulationInput(buildScenario(id));
  return { parsed, evaluations: evaluateQuality(parsed.input) };
}

function asset(ticker: string, id = 'S01') {
  const result = evaluate(id).evaluations.find(row => row.ticker === ticker);
  expect(result).toBeDefined();
  return result!;
}

describe('qualidade por perfil', () => {
  it('expõe as âncoras efetivas que pontuam a observação, inclusive com regra configurada', () => {
    const raw = buildScenario('S01');
    const ruleId = 'consumer-staples.roic-spread';
    raw.policy.rules.find(row => row.id === ruleId)!.anchors = [0, 4, 8];
    for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'ABEV3' && row.ruleId === ruleId)) row.value = '4';
    const parsed = parseSimulationInput(raw);
    const result = evaluateQuality(parsed.input).find(row => row.ticker === 'ABEV3')!;
    const evidence = result.evidences.find(row => row.ruleId === ruleId)!;
    expect(evidence.observedValue).toBe('4');
    expect(evidence.score).toEqual({ numerator: 60n, denominator: 1n });
    expect(evidence.observations.every(row => row.score.numerator === 60n * row.score.denominator)).toBe(true);
    expect(evidence.anchors).toEqual([0, 4, 8]);
    expect(evidence.anchors).toEqual(parsed.input.policy.rules.find(row => row.id === ruleId)!.anchors);
  });

  it('compõe histórico/atual em 70/30 e risco pela pior nota', () => {
    const raw = buildScenario('S01');
    for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.roic-spread'))) {
      row.value = row.basis === 'historical' ? '0' : '3';
    }
    for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.net-debt-ebitda'))) {
      row.value = row.basis === 'historical' ? '1.5' : '4';
    }
    const input = parseSimulationInput(raw).input;
    const result = evaluateQuality(input).find(row => row.ticker === 'WEGE3')!;
    expect(scoreToNumber(result.evidences.find(row => row.ruleId.endsWith('.roic-spread'))!.score)).toBe(72);
    expect(scoreToNumber(result.evidences.find(row => row.ruleId.endsWith('.net-debt-ebitda'))!.score)).toBe(0);
  });

  it('calcula Q e blocos reconstruíveis para ações, FIIs, banco e ETF', () => {
    for (const ticker of ['ITUB4', 'WEGE3', 'ABEV3', 'HGLG11', 'KNCR11', 'XPML11', 'IVVB11']) {
      const result = asset(ticker);
      expect(scoreToNumber(result.qualityScore!)).toBe(100);
      expect(scoreToNumber(result.confidenceScore)).toBe(100);
      expect(result.coverageBps).toBe(10000);
      expect(result.sufficientForPurchase).toBe(true);
      expect(Object.values(result.blockScores).every(score => scoreToNumber(score) === 100)).toBe(true);
      expect(result.evidences.length).toBeGreaterThan(0);
    }
  });

  it('mantém zero como observação pontuável e ausência como neutro sem removê-la do denominador', () => {
    const raw = buildScenario('S01');
    for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.cash-conversion'))) row.value = '0';
    for (const row of raw.marketSnapshot.metrics.filter(row => row.ticker === 'WEGE3' && row.ruleId.endsWith('.interest-cover'))) row.value = null;
    const parsed = parseSimulationInput(raw);
    const result = evaluateQuality(parsed.input).find(row => row.ticker === 'WEGE3')!;
    const zero = result.evidences.find(row => row.ruleId.endsWith('.cash-conversion'))!;
    const missing = result.evidences.find(row => row.ruleId.endsWith('.interest-cover'))!;
    expect(zero.observedValue).toBe('0');
    expect(scoreToNumber(zero.score)).toBe(0);
    expect(zero.coverage).toBe(true);
    expect(missing.observedValue).toBeNull();
    expect(scoreToNumber(missing.score)).toBe(50);
    expect(missing.coverage).toBe(false);
    expect(result.coverageBps).toBe(9000);
    expect(result.reasonCodes).toContain('MISSING_CRITICAL_SOLVENCY_DATA');
    expect(result.sufficientForPurchase).toBe(false);
  });

  it('rubrica ausente reduz cobertura e preserva evidência em vez de fabricar avaliação', () => {
    const raw = buildScenario('S01');
    raw.qualitativeAssessments.find(row => row.ticker === 'ITUB4' && row.ruleId.endsWith('.predictability'))!.score = null;
    const result = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'ITUB4')!;
    const evidence = result.evidences.find(row => row.ruleId.endsWith('.predictability'))!;
    expect(evidence.score).toEqual({ numerator: 50n, denominator: 1n });
    expect(evidence.source).toBeNull();
    expect(evidence.reasonCode).toBe('MISSING_APPLICABLE_EVIDENCE');
    expect(result.coverageBps).toBe(9375);
    expect(scoreToNumber(result.confidenceScore)).toBe(94.6875);
    expect(result.sufficientForPurchase).toBe(true);
  });

  it('cobertura abaixo de 80% e dados vencidos impedem aprovação só do ativo afetado', () => {
    const raw = buildScenario('S01');
    for (const row of raw.qualitativeAssessments.filter(row => row.ticker === 'ITUB4')) row.score = null;
    const parsed = parseSimulationInput(raw);
    const results = evaluateQuality(parsed.input);
    const bank = results.find(row => row.ticker === 'ITUB4')!;
    expect(bank.coverageBps).toBe(5500);
    expect(bank.reasonCodes).toEqual(expect.arrayContaining(['INSUFFICIENT_COVERAGE', 'INSUFFICIENT_CONFIDENCE']));
    expect(bank.sufficientForPurchase).toBe(false);
    expect(results.find(row => row.ticker === 'WEGE3')!.sufficientForPurchase).toBe(true);

    const stale = asset('ITUB4', 'S11');
    expect(scoreToNumber(stale.confidenceScore)).toBe(86.25);
    expect(stale.reasonCodes).toContain('STALE_QUALITY_DATA');
    expect(stale.sufficientForPurchase).toBe(false);
  });

  it('agrega Q das investidas da holding por valor e combina 80% look-through com 20% próprio', () => {
    const raw = buildScenario('S01');
    const investee = raw.holdingDetails[0]!.investees[0]!;
    for (const row of investee.qualitativeAssessments.filter(row =>
      ['predictability', 'competitive-advantage', 'governance', 'capital-allocation'].some(id => row.ruleId.endsWith(`.${id}`)))) row.score = 0;
    const result = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'BBSE3')!;
    // Banco sintético: negócio 0 (25%) e demais blocos 100 => Q 75; holding = 80%*75 + 20%*100.
    expect(scoreToNumber(result.qualityScore!)).toBe(80);
    expect(result.blockScores).toHaveProperty('look-through');
    expect(result.evidences.some(row => row.ruleId.startsWith('SYNTH-BANK-INVESTEE/'))).toBe(true);
  });

  it('bloqueia cobertura econômica insuficiente da holding e mantém perfil sem suporte explícito', () => {
    const raw = buildScenario('S01');
    raw.holdingDetails[0]!.investees[0]!.valueCents = '70000';
    const holding = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'BBSE3')!;
    expect(holding.coverageBps).toBeLessThan(8000);
    expect(holding.reasonCodes).toContain('INSUFFICIENT_HOLDING_COVERAGE');
    expect(holding.sufficientForPurchase).toBe(false);

    const unsupported = asset('SCHD');
    expect(unsupported.qualityScore).toBeNull();
    expect(unsupported.reasonCodes).toContain('UNSUPPORTED_PURCHASE_PROFILE');
    expect(unsupported.sufficientForPurchase).toBe(false);
  });

  it('trata investida identificada com valor zero como cobertura econômica ausente', () => {
    const raw = buildScenario('S01');
    raw.holdingDetails[0]!.investees[0]!.valueCents = '0';
    const result = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'BBSE3')!;
    expect(result.coverageBps).toBe(2000);
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['INSUFFICIENT_HOLDING_COVERAGE', 'INSUFFICIENT_COVERAGE']));
    expect(result.sufficientForPurchase).toBe(false);
  });

  it('limita histórico curto a observação e reproduz o Q=72 independente de S13', () => {
    const raw = buildScenario('S01');
    const history = raw.marketSnapshot.metrics.find(row => row.ticker === 'WEGE3' &&
      row.ruleId.endsWith('.roic-spread') && row.basis === 'historical')!;
    history.sampleCount = 2;
    const short = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'WEGE3')!;
    expect(short.evidences.find(row => row.ruleId.endsWith('.roic-spread'))).toEqual(expect.objectContaining({
      score: { numerator: 50n, denominator: 1n }, coverage: false, reasonCode: 'INSUFFICIENT_HISTORY',
    }));
    expect(short.sufficientForPurchase).toBe(false);

    const conditional = asset('WEGE3', 'S13');
    expect(scoreToNumber(conditional.qualityScore!)).toBe(72);
  });

  it('marca observações atuais ambíguas como conflito sem depender da ordem', () => {
    const raw = buildScenario('S01');
    const current = raw.marketSnapshot.metrics.find(row => row.ticker === 'WEGE3' &&
      row.ruleId.endsWith('.cash-conversion') && row.basis === 'current')!;
    const conflicting = { ...current, value: '0', period: { start: '2025-06-01', end: '2026-05-31' }, publishedOn: '2026-08-09' };
    raw.marketSnapshot.metrics.push(conflicting);
    const first = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'WEGE3')!;
    raw.marketSnapshot.metrics.reverse();
    const second = evaluateQuality(parseSimulationInput(raw).input).find(row => row.ticker === 'WEGE3')!;
    const evidence = first.evidences.find(row => row.ruleId.endsWith('.cash-conversion'))!;
    expect(evidence.consistent).toBe(false);
    expect(evidence.reasonCode).toBe('UNRESOLVED_CONFLICT');
    expect(first.sufficientForPurchase).toBe(false);
    expect(second).toEqual(first);
  });
});
