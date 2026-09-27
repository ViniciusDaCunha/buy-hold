import { invalid } from '../domain/errors';
import { parseSimulationInput, type SimulationInput, type ValidatedInput } from '../domain/input';
export const MAX_FIXTURE_BYTES = 1048576;

export function readFixtureJson(json: unknown): ValidatedInput {
  if (typeof json !== 'string') invalid('INVALID_JSON', '$', 'Informe um documento JSON em texto.');
  if (json.length > MAX_FIXTURE_BYTES || new TextEncoder().encode(json).length > MAX_FIXTURE_BYTES) {
    invalid('PAYLOAD_LIMIT', '$', 'Fixture excede o limite de 1 MiB em UTF-8.');
  }
  let value: unknown;
  try { value = JSON.parse(json); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return invalid('INVALID_JSON', '$', 'JSON inválido; confira o formato do documento.');
  }
  return parseSimulationInput(value);
}

/** Normalizado para consumidores tipados; para auditoria, exportar o snapshot original. */
export function serializeInput(input: SimulationInput): string {
  return JSON.stringify(input, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
}

export function serializeSnapshot(validated: ValidatedInput): string {
  return JSON.stringify(validated.snapshot);
}
