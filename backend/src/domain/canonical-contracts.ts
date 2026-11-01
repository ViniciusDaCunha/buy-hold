import { invalid } from './errors';
import { civilDate, enumeration, freeze, identifier, integer, JsonValue, list, record, snapshot, text, unique } from './validation';

export const canonicalSchemaVersion = '1.0' as const;

const instrumentTypes = ['stock', 'fii', 'etf', 'fund', 'cash', 'other'] as const;
const qualityStates = ['fresh', 'stale', 'missing', 'invalid', 'conflict', 'provider-revised', 'source-unavailable', 'unknown-publication-time'] as const;
const observationStates = ['available', ...qualityStates] as const;
const units = ['currency', 'currency-per-share', 'currency-per-unit', 'fraction', 'percent', 'percentage-point', 'ratio', 'count', 'days', 'shares', 'basis-points', 'unknown'] as const;
const stableIdentifierPatterns: Readonly<Record<string, RegExp>> = {
  cnpj: /^\d{14}$/,
  isin: /^[A-Z]{2}[A-Z0-9]{9}\d$/,
  figi: /^[A-Z0-9]{12}$/,
  lei: /^[A-Z0-9]{20}$/,
};

function versionedRecord(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  const result = record(value, path, ['schemaVersion', ...keys]);
  if (result.schemaVersion !== canonicalSchemaVersion) {
    invalid('UNSUPPORTED_SCHEMA_VERSION', `${path}.schemaVersion`, 'Versão de contrato não suportada.');
  }
  return result;
}

function nullableIdentifier(value: unknown, path: string): string | null {
  return value === null ? null : identifier(value, path);
}

function nullableText(value: unknown, path: string, max = 2048): string | null {
  return value === null ? null : text(value, path, max);
}

function currency(value: unknown, path: string): string {
  const result = text(value, path, 3);
  if (!/^[A-Z]{3}$/.test(result)) invalid('INVALID_CURRENCY', path, 'Código monetário de três letras em maiúsculas esperado.');
  return result;
}

function exactDecimal(value: unknown, path: string, allowNegative = true) {
  const r = record(value, path, ['value', 'scale']);
  const decimal = text(r.value, `${path}.value`, 40);
  const match = /^(-?)(0|[1-9]\d{0,23})(?:\.(\d{1,12}))?$/.exec(decimal);
  if (!match || /^-0(?:\.0+)?$/.test(decimal)) invalid('INVALID_DECIMAL', `${path}.value`, 'Decimal deve ser texto exato sem notação exponencial ou zeros negativos.');
  const scale = integer(r.scale, `${path}.scale`, 0, 12);
  if ((match[3]?.length ?? 0) > scale) invalid('INVALID_SCALE', `${path}.scale`, 'Escala declarada não comporta as casas decimais do valor.');
  if (!allowNegative && match[1] === '-') invalid('NEGATIVE_VALUE', `${path}.value`, 'Valor não pode ser negativo.');
  return { value: decimal, scale };
}

function money(value: unknown, path: string, allowNegative = true) {
  const r = record(value, path, ['amount', 'currency']);
  return { amount: exactDecimal(r.amount, `${path}.amount`, allowNegative), currency: currency(r.currency, `${path}.currency`) };
}

function instant(value: unknown, path: string): string {
  const result = text(value, path, 40);
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/.exec(result);
  if (!match) invalid('INVALID_INSTANT', path, 'Instante deve ser ISO 8601 com fuso explícito.');
  civilDate(match[1], path);
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59 ||
      (match[6] !== undefined && (Number(match[6]) > 14 || Number(match[7]) > 59 || (Number(match[6]) === 14 && Number(match[7]) !== 0))) ||
      !Number.isFinite(Date.parse(result))) {
    invalid('INVALID_INSTANT', path, 'Instante ISO 8601 inexistente.');
  }
  return result;
}

function nullableInstant(value: unknown, path: string): string | null {
  return value === null ? null : instant(value, path);
}

function instantNanoseconds(value: string): bigint {
  const match = /^(.*:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match?.[1] || !match[3]) invalid('INVALID_INSTANT', '$', 'Instante ISO 8601 inválido.');
  const wholeMilliseconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(wholeMilliseconds)) invalid('INVALID_INSTANT', '$', 'Instante ISO 8601 inválido.');
  return BigInt(wholeMilliseconds) * 1_000_000n + BigInt((match[2] ?? '').padEnd(9, '0'));
}

function instantIsAfter(before: string, after: string): boolean {
  return instantNanoseconds(before) > instantNanoseconds(after);
}

function timestampOrder(before: string, after: string, path: string) {
  if (instantIsAfter(before, after)) invalid('INVALID_TIME_ORDER', path, 'A sequência temporal do contrato é incoerente.');
}

function parseDatePeriod(value: unknown, path: string) {
  const r = record(value, path, ['kind', 'start', 'end']);
  const kind = enumeration(r.kind, `${path}.kind`, ['annual', 'quarterly', 'ttm', 'spot', 'not-applicable', 'unknown'] as const);
  const start = r.start === null ? null : civilDate(r.start, `${path}.start`);
  const end = r.end === null ? null : civilDate(r.end, `${path}.end`);
  if (['annual', 'quarterly', 'ttm'].includes(kind)) {
    if (start === null || end === null || start > end) invalid('INVALID_PERIOD', path, 'Período econômico exige datas inicial e final coerentes.');
  } else if (start !== null || end !== null) {
    invalid('INVALID_PERIOD', path, 'Período spot, inaplicável ou desconhecido não pode inventar datas econômicas.');
  }
  return { kind, start, end };
}

function stringIds(value: unknown, path: string, max = 10000): string[] {
  const result = list(value, path, max).map((item, index) => identifier(item, `${path}.${index}`));
  unique(result, item => item, path);
  return result;
}

function jsonObject(value: unknown, path: string): JsonValue {
  const result = snapshot(value);
  if (result === null || Array.isArray(result) || typeof result !== 'object') {
    invalid('INVALID_OBJECT', path, 'Snapshot JSON deve ser um objeto.');
  }
  return result;
}

/** Stable project identity is independent of mutable ticker/name symbols. */
export function parseCanonicalAsset(value: unknown) {
  const r = versionedRecord(value, '$asset', ['assetId', 'instrumentType', 'primarySymbol', 'currency', 'identityState', 'issuerId', 'identifiers', 'symbols']);
  const identifiers = list(r.identifiers, '$asset.identifiers', 100).map((item, index) => {
    const path = `$asset.identifiers.${index}`;
    const row = record(item, path, ['scheme', 'value']);
    const scheme = identifier(row.scheme, `${path}.scheme`);
    const identifierValue = text(row.value, `${path}.value`, 128);
    const stablePattern = Object.hasOwn(stableIdentifierPatterns, scheme) ? stableIdentifierPatterns[scheme] : undefined;
    if (stablePattern && !stablePattern.test(identifierValue)) {
      invalid('INVALID_EXTERNAL_ID', `${path}.value`, 'Formato incompatível com o esquema de identidade estável.');
    }
    return { scheme, value: identifierValue };
  });
  unique(identifiers, item => `${item.scheme}/${item.value}`, '$asset.identifiers');
  const symbols = list(r.symbols, '$asset.symbols', 100).map((item, index) => {
    const path = `$asset.symbols.${index}`;
    const row = record(item, path, ['symbol', 'validFrom', 'validTo', 'sourceId']);
    const validFrom = row.validFrom === null ? null : civilDate(row.validFrom, `${path}.validFrom`);
    const validTo = row.validTo === null ? null : civilDate(row.validTo, `${path}.validTo`);
    if (validFrom !== null && validTo !== null && validFrom > validTo) invalid('INVALID_PERIOD', path, 'Validade do símbolo está invertida.');
    return { symbol: text(row.symbol, `${path}.symbol`, 64), validFrom, validTo, sourceId: identifier(row.sourceId, `${path}.sourceId`) };
  });
  if (!symbols.some(item => item.symbol === r.primarySymbol)) invalid('INVALID_ASSET', '$asset.primarySymbol', 'Símbolo principal deve existir no histórico de símbolos.');
  unique(symbols, item => `${item.symbol}/${item.validFrom ?? ''}/${item.validTo ?? ''}/${item.sourceId}`, '$asset.symbols');
  const identityState = enumeration(r.identityState, '$asset.identityState', ['identified', 'unresolved'] as const);
  const issuerId = nullableIdentifier(r.issuerId, '$asset.issuerId');
  if (identityState === 'identified' && issuerId === null && !identifiers.some(item => Object.hasOwn(stableIdentifierPatterns, item.scheme))) {
    invalid('UNRESOLVED_IDENTITY', '$asset', 'Ativo identificado exige ID de emissor/fundo ou identificador externo estável.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, assetId: identifier(r.assetId, '$asset.assetId'),
    instrumentType: enumeration(r.instrumentType, '$asset.instrumentType', instrumentTypes), primarySymbol: text(r.primarySymbol, '$asset.primarySymbol', 64),
    currency: currency(r.currency, '$asset.currency'), identityState, issuerId, identifiers, symbols });
}

export function parseCanonicalClassification(value: unknown) {
  const r = versionedRecord(value, '$classification', ['classificationId', 'assetId', 'dimension', 'state', 'method', 'weightBps', 'effectiveFrom', 'effectiveTo', 'publishedAt', 'collectedAt', 'sourceId']);
  const state = enumeration(r.state, '$classification.state', ['classified', 'unclassified', 'unknown'] as const);
  const classificationId = nullableIdentifier(r.classificationId, '$classification.classificationId');
  if ((state === 'classified') !== (classificationId !== null)) invalid('INVALID_CLASSIFICATION', '$classification.classificationId', 'Somente classificação conhecida recebe identificador.');
  const effectiveFrom = r.effectiveFrom === null ? null : civilDate(r.effectiveFrom, '$classification.effectiveFrom');
  const effectiveTo = r.effectiveTo === null ? null : civilDate(r.effectiveTo, '$classification.effectiveTo');
  if (effectiveFrom !== null && effectiveTo !== null && effectiveFrom > effectiveTo) invalid('INVALID_PERIOD', '$classification', 'Validade da classificação está invertida.');
  const publishedAt = nullableInstant(r.publishedAt, '$classification.publishedAt');
  const collectedAt = instant(r.collectedAt, '$classification.collectedAt');
  if (publishedAt !== null) timestampOrder(publishedAt, collectedAt, '$classification');
  return freeze({ schemaVersion: canonicalSchemaVersion, classificationId, assetId: identifier(r.assetId, '$classification.assetId'),
    dimension: enumeration(r.dimension, '$classification.dimension', ['sector', 'issuer-group', 'instrument-class', 'fund-type'] as const), state,
    method: enumeration(r.method, '$classification.method', ['direct', 'look-through', 'provider'] as const),
    weightBps: integer(r.weightBps, '$classification.weightBps', 0, 10000), effectiveFrom, effectiveTo, publishedAt, collectedAt,
    sourceId: identifier(r.sourceId, '$classification.sourceId') });
}

export function parseFundComposition(value: unknown) {
  const r = versionedRecord(value, '$composition', ['compositionId', 'assetId', 'status', 'referenceDate', 'publishedAt', 'collectedAt', 'sourceId', 'endpointOrFile', 'recordReference', 'coverageBps', 'unclassifiedBps', 'components']);
  const status = enumeration(r.status, '$composition.status', ['available', 'missing', 'source-unavailable'] as const);
  const referenceDate = r.referenceDate === null ? null : civilDate(r.referenceDate, '$composition.referenceDate');
  const publishedAt = nullableInstant(r.publishedAt, '$composition.publishedAt');
  const collectedAt = instant(r.collectedAt, '$composition.collectedAt');
  if (publishedAt !== null) timestampOrder(publishedAt, collectedAt, '$composition');
  const components = list(r.components, '$composition.components', 10000).map((item, index) => {
    const path = `$composition.components.${index}`;
    const row = record(item, path, ['assetId', 'requestedSymbol', 'returnedSymbol', 'weightBps', 'identityState']);
    const componentAssetId = nullableIdentifier(row.assetId, `${path}.assetId`);
    const requestedSymbol = nullableText(row.requestedSymbol, `${path}.requestedSymbol`, 64);
    const returnedSymbol = nullableText(row.returnedSymbol, `${path}.returnedSymbol`, 64);
    const identityState = enumeration(row.identityState, `${path}.identityState`, ['identified', 'unresolved'] as const);
    if (requestedSymbol === null && returnedSymbol === null) invalid('INVALID_COMPONENT', path, 'Preserve ao menos o símbolo solicitado ou retornado.');
    if ((identityState === 'identified') !== (componentAssetId !== null)) invalid('INVALID_COMPONENT', path, 'Identidade do componente e assetId devem concordar.');
    return { assetId: componentAssetId, requestedSymbol, returnedSymbol,
      weightBps: integer(row.weightBps, `${path}.weightBps`, 1, 10000), identityState };
  });
  const coverageBps = r.coverageBps === null ? null : integer(r.coverageBps, '$composition.coverageBps', 0, 10000);
  const unclassifiedBps = r.unclassifiedBps === null ? null : integer(r.unclassifiedBps, '$composition.unclassifiedBps', 0, 10000);
  if (status === 'available') {
    if (referenceDate === null || coverageBps === null || unclassifiedBps === null || coverageBps + unclassifiedBps !== 10000) {
      invalid('INVALID_COMPOSITION', '$composition', 'Composição disponível exige data-base e cobertura mais parcela não classificada igual a 100%.');
    }
    const identifiedWeight = components.filter(item => item.identityState === 'identified').reduce((sum, item) => sum + item.weightBps, 0);
    const unresolvedWeight = components.filter(item => item.identityState === 'unresolved').reduce((sum, item) => sum + item.weightBps, 0);
    if (identifiedWeight !== coverageBps || unresolvedWeight > unclassifiedBps || identifiedWeight + unresolvedWeight > 10000) {
      invalid('INVALID_COMPOSITION', '$composition.components', 'Pesos dos componentes não coincidem com cobertura identificada.');
    }
  } else if (referenceDate !== null || coverageBps !== null || unclassifiedBps !== null || components.length > 0) {
    invalid('INVALID_COMPOSITION', '$composition', 'Composição indisponível não pode conter componentes ou cobertura presumidos.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, compositionId: identifier(r.compositionId, '$composition.compositionId'),
    assetId: identifier(r.assetId, '$composition.assetId'), status, referenceDate, publishedAt, collectedAt,
    sourceId: identifier(r.sourceId, '$composition.sourceId'), endpointOrFile: text(r.endpointOrFile, '$composition.endpointOrFile'),
    recordReference: nullableText(r.recordReference, '$composition.recordReference'), coverageBps, unclassifiedBps, components });
}

export function parseOpeningPosition(value: unknown) {
  const r = versionedRecord(value, '$openingPosition', ['positionId', 'assetId', 'quantity', 'currency', 'effectiveOn', 'acquiredOn', 'unitAcquisitionPrice', 'costBasis', 'costs', 'recordedAt', 'reviewedAt', 'sourceKind', 'sourceId']);
  const quantity = exactDecimal(r.quantity, '$openingPosition.quantity', false);
  if (quantity.value === '0' || /^0(?:\.0+)?$/.test(quantity.value)) invalid('INVALID_QUANTITY', '$openingPosition.quantity', 'Posição inicial exige quantidade positiva.');
  const sourceKind = enumeration(r.sourceKind, '$openingPosition.sourceKind', ['manual', 'imported-reviewed'] as const);
  const sourceId = nullableIdentifier(r.sourceId, '$openingPosition.sourceId');
  const recordedAt = instant(r.recordedAt, '$openingPosition.recordedAt');
  const reviewedAt = nullableInstant(r.reviewedAt, '$openingPosition.reviewedAt');
  if ((sourceKind === 'imported-reviewed' && (sourceId === null || reviewedAt === null)) ||
      (sourceKind === 'manual' && sourceId !== null)) {
    invalid('INVALID_SOURCE', '$openingPosition.sourceId', 'Posição importada exige origem e revisão explícita; posição manual não declara fonte externa.');
  }
  if (reviewedAt !== null) timestampOrder(recordedAt, reviewedAt, '$openingPosition.reviewedAt');
  const unitAcquisitionPrice = r.unitAcquisitionPrice === null ? null : money(r.unitAcquisitionPrice, '$openingPosition.unitAcquisitionPrice', false);
  const costBasis = r.costBasis === null ? null : money(r.costBasis, '$openingPosition.costBasis', false);
  const costs = r.costs === null ? null : money(r.costs, '$openingPosition.costs', false);
  const positionCurrency = currency(r.currency, '$openingPosition.currency');
  if ([unitAcquisitionPrice, costBasis, costs].some(item => item !== null && item.currency !== positionCurrency)) {
    invalid('CURRENCY_MISMATCH', '$openingPosition', 'Preço, custo e posição inicial devem declarar a mesma moeda.');
  }
  const effectiveOn = civilDate(r.effectiveOn, '$openingPosition.effectiveOn');
  const acquiredOn = r.acquiredOn === null ? null : civilDate(r.acquiredOn, '$openingPosition.acquiredOn');
  if (acquiredOn !== null && acquiredOn > effectiveOn) invalid('INVALID_PERIOD', '$openingPosition.acquiredOn', 'Aquisição não pode ocorrer após a data-base da posição.');
  return freeze({ schemaVersion: canonicalSchemaVersion, positionId: identifier(r.positionId, '$openingPosition.positionId'),
    assetId: identifier(r.assetId, '$openingPosition.assetId'), quantity, currency: positionCurrency, effectiveOn, acquiredOn,
    unitAcquisitionPrice, costBasis, costs, recordedAt, reviewedAt, sourceKind, sourceId });
}

export function parseFinancialEvent(value: unknown) {
  const r = versionedRecord(value, '$financialEvent', ['eventId', 'eventType', 'status', 'assetId', 'quantity', 'unitPrice', 'grossAmount', 'netAmount', 'costs', 'occurredAt', 'effectiveOn', 'recordedAt', 'reviewedAt', 'source', 'reversesEventId']);
  const eventType = enumeration(r.eventType, '$financialEvent.eventType', ['external-contribution', 'withdrawal', 'purchase', 'sale', 'dividend-received', 'fee', 'reversal'] as const);
  const status = enumeration(r.status, '$financialEvent.status', ['draft', 'imported-pending', 'confirmed', 'reversed'] as const);
  const assetId = nullableIdentifier(r.assetId, '$financialEvent.assetId');
  const quantity = r.quantity === null ? null : exactDecimal(r.quantity, '$financialEvent.quantity', false);
  if (quantity?.value === '0' || (quantity !== null && /^0(?:\.0+)?$/.test(quantity.value))) invalid('INVALID_QUANTITY', '$financialEvent.quantity', 'Quantidade do evento deve ser positiva.');
  const unitPrice = r.unitPrice === null ? null : money(r.unitPrice, '$financialEvent.unitPrice', false);
  if (unitPrice?.amount.value === '0' || (unitPrice !== null && /^0(?:\.0+)?$/.test(unitPrice.amount.value))) invalid('INVALID_AMOUNT', '$financialEvent.unitPrice', 'Preço unitário deve ser positivo.');
  const grossAmount = r.grossAmount === null ? null : money(r.grossAmount, '$financialEvent.grossAmount', false);
  const netAmount = r.netAmount === null ? null : money(r.netAmount, '$financialEvent.netAmount', false);
  const costs = r.costs === null ? null : money(r.costs, '$financialEvent.costs', false);
  const reversesEventId = nullableIdentifier(r.reversesEventId, '$financialEvent.reversesEventId');
  const sourceRow = record(r.source, '$financialEvent.source', ['kind', 'sourceId', 'externalOperationId']);
  const source = { kind: enumeration(sourceRow.kind, '$financialEvent.source.kind', ['manual', 'imported', 'system'] as const),
    sourceId: nullableIdentifier(sourceRow.sourceId, '$financialEvent.source.sourceId'),
    externalOperationId: nullableText(sourceRow.externalOperationId, '$financialEvent.source.externalOperationId', 128) };
  if ((source.kind === 'manual') !== (source.sourceId === null) || (source.kind !== 'imported' && source.externalOperationId !== null)) {
    invalid('INVALID_SOURCE', '$financialEvent.source', 'Origem e identificadores externos são inconsistentes.');
  }
  if (status === 'imported-pending' && source.kind !== 'imported') invalid('INVALID_EVENT_STATUS', '$financialEvent.status', 'Evento pendente de importação precisa declarar origem importada.');
  if (status === 'reversed' && eventType !== 'reversal') invalid('INVALID_EVENT_STATUS', '$financialEvent.status', 'Evento estornado deve ser um registro de reversão separado.');
  const occurredAt = instant(r.occurredAt, '$financialEvent.occurredAt');
  const recordedAt = instant(r.recordedAt, '$financialEvent.recordedAt');
  const reviewedAt = nullableInstant(r.reviewedAt, '$financialEvent.reviewedAt');
  timestampOrder(occurredAt, recordedAt, '$financialEvent.recordedAt');
  if (reviewedAt !== null) timestampOrder(recordedAt, reviewedAt, '$financialEvent.reviewedAt');
  if ((status === 'imported-pending' || status === 'draft') && reviewedAt !== null) {
    invalid('INVALID_REVIEW', '$financialEvent.reviewedAt', 'Evento pendente ou rascunho não pode registrar revisão concluída.');
  }
  if ((status === 'confirmed' && source.kind !== 'manual' && reviewedAt === null) || (status === 'reversed' && reviewedAt === null)) {
    invalid('MISSING_REVIEW', '$financialEvent.reviewedAt', 'Evento importado confirmado ou reversão exige instante de revisão explícita.');
  }
  const eventCurrency = grossAmount?.currency ?? netAmount?.currency ?? unitPrice?.currency ?? costs?.currency ?? null;
  if ([grossAmount, netAmount, unitPrice, costs].some(item => item !== null && eventCurrency !== item.currency)) {
    invalid('CURRENCY_MISMATCH', '$financialEvent', 'Valores do mesmo evento devem declarar a mesma moeda.');
  }
  if (eventType === 'purchase' || eventType === 'sale') {
    if (assetId === null || quantity === null || unitPrice === null || grossAmount === null || netAmount === null || reversesEventId !== null) {
      invalid('INVALID_EVENT', '$financialEvent', 'Compra/venda exige ativo, quantidade, preço, valor bruto/líquido e não é reversão.');
    }
  } else if (eventType === 'external-contribution' || eventType === 'withdrawal') {
    if (assetId !== null || quantity !== null || unitPrice !== null || grossAmount === null || netAmount === null || reversesEventId !== null) {
      invalid('INVALID_EVENT', '$financialEvent', 'Aporte/retirada exige valores e não pode alterar diretamente um ativo.');
    }
  } else if (eventType === 'dividend-received') {
    if (assetId === null || quantity !== null || unitPrice !== null || grossAmount === null || netAmount === null || reversesEventId !== null) {
      invalid('INVALID_EVENT', '$financialEvent', 'Provento recebido exige ativo e valores bruto/líquido confirmáveis.');
    }
  } else if (eventType === 'fee') {
    if (quantity !== null || unitPrice !== null || grossAmount !== null || netAmount !== null || costs === null || reversesEventId !== null) {
      invalid('INVALID_EVENT', '$financialEvent', 'Evento de custo exige campo costs e não deve duplicar um valor bruto/líquido.');
    }
  } else if (eventType === 'reversal') {
    if (reversesEventId === null || status === 'draft' || assetId !== null || quantity !== null || unitPrice !== null || grossAmount !== null || netAmount !== null || costs !== null) {
      invalid('INVALID_EVENT', '$financialEvent', 'Reversão deve ser um evento separado ligado ao original e sem valores duplicados.');
    }
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, eventId: identifier(r.eventId, '$financialEvent.eventId'), eventType, status,
    assetId, quantity, unitPrice, grossAmount, netAmount, costs, occurredAt,
    effectiveOn: civilDate(r.effectiveOn, '$financialEvent.effectiveOn'), recordedAt, reviewedAt, source, reversesEventId });
}

export function parseFinancialEvents(value: unknown) {
  const events = list(value, '$financialEvents', 5000).map(parseFinancialEvent);
  unique(events, event => event.eventId, '$financialEvents');
  unique(events.filter(event => event.source.externalOperationId !== null),
    event => `${event.source.sourceId}/${event.source.externalOperationId}`, '$financialEvents.externalOperationId');
  return freeze(events);
}

export function parseCashBalance(value: unknown) {
  const r = versionedRecord(value, '$cashBalance', ['balanceId', 'amount', 'asOf', 'basis', 'sourceEventIds']);
  const basis = enumeration(r.basis, '$cashBalance.basis', ['user-reported', 'derived-from-confirmed-events'] as const);
  const sourceEventIds = stringIds(r.sourceEventIds, '$cashBalance.sourceEventIds');
  if (basis === 'derived-from-confirmed-events' && sourceEventIds.length === 0) invalid('MISSING_PROVENANCE', '$cashBalance.sourceEventIds', 'Saldo derivado exige referências aos eventos usados.');
  return freeze({ schemaVersion: canonicalSchemaVersion, balanceId: identifier(r.balanceId, '$cashBalance.balanceId'),
    amount: money(r.amount, '$cashBalance.amount'), asOf: instant(r.asOf, '$cashBalance.asOf'), basis, sourceEventIds });
}

export function parseSourceDocument(value: unknown) {
  const r = versionedRecord(value, '$sourceDocument', ['documentId', 'sourceId', 'documentType', 'issuerId', 'endpointOrFile', 'recordReference', 'publishedAt', 'collectedAt', 'payloadRetention', 'hashRetention', 'payloadHash', 'parserVersion']);
  const payloadRetention = enumeration(r.payloadRetention, '$sourceDocument.payloadRetention', ['unknown', 'prohibited', 'allowed'] as const);
  const hashRetention = enumeration(r.hashRetention, '$sourceDocument.hashRetention', ['unknown', 'prohibited', 'allowed'] as const);
  const payloadHash = nullableText(r.payloadHash, '$sourceDocument.payloadHash', 64);
  if (payloadHash !== null && (!/^[a-f0-9]{64}$/.test(payloadHash) || hashRetention !== 'allowed')) {
    invalid('INVALID_RETENTION', '$sourceDocument.payloadHash', 'Hash SHA-256 só pode ser retido quando a permissão estiver explícita.');
  }
  const publishedAt = nullableInstant(r.publishedAt, '$sourceDocument.publishedAt');
  const collectedAt = instant(r.collectedAt, '$sourceDocument.collectedAt');
  if (publishedAt !== null) timestampOrder(publishedAt, collectedAt, '$sourceDocument');
  return freeze({ schemaVersion: canonicalSchemaVersion, documentId: identifier(r.documentId, '$sourceDocument.documentId'),
    sourceId: identifier(r.sourceId, '$sourceDocument.sourceId'), documentType: identifier(r.documentType, '$sourceDocument.documentType'),
    issuerId: nullableIdentifier(r.issuerId, '$sourceDocument.issuerId'), endpointOrFile: text(r.endpointOrFile, '$sourceDocument.endpointOrFile'),
    recordReference: nullableText(r.recordReference, '$sourceDocument.recordReference'), publishedAt, collectedAt,
    payloadRetention, hashRetention, payloadHash, parserVersion: identifier(r.parserVersion, '$sourceDocument.parserVersion') });
}

export function parseCollection(value: unknown) {
  const r = versionedRecord(value, '$collection', ['collectionId', 'sourceId', 'startedAt', 'completedAt', 'status', 'requestedAssetIds', 'successCount', 'failureCount', 'errors']);
  const startedAt = instant(r.startedAt, '$collection.startedAt');
  const completedAt = nullableInstant(r.completedAt, '$collection.completedAt');
  const status = enumeration(r.status, '$collection.status', ['running', 'succeeded', 'partial', 'failed', 'unknown'] as const);
  const requestedAssetIds = stringIds(r.requestedAssetIds, '$collection.requestedAssetIds', 500);
  const successCount = integer(r.successCount, '$collection.successCount', 0, requestedAssetIds.length);
  const failureCount = integer(r.failureCount, '$collection.failureCount', 0, requestedAssetIds.length);
  if (requestedAssetIds.length === 0 || successCount + failureCount > requestedAssetIds.length) invalid('INVALID_COLLECTION', '$collection', 'Lote deve conter ativos únicos e contagens compatíveis.');
  if (completedAt !== null) timestampOrder(startedAt, completedAt, '$collection.completedAt');
  const errors = list(r.errors, '$collection.errors', 500).map((item, index) => {
    const path = `$collection.errors.${index}`;
    const row = record(item, path, ['assetId', 'code', 'retryable']);
    return { assetId: nullableIdentifier(row.assetId, `${path}.assetId`), code: identifier(row.code, `${path}.code`),
      retryable: typeof row.retryable === 'boolean' ? row.retryable : invalid('INVALID_BOOLEAN', `${path}.retryable`, 'Campo booleano esperado.') };
  });
  const failuresByStatus = status === 'succeeded' ? failureCount !== 0 || successCount !== requestedAssetIds.length
    : status === 'partial' ? successCount === 0 || failureCount === 0 || successCount + failureCount !== requestedAssetIds.length
      : status === 'failed' ? successCount !== 0 || failureCount !== requestedAssetIds.length
        : false;
  if ((status === 'running' && completedAt !== null) || (['succeeded', 'partial', 'failed'].includes(status) && completedAt === null) || failuresByStatus) {
    invalid('INVALID_COLLECTION', '$collection.status', 'Estado terminal e contagens da coleta são inconsistentes.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, collectionId: identifier(r.collectionId, '$collection.collectionId'),
    sourceId: identifier(r.sourceId, '$collection.sourceId'), startedAt, completedAt, status, requestedAssetIds, successCount, failureCount, errors });
}

export function parseMarketObservation(value: unknown) {
  const r = versionedRecord(value, '$observation', ['observationId', 'assetId', 'requestedSymbol', 'returnedSymbol', 'semanticField', 'sourceField', 'originalValue', 'normalizedValue', 'unit', 'currency', 'period', 'marketAt', 'validUntil', 'publishedAt', 'collectedAt', 'sourceId', 'endpointOrFile', 'recordReference', 'hashRetention', 'payloadHash', 'parserVersion', 'state']);
  const originalValue = snapshot(r.originalValue);
  if (originalValue !== null && typeof originalValue === 'object') invalid('INVALID_SOURCE_VALUE', '$observation.originalValue', 'Valor original do campo deve ser escalar JSON.');
  const normalizedValue = r.normalizedValue === null ? null : exactDecimal(r.normalizedValue, '$observation.normalizedValue');
  const state = enumeration(r.state, '$observation.state', observationStates);
  if (['missing', 'invalid', 'source-unavailable'].includes(state) ? normalizedValue !== null : normalizedValue === null) {
    invalid('INVALID_OBSERVATION_STATE', '$observation.normalizedValue', 'Estado e presença do valor normalizado não concordam; zero é valor presente.');
  }
  if ((state === 'missing' && originalValue !== null) || (originalValue === null && normalizedValue !== null)) {
    invalid('INVALID_OBSERVATION_STATE', '$observation.originalValue', 'Valor de origem ausente não pode produzir normalização; dado malformado usa estado invalid.');
  }
  const unit = enumeration(r.unit, '$observation.unit', units);
  const observationCurrency = r.currency === null ? null : currency(r.currency, '$observation.currency');
  if (['currency', 'currency-per-share', 'currency-per-unit'].includes(unit) !== (observationCurrency !== null)) {
    invalid('INVALID_UNIT', '$observation.currency', 'Unidades monetárias exigem moeda explícita; unidades não monetárias não recebem moeda.');
  }
  const period = parseDatePeriod(r.period, '$observation.period');
  const marketAt = nullableInstant(r.marketAt, '$observation.marketAt');
  const validUntil = nullableInstant(r.validUntil, '$observation.validUntil');
  const publishedAt = nullableInstant(r.publishedAt, '$observation.publishedAt');
  const collectedAt = instant(r.collectedAt, '$observation.collectedAt');
  if (marketAt !== null) timestampOrder(marketAt, collectedAt, '$observation.marketAt');
  if (publishedAt !== null) timestampOrder(publishedAt, collectedAt, '$observation.publishedAt');
  if (marketAt !== null && validUntil !== null) timestampOrder(marketAt, validUntil, '$observation.validUntil');
  const payloadHash = nullableText(r.payloadHash, '$observation.payloadHash', 64);
  const hashRetention = enumeration(r.hashRetention, '$observation.hashRetention', ['unknown', 'prohibited', 'allowed'] as const);
  if (payloadHash !== null && (!/^[a-f0-9]{64}$/.test(payloadHash) || hashRetention !== 'allowed')) {
    invalid('INVALID_RETENTION', '$observation.payloadHash', 'Hash só pode ser retido quando a permissão estiver explícita.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, observationId: identifier(r.observationId, '$observation.observationId'),
    assetId: identifier(r.assetId, '$observation.assetId'), requestedSymbol: text(r.requestedSymbol, '$observation.requestedSymbol', 64),
    returnedSymbol: nullableText(r.returnedSymbol, '$observation.returnedSymbol', 64), semanticField: identifier(r.semanticField, '$observation.semanticField'),
    sourceField: text(r.sourceField, '$observation.sourceField', 128), originalValue, normalizedValue,
    unit, currency: observationCurrency, period, marketAt, validUntil, publishedAt, collectedAt,
    sourceId: identifier(r.sourceId, '$observation.sourceId'), endpointOrFile: text(r.endpointOrFile, '$observation.endpointOrFile'),
    recordReference: nullableText(r.recordReference, '$observation.recordReference'), hashRetention, payloadHash,
    parserVersion: identifier(r.parserVersion, '$observation.parserVersion'), state });
}

export function parseQualityAssessment(value: unknown) {
  const r = versionedRecord(value, '$qualityAssessment', ['assessmentId', 'observationId', 'state', 'reasonCodes', 'comparedObservationIds', 'assessedAt', 'policyVersion']);
  const state = enumeration(r.state, '$qualityAssessment.state', qualityStates);
  const comparedObservationIds = stringIds(r.comparedObservationIds, '$qualityAssessment.comparedObservationIds', 1000);
  const reasonCodes = stringIds(r.reasonCodes, '$qualityAssessment.reasonCodes', 100);
  if ((state !== 'fresh' && reasonCodes.length === 0) ||
      (['conflict', 'provider-revised'].includes(state) && comparedObservationIds.length === 0)) {
    invalid('INCOMPLETE_QUALITY_ASSESSMENT', '$qualityAssessment', 'Estado não fresco exige motivo; conflito/revisão exige observação comparada.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, assessmentId: identifier(r.assessmentId, '$qualityAssessment.assessmentId'),
    observationId: identifier(r.observationId, '$qualityAssessment.observationId'), state,
    reasonCodes, comparedObservationIds,
    assessedAt: instant(r.assessedAt, '$qualityAssessment.assessedAt'), policyVersion: identifier(r.policyVersion, '$qualityAssessment.policyVersion') });
}

export function parseTransformation(value: unknown) {
  const r = versionedRecord(value, '$transformation', ['transformationId', 'kind', 'operation', 'operationVersion', 'sourceObservationIds', 'inputValue', 'outputValue', 'inputUnit', 'inputCurrency', 'outputUnit', 'outputCurrency', 'appliedAt']);
  const sourceObservationIds = stringIds(r.sourceObservationIds, '$transformation.sourceObservationIds', 1000);
  if (sourceObservationIds.length === 0) invalid('MISSING_PROVENANCE', '$transformation.sourceObservationIds', 'Transformação exige observações de origem.');
  const inputUnit = enumeration(r.inputUnit, '$transformation.inputUnit', units);
  const inputCurrency = r.inputCurrency === null ? null : currency(r.inputCurrency, '$transformation.inputCurrency');
  const outputUnit = enumeration(r.outputUnit, '$transformation.outputUnit', units);
  const outputCurrency = r.outputCurrency === null ? null : currency(r.outputCurrency, '$transformation.outputCurrency');
  if (['currency', 'currency-per-share', 'currency-per-unit'].includes(inputUnit) !== (inputCurrency !== null) ||
      ['currency', 'currency-per-share', 'currency-per-unit'].includes(outputUnit) !== (outputCurrency !== null)) {
    invalid('INVALID_UNIT', '$transformation', 'Unidade e moeda de entrada/saída são inconsistentes.');
  }
  const kind = enumeration(r.kind, '$transformation.kind', ['normalization', 'currency-conversion', 'corporate-action', 'adjustment'] as const);
  if (kind === 'currency-conversion' && (inputCurrency === null || outputCurrency === null || inputCurrency === outputCurrency)) {
    invalid('INVALID_CONVERSION', '$transformation', 'Conversão cambial exige moedas de entrada e saída distintas.');
  }
  return freeze({ schemaVersion: canonicalSchemaVersion, transformationId: identifier(r.transformationId, '$transformation.transformationId'), kind,
    operation: identifier(r.operation, '$transformation.operation'), operationVersion: identifier(r.operationVersion, '$transformation.operationVersion'),
    sourceObservationIds, inputValue: exactDecimal(r.inputValue, '$transformation.inputValue'), outputValue: exactDecimal(r.outputValue, '$transformation.outputValue'),
    inputUnit, inputCurrency, outputUnit, outputCurrency, appliedAt: instant(r.appliedAt, '$transformation.appliedAt') });
}

export function parsePortfolioSnapshot(value: unknown) {
  const r = versionedRecord(value, '$portfolioSnapshot', ['snapshotId', 'asOf', 'baseCurrency', 'openingPositionIds', 'confirmedEventIds', 'cashBalances', 'valuations', 'observationIds', 'classificationIds', 'compositionIds', 'transformationIds', 'qualityAssessmentIds', 'policyVersion']);
  const asOf = instant(r.asOf, '$portfolioSnapshot.asOf');
  const baseCurrency = currency(r.baseCurrency, '$portfolioSnapshot.baseCurrency');
  const cashBalances = list(r.cashBalances, '$portfolioSnapshot.cashBalances', 100).map(parseCashBalance);
  unique(cashBalances, item => item.amount.currency, '$portfolioSnapshot.cashBalances');
  if (cashBalances.some(item => instantIsAfter(item.asOf, asOf))) invalid('INVALID_PERIOD', '$portfolioSnapshot.cashBalances', 'Saldo de caixa posterior à data-base do snapshot.');
  const valuations = list(r.valuations, '$portfolioSnapshot.valuations', 1000).map((item, index) => {
    const path = `$portfolioSnapshot.valuations.${index}`;
    const row = record(item, path, ['assetId', 'quantity', 'currency', 'localMarketValue', 'baseMarketValue', 'priceObservationId', 'fxObservationId', 'state']);
    const state = enumeration(row.state, `${path}.state`, ['valued', 'missing-price', 'missing-fx', 'invalid', 'unavailable'] as const);
    const localMarketValue = row.localMarketValue === null ? null : money(row.localMarketValue, `${path}.localMarketValue`, false);
    const baseMarketValue = row.baseMarketValue === null ? null : money(row.baseMarketValue, `${path}.baseMarketValue`, false);
    const priceObservationId = nullableIdentifier(row.priceObservationId, `${path}.priceObservationId`);
    const fxObservationId = nullableIdentifier(row.fxObservationId, `${path}.fxObservationId`);
    const positionCurrency = currency(row.currency, `${path}.currency`);
    if (state === 'valued') {
      if (localMarketValue === null || baseMarketValue === null || priceObservationId === null ||
          (positionCurrency === baseCurrency && fxObservationId !== null)) {
        invalid('INVALID_VALUATION_SNAPSHOT', path, 'Valoração exige valores local/base, preço e FX apenas para moeda estrangeira.');
      }
      if (positionCurrency !== baseCurrency && fxObservationId === null) {
        invalid('MISSING_FX', path, 'Ativo em moeda diferente da base exige referência explícita de câmbio.');
      }
    } else if (state === 'missing-fx') {
      if (positionCurrency === baseCurrency || localMarketValue === null || priceObservationId === null ||
          baseMarketValue !== null || fxObservationId !== null) {
        invalid('INVALID_VALUATION_SNAPSHOT', path, 'Falta de FX exige valor local com preço, sem valor-base ou FX.');
      }
    } else if (localMarketValue !== null || baseMarketValue !== null || priceObservationId !== null || fxObservationId !== null) {
      invalid('INVALID_VALUATION_SNAPSHOT', path, 'Estado sem valoração exige valores e referências monetárias nulos.');
    }
    if (localMarketValue !== null && positionCurrency !== localMarketValue.currency) {
      invalid('CURRENCY_MISMATCH', path, 'Moeda da posição e do valor local divergem.');
    }
    if (baseMarketValue !== null && baseMarketValue.currency !== baseCurrency) {
      invalid('CURRENCY_MISMATCH', path, 'Valor convertido deve usar a moeda-base do snapshot.');
    }
    return { assetId: identifier(row.assetId, `${path}.assetId`), quantity: exactDecimal(row.quantity, `${path}.quantity`, false),
      currency: positionCurrency, localMarketValue, baseMarketValue, priceObservationId, fxObservationId, state };
  });
  unique(valuations, item => item.assetId, '$portfolioSnapshot.valuations');
  return freeze({ schemaVersion: canonicalSchemaVersion, snapshotId: identifier(r.snapshotId, '$portfolioSnapshot.snapshotId'), asOf,
    baseCurrency, openingPositionIds: stringIds(r.openingPositionIds, '$portfolioSnapshot.openingPositionIds'),
    confirmedEventIds: stringIds(r.confirmedEventIds, '$portfolioSnapshot.confirmedEventIds'), cashBalances, valuations,
    observationIds: stringIds(r.observationIds, '$portfolioSnapshot.observationIds'),
    classificationIds: stringIds(r.classificationIds, '$portfolioSnapshot.classificationIds'),
    compositionIds: stringIds(r.compositionIds, '$portfolioSnapshot.compositionIds'),
    transformationIds: stringIds(r.transformationIds, '$portfolioSnapshot.transformationIds'),
    qualityAssessmentIds: stringIds(r.qualityAssessmentIds, '$portfolioSnapshot.qualityAssessmentIds'),
    policyVersion: identifier(r.policyVersion, '$portfolioSnapshot.policyVersion') });
}

export function parseRecommendationSnapshot(value: unknown) {
  const r = versionedRecord(value, '$recommendationSnapshot', ['recommendationId', 'decisionId', 'generatedAt', 'engineVersion', 'policyVersion', 'portfolioSnapshot', 'inputSnapshot', 'outputSnapshot', 'observationIds']);
  const portfolioSnapshot = parsePortfolioSnapshot(r.portfolioSnapshot);
  const inputSnapshot = jsonObject(r.inputSnapshot, '$recommendationSnapshot.inputSnapshot');
  const outputSnapshot = jsonObject(r.outputSnapshot, '$recommendationSnapshot.outputSnapshot');
  return Object.freeze({ schemaVersion: canonicalSchemaVersion, recommendationId: identifier(r.recommendationId, '$recommendationSnapshot.recommendationId'),
    decisionId: identifier(r.decisionId, '$recommendationSnapshot.decisionId'), generatedAt: instant(r.generatedAt, '$recommendationSnapshot.generatedAt'),
    engineVersion: identifier(r.engineVersion, '$recommendationSnapshot.engineVersion'), policyVersion: identifier(r.policyVersion, '$recommendationSnapshot.policyVersion'),
    portfolioSnapshot, inputSnapshot, outputSnapshot,
    observationIds: Object.freeze(stringIds(r.observationIds, '$recommendationSnapshot.observationIds')) });
}

export type CanonicalAsset = ReturnType<typeof parseCanonicalAsset>;
export type CanonicalClassification = ReturnType<typeof parseCanonicalClassification>;
export type FundComposition = ReturnType<typeof parseFundComposition>;
export type OpeningPosition = ReturnType<typeof parseOpeningPosition>;
export type FinancialEvent = ReturnType<typeof parseFinancialEvent>;
export type CashBalance = ReturnType<typeof parseCashBalance>;
export type SourceDocument = ReturnType<typeof parseSourceDocument>;
export type Collection = ReturnType<typeof parseCollection>;
export type MarketObservation = ReturnType<typeof parseMarketObservation>;
export type QualityAssessment = ReturnType<typeof parseQualityAssessment>;
export type Transformation = ReturnType<typeof parseTransformation>;
export type PortfolioSnapshot = ReturnType<typeof parsePortfolioSnapshot>;
export type RecommendationSnapshot = ReturnType<typeof parseRecommendationSnapshot>;
