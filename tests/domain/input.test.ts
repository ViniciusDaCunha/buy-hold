// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSimulationInput } from '../../src/domain/input';
import { InputError } from '../../src/domain/errors';
import { inputFixture } from './input-fixture';

describe('contrato de entrada', () => {
  it('identifica preço e FX ausentes de candidato sem impedir valoração das demais posições', () => {
    const raw = inputFixture();
    raw.portfolio.positions.push({ ...raw.portfolio.positions[0]!, ticker: 'NEW', currency: 'USD', quantity: 0, targetBps: 0 });
    const result = parseSimulationInput(raw);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ ticker: 'NEW', code: 'MISSING_PRICE', path: 'marketSnapshot.quotes' }),
      expect.objectContaining({ ticker: 'NEW', code: 'MISSING_FX', path: 'fx' }),
    ]));
    expect(result.input.portfolio.positions[0]!.quantity).toBe(1);
  });
  it('rejeita métrica duplicada mesmo quando uma das ocorrências tem unidade inválida', () => {
    const raw = inputFixture();
    raw.marketSnapshot.metrics.push({ ...raw.marketSnapshot.metrics[0]!, unit: 'bananas' });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'DUPLICATE' }));
  });
  it('rejeita rubrica duplicada mesmo quando uma das ocorrências tem score inválido', () => {
    const raw = inputFixture();
    raw.qualitativeAssessments.push({ ...raw.qualitativeAssessments[0]!, score: 101 });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'DUPLICATE' }));
  });
  it('mantém FX inválido local quando não há posição USD a valorar', () => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.quantity = 0;
    raw.portfolio.positions[0]!.currency = 'USD'; raw.marketSnapshot.quotes[0]!.currency = 'USD';
    raw.providedValuations[0]!.currency = 'USD';
    raw.fx = { from: 'USD', to: 'BRL', rate: '0', asOf: '2026-09-14', source: 'fixture' };
    expect(parseSimulationInput(raw)).toMatchObject({ input: { fx: null }, issues: [expect.objectContaining({ ticker: 'TEST' })] });
    raw.portfolio.positions[0]!.quantity = 1;
    expect(() => parseSimulationInput(raw)).toThrow(InputError);
  });
  it('rejeita perfil desconhecido', () => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.profileId = 'etf-inventado';
    expect(() => parseSimulationInput(raw)).toThrow(InputError);
  });
  it('rejeita metas que excedem exposição agregada por grupo', () => {
    const raw = inputFixture();
    raw.portfolio.positions.push({ ...raw.portfolio.positions[0]!, ticker: 'SECOND', quantity: 0 });
    raw.policy.classes[0]!.targetBps = 2000; raw.policy.cashTargetBps = 8000;
    raw.marketSnapshot.exposures.push({ ...raw.marketSnapshot.exposures[0]!, ticker: 'SECOND' });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'INVALID_TARGETS' }));
  });
  it('rejeita cotação duplicada mesmo com segundo valor inválido', () => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.quantity = 0;
    raw.marketSnapshot.quotes.push({ ...raw.marketSnapshot.quotes[0]!, priceCents: '0' });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'DUPLICATE' }));
  });
  it('atribui moeda incorreta de candidato somente ao ativo', () => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.quantity = 0;
    raw.marketSnapshot.quotes[0]!.currency = 'USD';
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [expect.objectContaining({ code: 'CURRENCY_MISMATCH' })] });
  });
  it('normaliza dinheiro sem mutação e preserva lucro negativo', () => {
    const raw = inputFixture();
    const before = JSON.stringify(raw);
    expect(parseSimulationInput(raw)).toMatchObject({ input: { aporteCents: 50000n,
      portfolio: { cashCents: 100n }, marketSnapshot: { metrics: [{ value: '-1.25' }] } }, issues: [] });
    expect(JSON.stringify(raw)).toBe(before);
  });
  it.each([
    ['schemaVersion', '2.0'], ['aporteCents', '0'], ['aporteCents', '100000001'],
    ['analysisAsOf', '2025-02-29'], ['analysisAsOf', '2026-13-01'], ['analysisAsOf', '0000-01-01'],
  ])('bloqueia %s inválido', (key, value) => {
    expect(() => parseSimulationInput({ ...inputFixture(), [key]: value })).toThrow(InputError);
  });
  it('aceita data bissexta e quantidade zero', () => {
    const raw = inputFixture();
    raw.marketSnapshot.metrics[0]!.period.start = '2024-02-29';
    raw.portfolio.positions[0]!.quantity = 0;
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [] });
  });
  it.each([-1, 0.5, NaN, Infinity, 1000000001])('rejeita quantidade %s', quantity => {
    const raw = inputFixture(); raw.portfolio.positions[0]!.quantity = quantity;
    expect(() => parseSimulationInput(raw)).toThrow(InputError);
  });
  it('rejeita duplicados, mais de 100 ativos, campos desconhecidos e dinheiro numérico', () => {
    const raw = inputFixture();
    raw.portfolio.positions.push({ ...raw.portfolio.positions[0]! });
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'DUPLICATE' }));
    raw.portfolio.positions = Array.from({ length: 101 }, (_, i) => ({ ...raw.portfolio.positions[0]!, ticker: `T${i}` }));
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'TOO_MANY_ITEMS' }));
    expect(() => parseSimulationInput({ ...inputFixture(), override: true })).toThrow(InputError);
    expect(() => parseSimulationInput({ ...inputFixture(), aporteCents: 50000 })).toThrow(InputError);
  });
  it('exige metas coerentes por ativo/classe e caixa sem dupla liberação', () => {
    for (const change of [
      (raw: ReturnType<typeof inputFixture>) => { raw.policy.cashTargetBps = 8999; },
      (raw: ReturnType<typeof inputFixture>) => { raw.portfolio.positions[0]!.targetBps = 999; },
      (raw: ReturnType<typeof inputFixture>) => { raw.portfolio.positions[0]!.classId = 'unknown'; },
      (raw: ReturnType<typeof inputFixture>) => { raw.policy.limits.individualBps = 999; },
      (raw: ReturnType<typeof inputFixture>) => { raw.portfolio.releasedCashCents = '100'; },
    ]) {
      const raw = inputFixture(); change(raw);
      expect(() => parseSimulationInput(raw)).toThrow(InputError);
    }
  });
  it('valida âncoras H/L e permite platô de largura zero em B', () => {
    const raw = inputFixture(); raw.policy.rules[0]!.anchors = [0, 0, 1];
    expect(() => parseSimulationInput(raw)).toThrow(InputError);
    raw.policy.rules[0]!.direction = 'B'; raw.policy.rules[0]!.anchors = [0, 1, 1, 2];
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [] });
  });
  it('bloqueia preço ou FX ausente para posição existente', () => {
    const raw = inputFixture(); raw.marketSnapshot.quotes = [];
    expect(() => parseSimulationInput(raw)).toThrow(expect.objectContaining({ code: 'MISSING_PRICE' }));
    const usd = inputFixture(); usd.portfolio.positions[0]!.currency = 'USD'; usd.marketSnapshot.quotes[0]!.currency = 'USD';
    expect(() => parseSimulationInput(usd)).toThrow(expect.objectContaining({ code: 'MISSING_FX' }));
    usd.fx = { from: 'USD', to: 'BRL', rate: '5.125', asOf: '2026-09-14', source: 'fixture' };
    expect(parseSimulationInput(usd)).toMatchObject({ input: { fx: { rate: '5.125' } } });
  });
  it('preserva zero/ausência e comunica métrica inválida localmente', () => {
    const raw = inputFixture(); raw.marketSnapshot.metrics[0]!.value = null;
    expect(parseSimulationInput(raw)).toMatchObject({ input: { marketSnapshot: { metrics: [{ value: null }] } } });
    raw.marketSnapshot.metrics[0]!.value = '0';
    expect(parseSimulationInput(raw)).toMatchObject({ input: { marketSnapshot: { metrics: [{ value: '0' }] } } });
    raw.marketSnapshot.metrics[0]!.unit = 'bananas';
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [expect.objectContaining({ ticker: 'TEST', code: 'INVALID_ENUM' })] });
  });
  it('identifica dado vencido, inclusive fronteira exata, sem alterar o snapshot', () => {
    const raw = inputFixture(); raw.policy.validityDays.metric = 150;
    raw.marketSnapshot.metrics[0]!.period.end = '2026-04-17';
    raw.marketSnapshot.metrics[0]!.publishedOn = '2026-04-18';
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [] });
    raw.marketSnapshot.metrics[0]!.period.end = '2026-04-16';
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [expect.objectContaining({ code: 'STALE_DATA' })] });
  });
  it('distingue preço inválido de candidato e preço inválido da posição', () => {
    const raw = inputFixture(); raw.marketSnapshot.quotes[0]!.priceCents = '0';
    expect(() => parseSimulationInput(raw)).toThrow(InputError);
    raw.portfolio.positions[0]!.quantity = 0;
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [expect.objectContaining({ code: 'INVALID_PRICE' })] });
  });
  it('valida proveniência/datas e mantém texto malicioso como dado', () => {
    const raw = inputFixture(); raw.qualitativeAssessments[0]!.reason = '<script>alert(1)</script>';
    expect(parseSimulationInput(raw)).toMatchObject({ input: { qualitativeAssessments: [{ reason: '<script>alert(1)</script>' }] } });
    raw.qualitativeAssessments[0]!.publishedOn = '2030-01-01';
    expect(parseSimulationInput(raw)).toMatchObject({ issues: [expect.objectContaining({ code: 'INVALID_PERIOD' })] });
  });
  it('valida estado anterior opcional sem presumir histórico', () => {
    expect(parseSimulationInput(inputFixture()).input.previousEligibility).toEqual([]);
    expect(parseSimulationInput({ ...inputFixture(), previousEligibility: [
      { ticker: 'TEST', state: 'full', policyVersion: '1.0' },
    ] }).input.previousEligibility).toEqual([{ ticker: 'TEST', state: 'full', policyVersion: '1.0' }]);
    expect(() => parseSimulationInput({ ...inputFixture(), previousEligibility: [
      { ticker: 'OUTSIDE', state: 'full', policyVersion: '1.0' },
    ] })).toThrow(expect.objectContaining({ code: 'UNKNOWN_ASSET' }));
    expect(() => parseSimulationInput({ ...inputFixture(), previousEligibility: [
      { ticker: 'TEST', state: 'invalid', policyVersion: '1.0' },
    ] })).toThrow(expect.objectContaining({ code: 'INVALID_ENUM' }));
  });
});
