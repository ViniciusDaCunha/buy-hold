import { invalid } from './errors';

export function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    invalid('INVALID_OBJECT', path, 'Objeto de dados esperado.');
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) invalid('UNKNOWN_FIELD', path, 'Campo não suportado neste contrato.');
  }
  return value as Record<string, unknown>; // Forma de objeto verificada acima; valores continuam unknown.
}

export function text(value: unknown, path: string, max = 2048): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    invalid('INVALID_TEXT', path, 'Texto obrigatório ou acima do limite.');
  }
  return value;
}

export function identifier(value: unknown, path: string): string {
  const result = text(value, path, 64);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(result)) invalid('INVALID_ID', path, 'Identificador inválido.');
  return result;
}

export function enumeration<const T extends readonly string[]>(value: unknown, path: string, choices: T): T[number] {
  if (typeof value !== 'string' || !choices.includes(value)) invalid('INVALID_ENUM', path, 'Valor não suportado.');
  return value;
}

export function integer(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    invalid('INVALID_INTEGER', path, 'Inteiro fora dos limites do campo.');
  }
  return value;
}

export function list(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value)) invalid('INVALID_ARRAY', path, 'Lista obrigatória.');
  if (value.length > max) invalid('TOO_MANY_ITEMS', path, 'Lista acima do limite suportado.');
  return value;
}

export function unique<T>(items: readonly T[], key: (item: T) => string, path: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) invalid('DUPLICATE', path, 'Identificadores duplicados.');
    seen.add(id);
  }
}

export function civilDate(value: unknown, path: string): string {
  const date = text(value, path, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) invalid('INVALID_DATE', path, 'Use data civil ISO YYYY-MM-DD.');
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (year < 1 || days === undefined || day < 1 || day > days) invalid('INVALID_DATE', path, 'Data civil inexistente.');
  return date;
}

export function ageDays(date: string, asOf: string): number {
  // Apenas conversão de datas explícitas em UTC, sem consultar relógio global.
  return (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000;
}

export const units = ['BRL', 'USD', 'ratio', 'percent', 'pp', 'count', 'days'] as const;

export function signedDecimal(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length > 34 || !/^-?(0|[1-9]\d{0,23})(?:\.\d{1,8})?$/.test(value)) {
    invalid('INVALID_DECIMAL', path, 'Decimal deve ser texto com até 24 dígitos inteiros e oito casas.');
  }
  return value;
}

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;

export function freeze<T>(value: T): Immutable<T> {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  // A recursão congela todos os descendentes, inclusive arrays.
  return value as Immutable<T>;
}

/** Copia dados JSON e limita trabalho também na entrada direta (sem arquivo). */
export function snapshot(value: unknown): JsonValue {
  let nodes = 0;
  let characters = 0;
  function copy(item: unknown, depth: number): JsonValue {
    if (++nodes > 50000 || depth > 20) invalid('PAYLOAD_LIMIT', '$', 'Estrutura excede os limites de entrada.');
    if (typeof item === 'string') {
      characters += item.length;
      if (characters > 1048576) invalid('PAYLOAD_LIMIT', '$', 'Textos excedem o limite de entrada.');
      return item;
    }
    if (item === null || typeof item === 'boolean') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (Array.isArray(item)) {
      if (item.length > 50000) invalid('PAYLOAD_LIMIT', '$', 'Lista excede os limites de entrada.');
      const result: JsonValue[] = [];
      for (let i = 0; i < item.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        if (!descriptor || !('value' in descriptor)) invalid('INVALID_JSON_VALUE', '$', 'Lista esparsa ou com acessor não é dado JSON.');
        result.push(copy(descriptor.value, depth + 1));
      }
      return Object.freeze(result);
    }
    if (typeof item === 'object' && item !== null && [Object.prototype, null].includes(Object.getPrototypeOf(item))) {
      const result: Record<string, JsonValue> = {};
      for (const key of Object.keys(item)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) invalid('UNSAFE_KEY', '$', 'Chave de objeto não permitida.');
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if (!descriptor || !('value' in descriptor)) invalid('INVALID_JSON_VALUE', '$', 'Acessores não são dados JSON.');
        result[key] = copy(descriptor.value, depth + 1);
      }
      return Object.freeze(result);
    }
    return invalid('INVALID_JSON_VALUE', '$', 'Somente valores JSON finitos são aceitos.');
  }
  return copy(value, 0);
}
