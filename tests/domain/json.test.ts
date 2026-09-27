// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFixtureJson, serializeInput, serializeSnapshot, MAX_FIXTURE_BYTES } from '../../backend/src/adapters/fixture-json';
import { diagnose } from '../../backend/src/application/diagnostics';
import { parseSimulationInput } from '../../backend/src/domain/input';
import { InputError } from '../../backend/src/domain/errors';
import { inputFixture } from './input-fixture';

describe('fronteira JSON (S22)', () => {
  it('faz round trip explícito dos centavos grandes', () => {
    const raw = inputFixture(); raw.portfolio.cashCents = '9007199254740993';
    const parsed = parseSimulationInput(raw);
    const encoded = serializeInput(parsed.input);
    expect(encoded).toContain('"cashCents":"9007199254740993"');
    expect(readFixtureJson(encoded).input).toEqual(parsed.input);
    expect(serializeSnapshot(parsed)).toBe(JSON.stringify(raw));
  });
  it.each(['{', 'null', '[]', '{"__proto__":{"polluted":true}}', '{"aporteCents":1e999}', 1, null])('rejeita JSON inválido #%#', raw => {
    expect(() => readFixtureJson(raw)).toThrow(InputError);
  });
  it('conta bytes UTF-8 antes de interpretar JSON', () => {
    const encoded = JSON.stringify(inputFixture());
    const bytes = new TextEncoder().encode(encoded).length;
    expect(readFixtureJson(encoded + ' '.repeat(MAX_FIXTURE_BYTES - bytes))).toMatchObject({ issues: [] });
    expect(() => readFixtureJson(encoded + ' '.repeat(MAX_FIXTURE_BYTES - bytes + 1))).toThrow(expect.objectContaining({ code: 'PAYLOAD_LIMIT' }));
    expect(() => readFixtureJson('"' + 'é'.repeat(MAX_FIXTURE_BYTES / 2) + '"')).toThrow(expect.objectContaining({ code: 'PAYLOAD_LIMIT' }));
  });
  it('conserva dados rejeitados no snapshot, sem referência mutável ao chamador', () => {
    const raw = inputFixture(); raw.marketSnapshot.metrics[0]!.unit = 'invalid';
    const parsed = parseSimulationInput(raw);
    raw.marketSnapshot.metrics[0]!.value = '999';
    expect(serializeSnapshot(parsed)).toContain('"value":"-1.25"');
    expect(serializeSnapshot(parsed)).toContain('"unit":"invalid"');
    expect(readFixtureJson(serializeSnapshot(parsed)).issues).toEqual(parsed.issues);
    expect(Object.isFrozen(parsed.input.portfolio.positions)).toBe(true);
  });
  it('rejeita acessores, ciclos e dados aninhados demais na entrada direta', () => {
    const raw = inputFixture();
    const getter = { get schemaVersion() { throw new Error('não executar'); } };
    expect(() => parseSimulationInput(getter)).toThrow(InputError);
    const array = Object.defineProperty([], '0', { get() { throw new Error('não executar'); } });
    expect(() => parseSimulationInput(array)).toThrow(InputError);
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(() => parseSimulationInput(cyclic)).toThrow(InputError);
    let deep: unknown = raw;
    for (let i = 0; i < 25; i++) deep = { child: deep };
    expect(() => parseSimulationInput(deep)).toThrow(InputError);
  });
});

describe('diagnóstico sem dados sensíveis', () => {
  const context = { etapa: 'fixture', scenarioId: 'test', schemaVersion: '1.0', policyVersion: '1.0' };
  it('distingue validação esperada de exceção operacional', () => {
    expect(diagnose(new InputError('INVALID_DATE', 'analysisAsOf', 'Data inválida.'), context)).toMatchObject({
      kind: 'validation', errorCode: 'INVALID_DATE', path: 'analysisAsOf', ...context,
    });
    const result = diagnose(new Error('segredo /home/carteira'), { ...context, decisionId: 'abc' });
    expect(result).toMatchObject({ kind: 'operational', errorCode: 'OPERATION_FAILED', ...context, decisionId: 'abc' });
    expect(JSON.stringify(result)).not.toMatch(/segredo|carteira|stack/);
  });
});
