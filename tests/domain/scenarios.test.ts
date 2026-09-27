// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../backend/fixtures/scenarios';
import { boundaryCases, scenarioExpectations } from '../../backend/fixtures/expectations';
import { decimalRatio, marketValue } from '../../backend/src/domain/money';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { readFixtureJson, serializeInput } from '../../backend/src/adapters/fixture-json';

describe('builders S01–S24', () => {
  it('registra janelas econômicas de renda, crescimento e aderência conforme as fórmulas', () => {
    const raw = buildScenario('S01');
    expect(raw.marketSnapshot.metrics.find(m => m.ticker === 'HGLG11' && m.ruleId.endsWith('.distribution-cover'))?.period).toEqual({ start: '2024-07-01', end: '2026-06-30' });
    expect(raw.marketSnapshot.metrics.find(m => m.ticker === 'HGLG11' && m.ruleId.endsWith('.real-revenue-growth'))?.period).toEqual({ start: '2023-07-01', end: '2026-06-30' });
    expect(raw.marketSnapshot.metrics.find(m => m.ticker === 'IVVB11' && m.ruleId.endsWith('.tracking-error'))?.period).toEqual({ start: '2023-07-01', end: '2026-06-30' });
  });
  it('aplica validade de 120 dias à documentação qualitativa de ETF', () => {
    const raw = buildScenario('S01');
    const rubric = raw.qualitativeAssessments.find(q => q.ticker === 'IVVB11')!;
    rubric.period.end = '2026-03-31'; rubric.publishedOn = '2026-05-17';
    expect(parseSimulationInput(raw).issues).toEqual([]);
    rubric.publishedOn = '2026-05-16';
    expect(parseSimulationInput(raw).issues).toContainEqual(expect.objectContaining({ ticker: 'IVVB11', code: 'STALE_DATA' }));
  });
  it('rejeita duplicidade de evidência de investida mesmo quando a segunda unidade é inválida', () => {
    const raw = buildScenario('S01');
    const investee = raw.holdingDetails[0]!.investees[0]!;
    investee.metrics.push({ ...investee.metrics[0]!, unit: 'invalid' });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'DUPLICATE' }));
  });
  it('aponta ausência, unidade incompatível e cobertura incompleta da holding', () => {
    const raw = buildScenario('S01');
    const investee = raw.holdingDetails[0]!.investees[0]!;
    investee.valueCents = '70000';
    investee.metrics[0]!.value = null;
    investee.metrics[1]!.unit = 'USD';
    expect(parseSimulationInput(raw).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ ticker: 'BBSE3', code: 'MISSING_DATA' }),
      expect.objectContaining({ ticker: 'BBSE3', code: 'METRIC_PROFILE_MISMATCH' }),
      expect.objectContaining({ ticker: 'BBSE3', code: 'INSUFFICIENT_HOLDING_COVERAGE' }),
    ]));
  });
  it('não fornece EBITDA industrial a banco ou holding e mantém lucro/múltiplo coerentes', () => {
    const raw = buildScenario('S01');
    expect(raw.marketSnapshot.metrics.some(m => ['ITUB4', 'BBSE3'].includes(m.ticker) && m.ruleId.endsWith('.ebitda'))).toBe(false);
    expect(raw.marketSnapshot.metrics.find(m => m.ticker === 'ITUB4' && m.ruleId.endsWith('.normalized-profit'))?.value).toBe('5');
    expect(raw.marketSnapshot.metrics.find(m => m.ticker === 'ITUB4' && m.ruleId.endsWith('.pe'))?.value).toBe('8');
  });
  it('tem oráculos independentes para os 24 cenários e falhas de fronteira', () => {
    expect(scenarioExpectations.map(s => s.id)).toEqual(Array.from({ length: 24 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`));
    expect(() => readFixtureJson(boundaryCases.malformedJson)).toThrow(expect.objectContaining({ code: 'INVALID_JSON' }));
    expect(() => readFixtureJson(boundaryCases.oversizedJson)).toThrow(expect.objectContaining({ code: 'PAYLOAD_LIMIT' }));
    const parsed = parseSimulationInput(buildScenario('S01')).input;
    const total = parsed.portfolio.positions.reduce((sum, p) => sum + marketValue(
      parsed.marketSnapshot.quotes.find(q => q.ticker === p.ticker)!.priceCents, p.quantity, decimalRatio(p.currency === 'USD' ? parsed.fx!.rate : '1')), 0n);
    expect(total).toBe(44500n);
  });
  it('as alterações de preço não recalculam os cenários de valuation fornecidos', () => {
    const raw = buildScenario('S01');
    const before = JSON.stringify(raw.providedValuations);
    raw.marketSnapshot.quotes[0]!.priceCents = '1';
    expect(JSON.stringify(raw.providedValuations)).toBe(before);
  });
  it('fornece nove posições de uma unidade, oito perfis e valores fictícios', () => {
    const raw = buildScenario('S01');
    expect(raw.portfolio.positions.map(p => p.ticker)).toEqual(['ITUB4', 'BBSE3', 'WEGE3', 'ABEV3', 'HGLG11', 'KNCR11', 'XPML11', 'IVVB11', 'SCHD']);
    expect(raw.portfolio.positions.every(p => p.quantity === 1)).toBe(true);
    expect(raw.analysisAsOf).toBe('2026-09-14');
    expect(raw.costs).toEqual({ fixedCents: '0', variableRate: '0', fxSpread: '0', remittanceCents: '0' });
    const parsed = parseSimulationInput(raw);
    expect(parsed.issues).toEqual([]);
    expect(readFixtureJson(serializeInput(parsed.input)).input).toEqual(parsed.input);
  });
  it.each(Array.from({ length: 24 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`))('%s é determinístico e isolado', id => {
    const a = buildScenario(id); const b = buildScenario(id);
    expect(a).toEqual(b);
    a.portfolio.positions[0]!.quantity = 999;
    expect(buildScenario(id)).toEqual(b);
  });
  it.each(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S08', 'S09', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S20', 'S21', 'S23', 'S24'])('%s é entrada estruturalmente válida', id => {
    expect(() => parseSimulationInput(buildScenario(id))).not.toThrow();
  });
  it.each([['S07', 'MISSING_PRICE'], ['S19', 'INVALID_ENUM'], ['S22', 'APORTE_RANGE']])('%s falha explicitamente', (id, code) => {
    expect(() => parseSimulationInput(buildScenario(id))).toThrow(expect.objectContaining({ code }));
  });
  it('representa ausência, vencimento, preço alto e aporte diferente por dados', () => {
    expect(parseSimulationInput(buildScenario('S06')).issues).toContainEqual(expect.objectContaining({ ticker: 'ITUB4', code: 'MISSING_DATA' }));
    expect(parseSimulationInput(buildScenario('S11')).issues).toContainEqual(expect.objectContaining({ code: 'STALE_DATA' }));
    expect(buildScenario('S02').aporteCents).toBe('100000');
    const expensive = buildScenario('S04');
    for (const v of expensive.providedValuations) {
      expect(BigInt(v.baseCents)).toBeLessThan(BigInt(expensive.marketSnapshot.quotes.find(q => q.ticker === v.ticker)!.priceCents));
    }
  });
  it('inclui candidato USD suportado em S12 mantendo SCHD sem suporte', () => {
    const raw = buildScenario('S12');
    expect(raw.portfolio.positions).toContainEqual(expect.objectContaining({ ticker: 'SYNTHUSD', currency: 'USD', profileId: 'etf-broad', quantity: 0 }));
    expect(raw.portfolio.positions).toContainEqual(expect.objectContaining({ ticker: 'SCHD', profileId: 'etf-dividend' }));
    expect(raw.costs).toEqual({ fixedCents: '10', variableRate: '0.001', fxSpread: '0.02', remittanceCents: '25' });
  });
});
