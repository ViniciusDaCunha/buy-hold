import { invalid } from './errors';
import { parseCents } from './money';
import { civilDate, enumeration, identifier, integer, record, signedDecimal, text, units } from './validation';

export const metadataKeys = ['period', 'publishedOn', 'collectedOn', 'source', 'method', 'adjustments'];

function metadata(r: Record<string, unknown>, path: string, asOf: string) {
  const period = record(r.period, `${path}.period`, ['start', 'end']);
  const start = civilDate(period.start, `${path}.period.start`);
  const end = civilDate(period.end, `${path}.period.end`);
  const publishedOn = civilDate(r.publishedOn, `${path}.publishedOn`);
  const collectedOn = civilDate(r.collectedOn, `${path}.collectedOn`);
  if (start > end || end > publishedOn || publishedOn > collectedOn || collectedOn > asOf) {
    invalid('INVALID_PERIOD', path, 'Período, publicação, coleta e análise devem ter ordem temporal coerente.');
  }
  return { period: { start, end }, publishedOn, collectedOn,
    source: text(r.source, `${path}.source`), method: text(r.method, `${path}.method`),
    adjustments: text(r.adjustments, `${path}.adjustments`) };
}

export function parseMetric(value: unknown, path: string, asOf: string) {
  const r = record(value, path, ['ticker', 'ruleId', 'value', 'unit', 'basis', 'sampleCount', ...metadataKeys]);
  return { ticker: identifier(r.ticker, `${path}.ticker`), ruleId: identifier(r.ruleId, `${path}.ruleId`),
    basis: enumeration(r.basis === undefined ? 'current' : r.basis, `${path}.basis`, ['current', 'historical']),
    sampleCount: integer(r.sampleCount === undefined ? 1 : r.sampleCount, `${path}.sampleCount`, 1, 100),
    value: r.value === null ? null : signedDecimal(r.value, `${path}.value`),
    unit: enumeration(r.unit, `${path}.unit`, units), ...metadata(r, path, asOf) };
}

export function parseQualitative(value: unknown, path: string, asOf: string) {
  const r = record(value, path, ['ticker', 'ruleId', 'score', 'reason', 'reviewTrigger', ...metadataKeys]);
  if (r.score !== null && (typeof r.score !== 'number' || ![0, 25, 50, 75, 100].includes(r.score))) {
    invalid('INVALID_SCORE', `${path}.score`, 'Rubrica deve ser ausente ou 0, 25, 50, 75, 100.');
  }
  return { ticker: identifier(r.ticker, `${path}.ticker`), ruleId: identifier(r.ruleId, `${path}.ruleId`),
    score: r.score, reason: text(r.reason, `${path}.reason`), reviewTrigger: text(r.reviewTrigger, `${path}.reviewTrigger`),
    ...metadata(r, path, asOf) };
}

export function parseValuation(value: unknown, path: string, asOf: string) {
  const r = record(value, path, ['ticker', 'currency', 'conservativeCents', 'baseCents', 'favorableCents', 'provenance', ...metadataKeys]);
  const conservativeCents = parseCents(r.conservativeCents, `${path}.conservativeCents`);
  const baseCents = parseCents(r.baseCents, `${path}.baseCents`);
  const favorableCents = parseCents(r.favorableCents, `${path}.favorableCents`);
  if (baseCents === 0n || conservativeCents > baseCents || baseCents > favorableCents) {
    invalid('INVALID_VALUATION', path, 'Cenários devem ser ordenados e o valor-base positivo.');
  }
  return { ticker: identifier(r.ticker, `${path}.ticker`), currency: enumeration(r.currency, `${path}.currency`, ['BRL', 'USD']),
    conservativeCents, baseCents, favorableCents,
    provenance: enumeration(r.provenance, `${path}.provenance`, ['provided_fixture']), ...metadata(r, path, asOf) };
}

export function parseQuote(value: unknown, path: string, analysisAsOf: string) {
  const r = record(value, path, ['ticker', 'currency', 'priceCents', 'asOf', 'source']);
  const priceCents = parseCents(r.priceCents, `${path}.priceCents`);
  if (priceCents === 0n) invalid('INVALID_PRICE', `${path}.priceCents`, 'Preço deve ser positivo.');
  const asOf = civilDate(r.asOf, `${path}.asOf`);
  if (asOf > analysisAsOf) invalid('INVALID_PERIOD', `${path}.asOf`, 'Cotação posterior à análise.');
  return { ticker: identifier(r.ticker, `${path}.ticker`), priceCents, asOf,
    currency: enumeration(r.currency, `${path}.currency`, ['BRL', 'USD']), source: text(r.source, `${path}.source`) };
}
