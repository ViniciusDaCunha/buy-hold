import type { SimulationResult } from '../domain/result';

export function serializeSimulationResult(_result: SimulationResult): string {
  return `${JSON.stringify(_result, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value, 2)}\n`;
}
