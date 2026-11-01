import { invalid } from './errors';
import { civilDate, enumeration, freeze, identifier, integer, list, record, signedDecimal, text, unique } from './validation';

export const CANONICAL_CONTRACT_VERSION = '1.0' as const;

const stableSchemes = ['cnpj', 'isin', 'figi', 'lei', 'cusip'] as const;
const identifierSchemes = [...stableSchemes, 'cvm-code', 'ticker'] as const;
const noValueStatuses = ['missing-price', 'missing', 'invalid', 'unavailable', 'source-unavailable'] as const;
const observationStatuses = [...noValueStatuses, 'fresh', 'stale', 'conflict', 'provider-revised', 'unknown-publication-time'] as const;
type StableScheme = typeof stableSchemes[number];
type Currency = string;
type Decimal = string;

function object(value: unknown, path: string, keys: readonly string[]) {
  return record(value, path, keys);
}

function contractVersion(value: Record<string, unknown>, path: string): typeof CANONICAL_CONTRACT_VERSION {
  return enumeration(value.schemaVersion, `${path}.schemaVersion`, [CANONICAL_CONTRACT_VERSION]);
}

function stableIdentifier(value: unknown, path: string) {
  const r = object(value, path, ['scheme', 'value']);
  const scheme = enumeration(r.scheme, `${path}.scheme`, identifierSchemes);
  return { scheme, value: text(r.value, `${path}.value`, 128) };
}

function isStableIdentifier(scheme: string): scheme is StableScheme {
  return (stableSchemes as readonly string[]).includes(scheme);
}

function parseIdentifiers(value: unknown, path: string) {
  const items = list(value, path, 32).map((item, index) => stableIdentifier(item, `${path}[${index}]`));
  unique(items, item => `${item.scheme}:${item.value}`, path);
  return items;
}

function optionalId(value: unknown, path: string): string | null {
  return value === null ? null : identifier(value, path);
}

function optionalText(value: unknown, path: string, max = 2048): string | null {
  return value === null ? null : text(value, path, max);
}

function safeReference(value: unknown, path: string, max = 2048): string {
  const result = text(value, path, max);
  if (/[?#]/.test(result) || /:\/\/[^/\s]*@/.test(result) || /(?:api[_-]?key|access[_-]?token|secret|authorization)\s*[:=]|sk_[a-z0-9]{24,}/i.test(result)) {
    invalid('SENSITIVE_REFERENCE', path, 'Referência não pode conter query, autenticação ou credencial.');
  }
  return result;
}

function currencyCode(value: unknown, path: string): Currency {
  const result = text(value, path, 3);
  if (!/^[A-Z]{3}$/.test(result)) invalid('INVALID_CURRENCY', path, 'Moeda deve usar código alfabético ISO 4217 de três letras.');
  return result;
}

function optionalCurrency(value: unknown, path: string): Currency | null {
  return value === null ? null : currencyCode(value, path);
}

function decimal(value: unknown, path: string): Decimal {
  return signedDecimal(value, path);
}

function nonnegativeDecimal(value: unknown, path: string): Decimal {
  const parsed = decimal(value, path);
  if (parsed.startsWith('-')) invalid('INVALID_DECIMAL', path, 'Este valor não pode ser negativo.');
  return parsed;
}

function positiveDecimal(value: unknown, path: string): Decimal {
  const parsed = nonnegativeDecimal(value, path);
  if (/^0(?:\.0+)?$/.test(parsed)) invalid('INVALID_DECIMAL', path, 'Este valor deve ser positivo.');
  return parsed;
}

function scaledDecimal(value: unknown, scaleValue: unknown, path: string): { amount: Decimal; scale: number } {
  const amount = decimal(value, path);
  const scale = integer(scaleValue, `${path}.scale`, 0, 8);
  const fractionalDigits = amount.split('.')[1]?.length ?? 0;
  if (fractionalDigits !== scale) invalid('INVALID_DECIMAL_SCALE', `${path}.scale`, 'A escala deve corresponder às casas decimais representadas.');
  return { amount, scale };
}

function optionalScaledDecimal(value: unknown, scaleValue: unknown, path: string) {
  if (value === null && scaleValue === null) return { amount: null, scale: null };
  if (value === null || scaleValue === null) invalid('INVALID_DECIMAL_SCALE', path, 'Valor e escala devem estar ausentes ou presentes juntos.');
  return scaledDecimal(value, scaleValue, path);
}

function decimalUnits(value: string): bigint {
  const fractionalDigits = value.split('.')[1]?.length ?? 0;
  return BigInt(value.replace('.', '')) * 10n ** BigInt(8 - fractionalDigits);
}

function hash(value: unknown, path: string): string | null {
  if (value === null) return null;
  const result = text(value, path, 64);
  if (!/^[a-f0-9]{64}$/i.test(result)) invalid('INVALID_HASH', path, 'Hash deve ser SHA-256 hexadecimal.');
  return result.toLowerCase();
}

function instant(value: unknown, path: string): string {
  const result = text(value, path, 64);
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(result);
  if (!match) invalid('INVALID_TIMESTAMP', path, 'Timestamp deve ser ISO-8601 com fuso explícito.');
  civilDate(match[1], path);
  if (match[5] && match[5].length > 3) {
    invalid('INVALID_TIMESTAMP_PRECISION', path, 'Precisão acima de milissegundos não é aceita neste contrato.');
  }
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  const zone = match[6];
  if (hour > 23 || minute > 59 || second > 59 || !zone) invalid('INVALID_TIMESTAMP', path, 'Timestamp fora do intervalo.');
  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
      invalid('INVALID_TIMESTAMP', path, 'Offset de fuso fora do intervalo.');
    }
  }
  if (!Number.isFinite(Date.parse(result))) invalid('INVALID_TIMESTAMP', path, 'Timestamp inválido.');
  return result;
}

function nullableInstant(value: unknown, path: string): string | null {
  return value === null ? null : instant(value, path);
}

function assertNotAfter(earlier: string | null, later: string | null, path: string, code = 'INVALID_TIMESTAMP_ORDER'): void {
  if (earlier !== null && later !== null && Date.parse(earlier) > Date.parse(later)) {
    invalid(code, path, 'A ordem temporal explícita é inconsistente.');
  }
}

function money(value: unknown, path: string, nullable = false) {
  if (value === null && nullable) return null;
  const r = object(value, path, ['amount', 'currency', 'scale']);
  const amount = scaledDecimal(r.amount, r.scale, `${path}.amount`);
  return { amount: amount.amount, scale: amount.scale, currency: currencyCode(r.currency, `${path}.currency`) };
}

function currencyAmount(value: unknown, path: string) {
  const r = object(value, path, ['currency', 'amount', 'scale']);
  const amount = scaledDecimal(r.amount, r.scale, `${path}.amount`);
  return { currency: currencyCode(r.currency, `${path}.currency`), amount: amount.amount, scale: amount.scale };
}

function stringList(value: unknown, path: string, max = 5000, required = false) {
  const items = list(value, path, max).map((item, index) => identifier(item, `${path}[${index}]`));
  unique(items, item => item, path);
  if (required && items.length === 0) invalid('EMPTY_LIST', path, 'A lista não pode ficar vazia.');
  return items;
}

export function parseAsset(value: unknown) {
  const path = 'asset';
  const r = object(value, path, ['schemaVersion', 'assetId', 'issuerId', 'identifiers', 'symbols', 'names', 'assetType', 'classification', 'resolutionStatus']);
  const schemaVersion = contractVersion(r, path);
  const assetId = identifier(r.assetId, `${path}.assetId`);
  const issuerId = optionalId(r.issuerId, `${path}.issuerId`);
  const identifiers = parseIdentifiers(r.identifiers, `${path}.identifiers`);
  const symbolsRecord = object(r.symbols, `${path}.symbols`, ['requested', 'provider']);
  const symbols = { requested: text(symbolsRecord.requested, `${path}.symbols.requested`, 64),
    provider: optionalText(symbolsRecord.provider, `${path}.symbols.provider`, 64) };
  const namesRecord = object(r.names, `${path}.names`, ['requested', 'provider']);
  const names = { requested: optionalText(namesRecord.requested, `${path}.names.requested`, 256),
    provider: optionalText(namesRecord.provider, `${path}.names.provider`, 256) };
  const assetType = enumeration(r.assetType, `${path}.assetType`, ['equity', 'fii', 'etf', 'fund', 'bond', 'cash', 'other']);
  const c = object(r.classification, `${path}.classification`, ['assetClass', 'sector', 'industry', 'countryOfRisk', 'currency']);
  const classification = {
    assetClass: text(c.assetClass, `${path}.classification.assetClass`, 64),
    sector: optionalText(c.sector, `${path}.classification.sector`, 128),
    industry: optionalText(c.industry, `${path}.classification.industry`, 128),
    countryOfRisk: text(c.countryOfRisk, `${path}.classification.countryOfRisk`, 2),
    currency: optionalCurrency(c.currency, `${path}.classification.currency`)
  };
  if (!/^[A-Z]{2}$/.test(classification.countryOfRisk)) invalid('INVALID_COUNTRY', `${path}.classification.countryOfRisk`, 'Use código ISO alpha-2.');
  const resolutionStatus = enumeration(r.resolutionStatus, `${path}.resolutionStatus`, ['resolved', 'unresolved']);
  const hasStableIdentity = issuerId !== null || identifiers.some(item => isStableIdentifier(item.scheme));
  if (resolutionStatus === 'resolved' && !hasStableIdentity) {
    invalid('UNRESOLVED_ASSET_IDENTITY', path, 'Ticker não comprova identidade estável do ativo.');
  }
  return freeze({ schemaVersion, assetId, issuerId, identifiers, symbols, names, assetType, classification, resolutionStatus });
}

export function parseFundComposition(value: unknown) {
  const path = 'fundComposition';
  const r = object(value, path, ['schemaVersion', 'compositionId', 'fundAssetId', 'effectiveAsOf', 'sourceDocumentId', 'unclassifiedWeight', 'components']);
  const schemaVersion = contractVersion(r, path);
  const compositionId = identifier(r.compositionId, `${path}.compositionId`);
  const fundAssetId = identifier(r.fundAssetId, `${path}.fundAssetId`);
  const effectiveAsOf = civilDate(r.effectiveAsOf, `${path}.effectiveAsOf`);
  const sourceDocumentId = identifier(r.sourceDocumentId, `${path}.sourceDocumentId`);
  const unclassifiedWeight = nonnegativeDecimal(r.unclassifiedWeight, `${path}.unclassifiedWeight`);
  if (decimalUnits(unclassifiedWeight) > 100_000_000n) invalid('INVALID_COMPOSITION_WEIGHT', `${path}.unclassifiedWeight`, 'Peso deve estar entre zero e um.');
  const components = list(r.components, `${path}.components`, 5000).map((entry, index) => {
    const itemPath = `${path}.components[${index}]`;
    const item = object(entry, itemPath, ['componentId', 'assetId', 'identifiers', 'weight', 'currency']);
    const componentId = identifier(item.componentId, `${itemPath}.componentId`);
    const assetId = optionalId(item.assetId, `${itemPath}.assetId`);
    const identifiers = parseIdentifiers(item.identifiers, `${itemPath}.identifiers`);
    if (assetId === null && !identifiers.some(identifierValue => isStableIdentifier(identifierValue.scheme))) {
      invalid('UNRESOLVED_ASSET_IDENTITY', itemPath, 'Componente precisa de assetId conhecido ou identificador estável.');
    }
    const weight = nonnegativeDecimal(item.weight, `${itemPath}.weight`);
    if (decimalUnits(weight) > 100_000_000n) invalid('INVALID_COMPOSITION_WEIGHT', `${itemPath}.weight`, 'Peso deve estar entre zero e um.');
    return { componentId, assetId, identifiers, weight, currency: optionalCurrency(item.currency, `${itemPath}.currency`) };
  });
  unique(components, item => item.componentId, `${path}.components`);
  const totalWeight = components.reduce((sum, item) => sum + decimalUnits(item.weight), decimalUnits(unclassifiedWeight));
  if (totalWeight !== 100_000_000n) invalid('INVALID_COMPOSITION_WEIGHT', path, 'Pesos classificados e não classificados devem somar exatamente um.');
  return freeze({ schemaVersion, compositionId, fundAssetId, effectiveAsOf, sourceDocumentId, unclassifiedWeight, components });
}

export function parseOpeningPosition(value: unknown) {
  const path = 'openingPosition';
  const r = object(value, path, ['schemaVersion', 'positionId', 'assetId', 'quantity', 'quantityUnit', 'openedOn', 'costBasis', 'sourceDocumentId']);
  const schemaVersion = contractVersion(r, path);
  const quantity = positiveDecimal(r.quantity, `${path}.quantity`);
  return freeze({ schemaVersion, positionId: identifier(r.positionId, `${path}.positionId`),
    assetId: identifier(r.assetId, `${path}.assetId`), quantity,
    quantityUnit: enumeration(r.quantityUnit, `${path}.quantityUnit`, ['share', 'unit', 'contract']),
    openedOn: civilDate(r.openedOn, `${path}.openedOn`), costBasis: money(r.costBasis, `${path}.costBasis`, true),
    sourceDocumentId: identifier(r.sourceDocumentId, `${path}.sourceDocumentId`) });
}

export function parseFinancialEvent(value: unknown) {
  const path = 'financialEvent';
  const keys = ['schemaVersion', 'eventId', 'type', 'status', 'assetId', 'quantity', 'quantityUnit', 'price', 'grossValue', 'netValue',
    'fees', 'occurredOn', 'occurredAt', 'source', 'confirmedAt', 'reversesEventId', 'reversedByEventId'];
  const r = object(value, path, keys);
  const schemaVersion = contractVersion(r, path);
  const type = enumeration(r.type, `${path}.type`, ['external-contribution', 'withdrawal', 'purchase', 'sale', 'dividend-received', 'fee', 'reversal']);
  const status = enumeration(r.status, `${path}.status`, ['draft', 'imported-pending', 'confirmed', 'reversed']);
  const assetId = optionalId(r.assetId, `${path}.assetId`);
  const quantity = r.quantity === null ? null : positiveDecimal(r.quantity, `${path}.quantity`);
  const quantityUnit = r.quantityUnit === null ? null : enumeration(r.quantityUnit, `${path}.quantityUnit`, ['share', 'unit', 'contract']);
  const price = money(r.price, `${path}.price`, true);
  const grossValue = money(r.grossValue, `${path}.grossValue`, true);
  const netValue = money(r.netValue, `${path}.netValue`, true);
  const fees = money(r.fees, `${path}.fees`, true);
  const occurredOn = civilDate(r.occurredOn, `${path}.occurredOn`);
  const occurredAt = nullableInstant(r.occurredAt, `${path}.occurredAt`);
  const sourceRecord = object(r.source, `${path}.source`, ['kind', 'sourceId', 'externalId']);
  const source = { kind: enumeration(sourceRecord.kind, `${path}.source.kind`, ['manual', 'provider']),
    sourceId: identifier(sourceRecord.sourceId, `${path}.source.sourceId`),
    externalId: optionalText(sourceRecord.externalId, `${path}.source.externalId`, 128) };
  if (source.kind === 'provider' && source.externalId === null) invalid('INVALID_EVENT_SOURCE', `${path}.source`, 'Evento importado exige identificador externo.');
  const confirmedAt = nullableInstant(r.confirmedAt, `${path}.confirmedAt`);
  const reversesEventId = optionalId(r.reversesEventId, `${path}.reversesEventId`);
  const reversedByEventId = optionalId(r.reversedByEventId, `${path}.reversedByEventId`);
  if ((status === 'confirmed' || status === 'reversed') !== (confirmedAt !== null)) {
    invalid('INVALID_EVENT_STATUS', path, 'Confirmação temporal deve coincidir com estado confirmado/estornado.');
  }
  if ((status === 'reversed') !== (reversedByEventId !== null)) {
    invalid('INVALID_EVENT_REVERSAL', path, 'Evento estornado exige referência ao evento de estorno e vice-versa.');
  }
  if ((type === 'reversal') !== (reversesEventId !== null)) {
    invalid('INVALID_EVENT_REVERSAL', path, 'Evento de estorno exige referência ao evento original.');
  }
  const eventId = identifier(r.eventId, `${path}.eventId`);
  if (reversesEventId === eventId || reversedByEventId === eventId) invalid('INVALID_EVENT_REVERSAL', path, 'Evento não pode referenciar a si próprio como estorno.');

  const trade = type === 'purchase' || type === 'sale';
  const assetRequired = trade || type === 'dividend-received';
  const assetForbidden = type === 'external-contribution' || type === 'withdrawal';
  if ((assetRequired && assetId === null) || (assetForbidden && assetId !== null)) {
    invalid('INVALID_EVENT_SHAPE', path, 'Tipo de evento e ativo associado são incompatíveis.');
  }
  if (trade) {
    if (quantity === null || quantityUnit === null || price === null || grossValue === null || netValue === null || fees === null) {
      invalid('INVALID_EVENT_SHAPE', path, 'Compra e venda exigem quantidade, preço, valores bruto/líquido e custos.');
    }
  } else if (type === 'dividend-received') {
    if (quantity !== null || quantityUnit !== null || price !== null || grossValue === null || netValue === null || fees === null) {
      invalid('INVALID_EVENT_SHAPE', path, 'Provento recebido exige ativo, valor bruto/líquido e custos, sem quantidade/preço de compra.');
    }
  } else if (type === 'reversal') {
    if (grossValue === null || netValue === null || fees === null || (quantity === null) !== (quantityUnit === null)) {
      invalid('INVALID_EVENT_SHAPE', path, 'Estorno exige valores monetários e quantidade/unidade coerentes.');
    }
  } else if (type === 'fee') {
    if (quantity !== null || quantityUnit !== null || price !== null || grossValue === null || netValue === null || fees === null) {
      invalid('INVALID_EVENT_SHAPE', path, 'Custo exige valores monetários e não representa quantidade/preço de ativo.');
    }
  } else if (assetId !== null || quantity !== null || quantityUnit !== null || price !== null || grossValue === null || netValue === null || fees === null) {
    invalid('INVALID_EVENT_SHAPE', path, 'Aporte, retirada e custo exigem valores monetários sem ativo/quantidade/preço.');
  }
  const eventCurrencies = [price, grossValue, netValue, fees].filter((entry): entry is NonNullable<typeof entry> => entry !== null).map(entry => entry.currency);
  if (eventCurrencies.some(currency => currency !== eventCurrencies[0])) invalid('INVALID_EVENT_CURRENCY', path, 'Valores do mesmo evento devem usar uma única moeda.');
  if (type !== 'reversal') {
    for (const [field, amount] of [['price', price], ['grossValue', grossValue], ['netValue', netValue], ['fees', fees]] as const) {
      if (amount !== null) nonnegativeDecimal(amount.amount, `${path}.${field}.amount`);
    }
  }
  return freeze({ schemaVersion, eventId, type, status, assetId, quantity, quantityUnit, price, grossValue, netValue, fees,
    occurredOn, occurredAt, source, confirmedAt, reversesEventId, reversedByEventId });
}

export function parseFinancialEvents(value: unknown) {
  const events = list(value, 'financialEvents', 5000).map(parseFinancialEvent);
  unique(events, event => event.eventId, 'financialEvents');
  const providerIds = new Set<string>();
  const byId = new Map(events.map(event => [event.eventId, event]));
  for (const event of events) {
    if (event.source.kind === 'provider' && event.source.externalId !== null) {
      const key = `${event.source.sourceId}:${event.source.externalId}`;
      if (providerIds.has(key)) invalid('DUPLICATE_EXTERNAL_EVENT', 'financialEvents', 'Identificador externo já foi importado para esta fonte.');
      providerIds.add(key);
    }
    if (event.status === 'reversed') {
      const reversal = event.reversedByEventId ? byId.get(event.reversedByEventId) : undefined;
      if (!reversal || reversal.type !== 'reversal' || reversal.reversesEventId !== event.eventId || reversal.status !== 'confirmed') {
        invalid('INVALID_EVENT_REVERSAL', 'financialEvents', 'Evento estornado exige evento de estorno confirmado e vinculado.');
      }
    }
    if (event.type === 'reversal' && event.status === 'confirmed') {
      const original = event.reversesEventId ? byId.get(event.reversesEventId) : undefined;
      if (!original || original.status !== 'reversed' || original.reversedByEventId !== event.eventId) {
        invalid('INVALID_EVENT_REVERSAL', 'financialEvents', 'Estorno confirmado exige vínculo recíproco com o evento original.');
      }
    }
  }
  return freeze(events);
}

export function parseCashBalance(value: unknown) {
  const path = 'cashBalance';
  const r = object(value, path, ['schemaVersion', 'portfolioId', 'currency', 'amount', 'scale', 'asOf', 'sourceDocumentId']);
  const schemaVersion = contractVersion(r, path);
  const amount = scaledDecimal(r.amount, r.scale, `${path}.amount`);
  return freeze({ schemaVersion, portfolioId: identifier(r.portfolioId, `${path}.portfolioId`),
    currency: currencyCode(r.currency, `${path}.currency`), amount: amount.amount, scale: amount.scale,
    asOf: civilDate(r.asOf, `${path}.asOf`), sourceDocumentId: identifier(r.sourceDocumentId, `${path}.sourceDocumentId`) });
}

function parsePeriod(value: unknown, path: string) {
  const r = object(value, path, ['kind', 'start', 'end']);
  const kind = enumeration(r.kind, `${path}.kind`, ['spot', 'annual', 'quarterly', 'ttm', 'range']);
  const start = r.start === null ? null : civilDate(r.start, `${path}.start`);
  const end = r.end === null ? null : civilDate(r.end, `${path}.end`);
  if (kind === 'spot') {
    if (start !== null || end !== null) invalid('INVALID_PERIOD', path, 'Observação spot não possui período econômico.');
  } else if (start === null || end === null || start > end) {
    invalid('INVALID_PERIOD', path, 'Período econômico exige início e fim coerentes.');
  }
  return { kind, start, end };
}

export function parseMarketObservation(value: unknown) {
  const path = 'marketObservation';
  const keys = ['schemaVersion', 'observationId', 'assetId', 'semanticField', 'dataKind', 'originalField', 'originalValue', 'originalScale', 'normalizedValue', 'normalizedScale', 'transformationIds', 'unit',
    'currency', 'period', 'marketAt', 'marketDate', 'validUntil', 'publishedAt', 'collectedAt', 'providerRevisedAt', 'publicationTimeStatus',
    'symbols',
    'sourceId', 'endpoint', 'providerRecordRef', 'payloadHash', 'parserVersion', 'status'];
  const r = object(value, path, keys);
  const schemaVersion = contractVersion(r, path);
  const observationId = identifier(r.observationId, `${path}.observationId`);
  const assetId = identifier(r.assetId, `${path}.assetId`);
  const semanticField = text(r.semanticField, `${path}.semanticField`, 128);
  const dataKind = enumeration(r.dataKind, `${path}.dataKind`, ['supplied', 'derived', 'adjusted']);
  const originalField = optionalText(r.originalField, `${path}.originalField`, 128);
  const original = optionalScaledDecimal(r.originalValue, r.originalScale, `${path}.originalValue`);
  const normalized = optionalScaledDecimal(r.normalizedValue, r.normalizedScale, `${path}.normalizedValue`);
  const originalValue = original.amount;
  const originalScale = original.scale;
  const normalizedValue = normalized.amount;
  const normalizedScale = normalized.scale;
  const transformationIds = stringList(r.transformationIds, `${path}.transformationIds`, 1000);
  const unit = enumeration(r.unit, `${path}.unit`, ['money', 'ratio', 'percent', 'percentage-points', 'count', 'shares', 'days']);
  const currency = optionalCurrency(r.currency, `${path}.currency`);
  const period = parsePeriod(r.period, `${path}.period`);
  const marketAt = nullableInstant(r.marketAt, `${path}.marketAt`);
  const marketDate = r.marketDate === null ? null : civilDate(r.marketDate, `${path}.marketDate`);
  const validUntil = nullableInstant(r.validUntil, `${path}.validUntil`);
  const publishedAt = nullableInstant(r.publishedAt, `${path}.publishedAt`);
  const collectedAt = instant(r.collectedAt, `${path}.collectedAt`);
  const providerRevisedAt = nullableInstant(r.providerRevisedAt, `${path}.providerRevisedAt`);
  const publicationTimeStatus = enumeration(r.publicationTimeStatus, `${path}.publicationTimeStatus`, ['known', 'unknown']);
  const symbolsRecord = object(r.symbols, `${path}.symbols`, ['requested', 'provider']);
  const symbols = { requested: text(symbolsRecord.requested, `${path}.symbols.requested`, 64),
    provider: optionalText(symbolsRecord.provider, `${path}.symbols.provider`, 64) };
  const sourceId = identifier(r.sourceId, `${path}.sourceId`);
  const endpoint = safeReference(r.endpoint, `${path}.endpoint`, 512);
  const providerRecordRef = r.providerRecordRef === null ? null : safeReference(r.providerRecordRef, `${path}.providerRecordRef`, 512);
  const payloadHash = hash(r.payloadHash, `${path}.payloadHash`);
  const parserVersion = text(r.parserVersion, `${path}.parserVersion`, 64);
  const status = enumeration(r.status, `${path}.status`, observationStatuses);
  assertNotAfter(marketAt, collectedAt, path);
  assertNotAfter(publishedAt, collectedAt, path);
  assertNotAfter(marketAt, validUntil, path, 'INVALID_VALIDITY_WINDOW');
  if ((publishedAt === null) !== (publicationTimeStatus === 'unknown')) {
    invalid('INVALID_PUBLICATION_TIME', path, 'Disponibilidade do horário de publicação deve permanecer explícita.');
  }
  if ((currency !== null && unit !== 'money') || (normalizedValue !== null && unit === 'money' && currency === null)) {
    invalid('INVALID_OBSERVATION_UNIT', path, 'Moeda e valor devem corresponder à unidade monetária.');
  }
  if ((noValueStatuses as readonly string[]).includes(status)) {
    if (originalValue !== null || normalizedValue !== null || originalScale !== null || normalizedScale !== null || currency !== null) {
      invalid('PARTIAL_VALUATION', path, 'Observação sem valor não pode conter valores, escalas ou moeda.');
    }
  } else {
    if (normalizedValue === null || normalizedScale === null) invalid('MISSING_OBSERVATION_VALUE', path, 'Estado com observação exige valor e escala normalizados.');
    if (dataKind === 'supplied' && (originalValue === null || originalScale === null || originalField === null || transformationIds.length !== 0)) {
      invalid('INVALID_OBSERVATION_PROVENANCE', path, 'Dado fornecido exige campo/valor original e não pode declarar transformação.');
    }
    if (dataKind === 'supplied' && originalValue !== null && decimalUnits(originalValue) !== decimalUnits(normalizedValue)) {
      invalid('INVALID_OBSERVATION_PROVENANCE', path, 'Valor fornecido deve ser numericamente igual ao valor original.');
    }
    if (dataKind === 'derived' && (originalValue !== null || originalScale !== null || originalField !== null || transformationIds.length === 0)) {
      invalid('INVALID_OBSERVATION_PROVENANCE', path, 'Dado derivado exige transformação e não pode fingir um campo/valor original.');
    }
    if (dataKind === 'adjusted' && (originalValue === null || originalScale === null || originalField === null || transformationIds.length === 0)) {
      invalid('INVALID_OBSERVATION_PROVENANCE', path, 'Dado ajustado exige valor original e transformação vinculada.');
    }
  }
  if (unit === 'money' && /price/i.test(semanticField)) {
    if (normalizedValue !== null) positiveDecimal(normalizedValue, `${path}.normalizedValue`);
    if (originalValue !== null) positiveDecimal(originalValue, `${path}.originalValue`);
  }
  return freeze({ schemaVersion, observationId, assetId, semanticField, dataKind, originalField, originalValue, originalScale,
    normalizedValue, normalizedScale, transformationIds, unit, currency,
    period, marketAt, marketDate, validUntil, publishedAt, collectedAt, providerRevisedAt, publicationTimeStatus, symbols, sourceId, endpoint,
    providerRecordRef, payloadHash, parserVersion, status });
}

export function parseSourceDocument(value: unknown) {
  const path = 'sourceDocument';
  const r = object(value, path, ['schemaVersion', 'documentId', 'sourceId', 'documentType', 'reference', 'publishedAt', 'collectedAt', 'sha256', 'retention']);
  const schemaVersion = contractVersion(r, path);
  const publishedAt = nullableInstant(r.publishedAt, `${path}.publishedAt`);
  const collectedAt = instant(r.collectedAt, `${path}.collectedAt`);
  assertNotAfter(publishedAt, collectedAt, path);
  return freeze({ schemaVersion, documentId: identifier(r.documentId, `${path}.documentId`),
    sourceId: identifier(r.sourceId, `${path}.sourceId`), documentType: text(r.documentType, `${path}.documentType`, 128),
    reference: safeReference(r.reference, `${path}.reference`, 1024), publishedAt, collectedAt, sha256: hash(r.sha256, `${path}.sha256`),
    retention: enumeration(r.retention, `${path}.retention`, ['metadata-only', 'hash-only', 'reference-only', 'payload-permitted', 'unknown']) });
}

export function parseCollection(value: unknown) {
  const path = 'collection';
  const r = object(value, path, ['schemaVersion', 'collectionId', 'sourceId', 'idempotencyKey', 'endpoint', 'requestedAt', 'finishedAt',
    'status', 'requestedAssetIds', 'observationIds', 'httpStatus', 'errorCode', 'retryOfCollectionId']);
  const schemaVersion = contractVersion(r, path);
  const collectionId = identifier(r.collectionId, `${path}.collectionId`);
  const sourceId = identifier(r.sourceId, `${path}.sourceId`);
  const idempotencyKey = safeReference(r.idempotencyKey, `${path}.idempotencyKey`, 128);
  const endpoint = safeReference(r.endpoint, `${path}.endpoint`, 512);
  const requestedAt = instant(r.requestedAt, `${path}.requestedAt`);
  const finishedAt = nullableInstant(r.finishedAt, `${path}.finishedAt`);
  const status = enumeration(r.status, `${path}.status`, ['succeeded', 'partial', 'failed']);
  const requestedAssetIds = stringList(r.requestedAssetIds, `${path}.requestedAssetIds`, 5000);
  const observationIds = stringList(r.observationIds, `${path}.observationIds`, 5000);
  const httpStatus = r.httpStatus === null ? null : integer(r.httpStatus, `${path}.httpStatus`, 100, 599);
  const errorCode = r.errorCode === null ? null : enumeration(r.errorCode, `${path}.errorCode`, [
    'AUTHENTICATION_FAILED', 'ACCESS_DENIED', 'NOT_FOUND', 'RATE_LIMITED', 'UPSTREAM_FAILURE', 'TIMEOUT',
    'INVALID_RESPONSE', 'SCHEMA_MISMATCH', 'UNKNOWN_FAILURE'
  ]);
  const retryOfCollectionId = optionalId(r.retryOfCollectionId, `${path}.retryOfCollectionId`);
  if (retryOfCollectionId === collectionId) invalid('INVALID_RETRY_REFERENCE', path, 'Coleta não pode repetir a si própria.');
  assertNotAfter(requestedAt, finishedAt, path, 'INVALID_COLLECTION_TIME');
  if (status === 'failed' && (finishedAt === null || errorCode === null)) {
    invalid('INVALID_COLLECTION_STATE', path, 'Coleta falha deve ter término e código de erro.');
  }
  if (status !== 'failed' && finishedAt === null) invalid('INVALID_COLLECTION_STATE', path, 'Coleta concluída exige instante de término.');
  if (status === 'succeeded' && errorCode !== null) invalid('INVALID_COLLECTION_STATE', path, 'Coleta bem-sucedida não pode registrar código de erro.');
  if (status === 'succeeded' && (httpStatus === null || observationIds.length === 0)) {
    invalid('INVALID_COLLECTION_STATE', path, 'Coleta bem-sucedida exige resposta e observações registradas.');
  }
  if (status === 'succeeded' && httpStatus !== null && (httpStatus < 200 || httpStatus >= 300)) {
    invalid('INVALID_COLLECTION_STATE', path, 'Coleta bem-sucedida exige status HTTP de sucesso.');
  }
  return freeze({ schemaVersion, collectionId, sourceId, idempotencyKey, endpoint, requestedAt, finishedAt, status,
    requestedAssetIds, observationIds, httpStatus, errorCode, retryOfCollectionId });
}

export function parseQualityAssessment(value: unknown) {
  const path = 'qualityAssessment';
  const r = object(value, path, ['schemaVersion', 'assessmentId', 'subjectId', 'evaluatedAt', 'status', 'issueCodes', 'observationIds', 'coverage']);
  const schemaVersion = contractVersion(r, path);
  const coverage = nonnegativeDecimal(r.coverage, `${path}.coverage`);
  if (decimalUnits(coverage) > 100_000_000n) invalid('INVALID_COVERAGE', `${path}.coverage`, 'Cobertura deve estar entre zero e um.');
  const issueCodes = stringList(r.issueCodes, `${path}.issueCodes`, 1000);
  return freeze({ schemaVersion, assessmentId: identifier(r.assessmentId, `${path}.assessmentId`),
    subjectId: identifier(r.subjectId, `${path}.subjectId`), evaluatedAt: instant(r.evaluatedAt, `${path}.evaluatedAt`),
    status: enumeration(r.status, `${path}.status`, observationStatuses), issueCodes,
    observationIds: stringList(r.observationIds, `${path}.observationIds`), coverage });
}

export function parseTransformation(value: unknown) {
  const path = 'transformation';
  const r = object(value, path, ['schemaVersion', 'transformationId', 'appliedAt', 'operation', 'ruleVersion', 'inputObservationIds', 'outputObservationIds', 'adjustment']);
  const schemaVersion = contractVersion(r, path);
  const inputObservationIds = stringList(r.inputObservationIds, `${path}.inputObservationIds`, 5000, true);
  const outputObservationIds = stringList(r.outputObservationIds, `${path}.outputObservationIds`, 5000, true);
  return freeze({ schemaVersion, transformationId: identifier(r.transformationId, `${path}.transformationId`),
    appliedAt: instant(r.appliedAt, `${path}.appliedAt`), operation: text(r.operation, `${path}.operation`, 128),
    ruleVersion: text(r.ruleVersion, `${path}.ruleVersion`, 64), inputObservationIds, outputObservationIds,
    adjustment: enumeration(r.adjustment, `${path}.adjustment`, ['none', 'split', 'dividend', 'currency-conversion', 'derived-period']) });
}

function parseSnapshotPosition(value: unknown, path: string) {
  const r = object(value, path, ['assetId', 'quantity', 'qualityStatus', 'priceObservationId', 'localMarketValue', 'baseMarketValue']);
  const assetId = identifier(r.assetId, `${path}.assetId`);
  const quantity = nonnegativeDecimal(r.quantity, `${path}.quantity`);
  const qualityStatus = enumeration(r.qualityStatus, `${path}.qualityStatus`, ['valued', 'missing-price', 'invalid', 'unavailable', 'source-unavailable']);
  const priceObservationId = optionalId(r.priceObservationId, `${path}.priceObservationId`);
  const localMarketValue = money(r.localMarketValue, `${path}.localMarketValue`, true);
  const baseMarketValue = money(r.baseMarketValue, `${path}.baseMarketValue`, true);
  if (qualityStatus === 'valued') {
    if (priceObservationId === null || localMarketValue === null || baseMarketValue === null) {
      invalid('PARTIAL_VALUATION', path, 'Posição avaliada exige observação de preço e valores local/base.');
    }
    nonnegativeDecimal(localMarketValue.amount, `${path}.localMarketValue.amount`);
    nonnegativeDecimal(baseMarketValue.amount, `${path}.baseMarketValue.amount`);
  } else if (priceObservationId !== null || localMarketValue !== null || baseMarketValue !== null) {
    invalid('PARTIAL_VALUATION', path, 'Estado negativo não pode conter preço ou valor de mercado parcial.');
  }
  return { assetId, quantity, qualityStatus, priceObservationId, localMarketValue, baseMarketValue };
}

export function parsePortfolioSnapshot(value: unknown) {
  const path = 'portfolioSnapshot';
  const r = object(value, path, ['schemaVersion', 'snapshotId', 'portfolioId', 'capturedAt', 'effectiveAsOf', 'baseCurrency',
    'positions', 'cashBalances', 'financialEventIds', 'openingPositionIds']);
  const schemaVersion = contractVersion(r, path);
  const baseCurrency = currencyCode(r.baseCurrency, `${path}.baseCurrency`);
  const positions = list(r.positions, `${path}.positions`, 5000).map((position, index) => parseSnapshotPosition(position, `${path}.positions[${index}]`));
  unique(positions, position => position.assetId, `${path}.positions`);
  for (const [index, position] of positions.entries()) {
    if (position.baseMarketValue !== null && position.baseMarketValue.currency !== baseCurrency) {
      invalid('INVALID_BASE_CURRENCY', `${path}.positions[${index}].baseMarketValue.currency`, 'Valoração-base deve usar a moeda-base da carteira.');
    }
  }
  const cashBalances = list(r.cashBalances, `${path}.cashBalances`, 20).map((balance, index) => currencyAmount(balance, `${path}.cashBalances[${index}]`));
  unique(cashBalances, balance => balance.currency, `${path}.cashBalances`);
  return freeze({ schemaVersion, snapshotId: identifier(r.snapshotId, `${path}.snapshotId`),
    portfolioId: identifier(r.portfolioId, `${path}.portfolioId`), capturedAt: instant(r.capturedAt, `${path}.capturedAt`),
    effectiveAsOf: civilDate(r.effectiveAsOf, `${path}.effectiveAsOf`), baseCurrency,
    positions, cashBalances, financialEventIds: stringList(r.financialEventIds, `${path}.financialEventIds`),
    openingPositionIds: stringList(r.openingPositionIds, `${path}.openingPositionIds`) });
}

export function parseRecommendationSnapshot(value: unknown) {
  const path = 'recommendationSnapshot';
  const r = object(value, path, ['schemaVersion', 'recommendationSnapshotId', 'decisionId', 'portfolioSnapshotId', 'createdAt',
    'engineVersion', 'policyVersion', 'inputObservationIds', 'resultHash']);
  const schemaVersion = contractVersion(r, path);
  const resultHash = hash(r.resultHash, `${path}.resultHash`);
  if (resultHash === null) invalid('INVALID_HASH', `${path}.resultHash`, 'Snapshot de recomendação exige hash do resultado.');
  return freeze({ schemaVersion, recommendationSnapshotId: identifier(r.recommendationSnapshotId, `${path}.recommendationSnapshotId`),
    decisionId: identifier(r.decisionId, `${path}.decisionId`), portfolioSnapshotId: identifier(r.portfolioSnapshotId, `${path}.portfolioSnapshotId`),
    createdAt: instant(r.createdAt, `${path}.createdAt`), engineVersion: text(r.engineVersion, `${path}.engineVersion`, 64),
    policyVersion: text(r.policyVersion, `${path}.policyVersion`, 64),
    inputObservationIds: stringList(r.inputObservationIds, `${path}.inputObservationIds`), resultHash });
}

export type CanonicalAsset = ReturnType<typeof parseAsset>;
export type CanonicalFundComposition = ReturnType<typeof parseFundComposition>;
export type CanonicalOpeningPosition = ReturnType<typeof parseOpeningPosition>;
export type CanonicalFinancialEvent = ReturnType<typeof parseFinancialEvent>;
export type CanonicalFinancialEvents = ReturnType<typeof parseFinancialEvents>;
export type CanonicalCashBalance = ReturnType<typeof parseCashBalance>;
export type CanonicalMarketObservation = ReturnType<typeof parseMarketObservation>;
export type CanonicalSourceDocument = ReturnType<typeof parseSourceDocument>;
export type CanonicalCollection = ReturnType<typeof parseCollection>;
export type CanonicalQualityAssessment = ReturnType<typeof parseQualityAssessment>;
export type CanonicalTransformation = ReturnType<typeof parseTransformation>;
export type CanonicalPortfolioSnapshot = ReturnType<typeof parsePortfolioSnapshot>;
export type CanonicalRecommendationSnapshot = ReturnType<typeof parseRecommendationSnapshot>;
