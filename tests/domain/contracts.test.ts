// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  parseAsset,
  parseCashBalance,
  parseCollection,
  parseFinancialEvent,
  parseFinancialEvents,
  parseFundComposition,
  parseMarketObservation,
  parseOpeningPosition,
  parsePortfolioSnapshot,
  parseQualityAssessment,
  parseRecommendationSnapshot,
  parseSourceDocument,
  parseTransformation
} from '../../backend/src/domain/contracts';

const asset = {
  schemaVersion: '1.0', assetId: 'asset-wege3', issuerId: 'issuer-wege',
  identifiers: [{ scheme: 'ticker', value: 'WEGE3' }],
  symbols: { requested: 'WEGE3', provider: 'WEGE3' },
  names: { requested: null, provider: 'Fabricante Exemplo' },
  assetType: 'equity',
  classification: { assetClass: 'equity', sector: 'industrials', industry: 'capital-goods', countryOfRisk: 'BR', currency: 'BRL' },
  resolutionStatus: 'resolved'
};

const timestamp = '2026-11-01T12:00:00.123Z';
const money = (amount: string, currency = 'BRL') => ({ amount, currency, scale: amount.split('.')[1]?.length ?? 0 });

function marketObservation(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0', observationId: 'obs-price-1', assetId: 'asset-wege3',
    semanticField: 'close-price', dataKind: 'supplied', originalField: 'close', originalValue: '42.50', originalScale: 2,
    normalizedValue: '42.50', normalizedScale: 2, transformationIds: [],
    unit: 'money', currency: 'BRL',
    period: { kind: 'spot', start: null, end: null },
    marketAt: null, marketDate: '2026-10-30', validUntil: null, publishedAt: null, collectedAt: timestamp, providerRevisedAt: null,
    publicationTimeStatus: 'unknown', sourceId: 'bolsai', endpoint: '/stocks/WEGE3/quote',
    symbols: { requested: 'WEGE3', provider: 'WEGE3' }, providerRecordRef: 'WEGE3:2026-10-30',
    payloadHash: null, parserVersion: '1.0', status: 'fresh',
    ...overrides
  };
}

function portfolioSnapshot(positionOverrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0', snapshotId: 'portfolio-snapshot-1', portfolioId: 'portfolio-main',
    capturedAt: timestamp, effectiveAsOf: '2026-10-30', baseCurrency: 'BRL',
    positions: [{
      assetId: 'asset-wege3', quantity: '10', qualityStatus: 'valued',
      priceObservationId: 'obs-price-1', localMarketValue: money('425.00'), baseMarketValue: money('425.00'),
      ...positionOverrides
    }],
    cashBalances: [{ currency: 'BRL', amount: '100.00', scale: 2 }],
    financialEventIds: ['event-buy-1'], openingPositionIds: ['opening-1']
  };
}

function financialEvent(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0', eventId: 'event-buy-1', type: 'purchase', status: 'confirmed',
    assetId: 'asset-wege3', quantity: '2', quantityUnit: 'share', price: money('40.00'),
    grossValue: money('80.00'), netValue: money('81.00'), fees: money('1.00'),
    occurredOn: '2026-10-30', occurredAt: null,
    source: { kind: 'manual', sourceId: 'manual-entry', externalId: null },
    confirmedAt: timestamp, reversesEventId: null, reversedByEventId: null,
    ...overrides
  };
}

describe('contratos canônicos versionados', () => {
  it('aceita identidade estável e rejeita ticker sozinho como identidade resolvida', () => {
    expect(parseAsset(asset)).toMatchObject({ assetId: 'asset-wege3', resolutionStatus: 'resolved' });
    expect(parseAsset({ ...asset, symbols: { requested: 'TEST1', provider: 'TEST1A' } }).symbols)
      .toEqual({ requested: 'TEST1', provider: 'TEST1A' });
    expect(parseAsset({ ...asset, names: { requested: 'Nome anterior', provider: 'Nome atual' } }).names)
      .toEqual({ requested: 'Nome anterior', provider: 'Nome atual' });
    expect(parseAsset({ ...asset, issuerId: null, identifiers: [{ scheme: 'isin', value: 'US0378331005' }] }))
      .toMatchObject({ resolutionStatus: 'resolved' });
    const tickerOnly = { ...asset, issuerId: null, resolutionStatus: 'resolved' };
    expect(() => parseAsset(tickerOnly)).toThrow(expect.objectContaining({ code: 'UNRESOLVED_ASSET_IDENTITY' }));
    expect(() => parseAsset({ ...tickerOnly, identifiers: [{ scheme: 'cvm-code', value: '123' }] }))
      .toThrow(expect.objectContaining({ code: 'UNRESOLVED_ASSET_IDENTITY' }));
    expect(parseAsset({ ...tickerOnly, resolutionStatus: 'unresolved' })).toMatchObject({ resolutionStatus: 'unresolved' });
  });

  it('versiona composição de fundo e exige identidade estável de cada componente', () => {
    const composition = {
      schemaVersion: '1.0', compositionId: 'composition-1', fundAssetId: 'asset-fund', effectiveAsOf: '2026-10-30',
      sourceDocumentId: 'doc-holdings', unclassifiedWeight: '0.25',
      components: [{ componentId: 'component-1', assetId: 'asset-company', identifiers: [], weight: '0.75', currency: 'BRL' }]
    };
    expect(parseFundComposition(composition)).toMatchObject({ compositionId: 'composition-1' });
    const ambiguous = { ...composition, components: [{ ...composition.components[0], assetId: null, identifiers: [{ scheme: 'ticker', value: 'WEGE3' }] }] };
    expect(() => parseFundComposition(ambiguous)).toThrow(expect.objectContaining({ code: 'UNRESOLVED_ASSET_IDENTITY' }));
    expect(() => parseFundComposition({ ...composition, components: [{ ...composition.components[0], weight: '0.80' }] }))
      .toThrow(expect.objectContaining({ code: 'INVALID_COMPOSITION_WEIGHT' }));
  });

  it('mantém posição de abertura e caixa com quantidades e valores decimais explícitos', () => {
    expect(parseOpeningPosition({
      schemaVersion: '1.0', positionId: 'opening-1', assetId: 'asset-wege3', quantity: '10', quantityUnit: 'share',
      openedOn: '2026-10-01', costBasis: money('300.00'), sourceDocumentId: 'doc-statement'
    })).toMatchObject({ quantity: '10', costBasis: money('300.00') });
    expect(parseCashBalance({
      schemaVersion: '1.0', portfolioId: 'portfolio-main', currency: 'AUD', amount: '12.34', scale: 2, asOf: '2026-10-30',
      sourceDocumentId: 'doc-statement'
    })).toMatchObject({ currency: 'AUD', amount: '12.34' });
    expect(() => parseCashBalance({
      schemaVersion: '1.0', portfolioId: 'portfolio-main', currency: 'USD', amount: 12.34, scale: 2, asOf: '2026-10-30',
      sourceDocumentId: 'doc-statement'
    })).toThrow(expect.objectContaining({ code: 'INVALID_DECIMAL' }));
    expect(() => parseCashBalance({
      schemaVersion: '1.0', portfolioId: 'portfolio-main', currency: 'USD', amount: '12.3', scale: 2, asOf: '2026-10-30',
      sourceDocumentId: 'doc-statement'
    })).toThrow(expect.objectContaining({ code: 'INVALID_DECIMAL_SCALE' }));
  });

  it('distingue compra, aporte externo e provento recebido e mantém importação pendente', () => {
    expect(parseFinancialEvent(financialEvent())).toMatchObject({ type: 'purchase', status: 'confirmed' });
    expect(parseFinancialEvent(financialEvent({ status: 'imported-pending', confirmedAt: null,
      source: { kind: 'provider', sourceId: 'broker-feed', externalId: 'trade-17' } })))
      .toMatchObject({ status: 'imported-pending' });
    expect(parseFinancialEvent(financialEvent({ type: 'external-contribution', assetId: null,
      quantity: null, quantityUnit: null, price: null, grossValue: money('100.00'), netValue: money('100.00'), fees: money('0'),
      source: { kind: 'manual', sourceId: 'manual-entry', externalId: null } })))
      .toMatchObject({ type: 'external-contribution' });
    expect(parseFinancialEvent(financialEvent({ type: 'dividend-received', quantity: null, quantityUnit: null, price: null,
      grossValue: money('3.00'), netValue: money('3.00'), fees: money('0') })))
      .toMatchObject({ type: 'dividend-received' });
    expect(parseFinancialEvent(financialEvent({ type: 'fee', quantity: null, quantityUnit: null, price: null,
      grossValue: money('1.00'), netValue: money('1.00'), fees: money('1.00') })))
      .toMatchObject({ type: 'fee', assetId: 'asset-wege3' });
    const pending = financialEvent({ status: 'imported-pending', confirmedAt: null,
      source: { kind: 'provider', sourceId: 'broker-feed', externalId: 'trade-17' } });
    expect(() => parseFinancialEvents([pending, { ...pending, eventId: 'event-buy-2' }]))
      .toThrow(expect.objectContaining({ code: 'DUPLICATE_EXTERNAL_EVENT' }));
  });

  it('rejeita estados de evento contraditórios e estorno sem vínculo ao original', () => {
    expect(() => parseFinancialEvent(financialEvent({ status: 'imported-pending', confirmedAt: timestamp })))
      .toThrow(expect.objectContaining({ code: 'INVALID_EVENT_STATUS' }));
    expect(() => parseFinancialEvent(financialEvent({ status: 'reversed', reversedByEventId: null })))
      .toThrow(expect.objectContaining({ code: 'INVALID_EVENT_REVERSAL' }));
    expect(() => parseFinancialEvent(financialEvent({ type: 'purchase', assetId: null })))
      .toThrow(expect.objectContaining({ code: 'INVALID_EVENT_SHAPE' }));
    const original = financialEvent({ status: 'reversed', reversedByEventId: 'event-reversal-1' });
    const reversal = financialEvent({ eventId: 'event-reversal-1', type: 'reversal', status: 'confirmed',
      grossValue: money('-80.00'), netValue: money('-81.00'), fees: money('-1.00'), reversesEventId: 'event-buy-1' });
    expect(parseFinancialEvents([original, reversal])).toHaveLength(2);
    expect(() => parseFinancialEvents([original])).toThrow(expect.objectContaining({ code: 'INVALID_EVENT_REVERSAL' }));
  });

  it('registra semântica, origem, período e todos os instantes separadamente', () => {
    expect(parseMarketObservation(marketObservation())).toMatchObject({
      semanticField: 'close-price', originalField: 'close', currency: 'BRL',
      period: { kind: 'spot', start: null, end: null }, publicationTimeStatus: 'unknown',
      symbols: { requested: 'WEGE3', provider: 'WEGE3' }
    });
    expect(parseMarketObservation(marketObservation({ symbols: { requested: 'WEGE3', provider: 'WEGE3.A' } })).symbols)
      .toEqual({ requested: 'WEGE3', provider: 'WEGE3.A' });
    expect(parseMarketObservation(marketObservation({ semanticField: 'market-value', dataKind: 'derived', originalField: null,
      originalValue: null, originalScale: null, normalizedValue: '425.00', normalizedScale: 2,
      transformationIds: ['transform-1'] }))).toMatchObject({ dataKind: 'derived', originalValue: null });
    expect(parseMarketObservation(marketObservation({ dataKind: 'adjusted', transformationIds: ['transform-1'] })))
      .toMatchObject({ dataKind: 'adjusted', originalValue: '42.50' });
    expect(() => parseMarketObservation(marketObservation({ dataKind: 'derived', originalField: null,
      originalValue: null, originalScale: null, transformationIds: [] })))
      .toThrow(expect.objectContaining({ code: 'INVALID_OBSERVATION_PROVENANCE' }));
    expect(() => parseMarketObservation(marketObservation({ collectedAt: '2026-11-01T12:00:00.1234Z' })))
      .toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP_PRECISION' }));
    expect(() => parseMarketObservation(marketObservation({ normalizedScale: 1 })))
      .toThrow(expect.objectContaining({ code: 'INVALID_DECIMAL_SCALE' }));
    expect(() => parseMarketObservation(marketObservation({ publishedAt: '2026-11-01T12:00:00.1234Z' })))
      .toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP_PRECISION' }));
    expect(() => parseMarketObservation(marketObservation({ publishedAt: '2026-11-01T12:00:00', publicationTimeStatus: 'known' })))
      .toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP' }));
    expect(() => parseMarketObservation(marketObservation({
      publishedAt: '2026-11-01T12:00:00.123Z', collectedAt: '2026-11-01T12:00:00.122Z'
    }))).toThrow(expect.objectContaining({ code: 'INVALID_TIMESTAMP_ORDER' }));
  });

  it('não aceita valor monetário em observação indisponível', () => {
    expect(() => parseMarketObservation(marketObservation({ status: 'missing-price' })))
      .toThrow(expect.objectContaining({ code: 'PARTIAL_VALUATION' }));
    expect(() => parseMarketObservation(marketObservation({ status: 'unavailable', originalValue: null,
      originalScale: null, normalizedValue: null, normalizedScale: null, currency: null }))).not.toThrow();
    expect(() => parseMarketObservation(marketObservation({ status: 'invalid' })))
      .toThrow(expect.objectContaining({ code: 'PARTIAL_VALUATION' }));
    expect(parseMarketObservation(marketObservation({ semanticField: 'profitability-ratio', originalValue: '0', originalScale: 0,
      normalizedValue: '0', normalizedScale: 0, unit: 'ratio', currency: null }))).toMatchObject({ normalizedValue: '0' });
  });

  it('rejeita valor normalizado diferente da origem em observação fornecida', () => {
    expect(() => parseMarketObservation(marketObservation({ originalValue: '42.50', normalizedValue: '1.00' })))
      .toThrow(expect.objectContaining({ code: 'INVALID_OBSERVATION_PROVENANCE' }));
    expect(parseMarketObservation(marketObservation({ normalizedValue: '42.5', normalizedScale: 1 })))
      .toMatchObject({ originalValue: '42.50', normalizedValue: '42.5' });
    expect(parseMarketObservation(marketObservation({ dataKind: 'adjusted', normalizedValue: '21.25',
      transformationIds: ['transform-1'] })))
      .toMatchObject({ originalValue: '42.50', normalizedValue: '21.25', dataKind: 'adjusted' });
  });

  it('rejeita preço original não positivo mesmo quando o ajuste resulta em preço positivo', () => {
    expect(() => parseMarketObservation(marketObservation({ dataKind: 'adjusted', originalValue: '-42.50',
      normalizedValue: '42.50', transformationIds: ['transform-1'] })))
      .toThrow(expect.objectContaining({ code: 'INVALID_DECIMAL' }));
    expect(() => parseMarketObservation(marketObservation({ dataKind: 'adjusted', originalValue: '0.00',
      normalizedValue: '42.50', transformationIds: ['transform-1'] })))
      .toThrow(expect.objectContaining({ code: 'INVALID_DECIMAL' }));
  });

  it('rejeita valuation parcial em snapshot e exige os três vínculos quando avaliado', () => {
    expect(() => parsePortfolioSnapshot(portfolioSnapshot({ qualityStatus: 'missing-price', localMarketValue: null,
      baseMarketValue: null, priceObservationId: 'obs-price-1' })))
      .toThrow(expect.objectContaining({ code: 'PARTIAL_VALUATION' }));
    expect(() => parsePortfolioSnapshot(portfolioSnapshot({ priceObservationId: null })))
      .toThrow(expect.objectContaining({ code: 'PARTIAL_VALUATION' }));
    expect(() => parsePortfolioSnapshot(portfolioSnapshot({ baseMarketValue: money('425.00', 'USD') })))
      .toThrow(expect.objectContaining({ code: 'INVALID_BASE_CURRENCY' }));
    expect(parsePortfolioSnapshot(portfolioSnapshot())).toMatchObject({ snapshotId: 'portfolio-snapshot-1' });
    const parsed = parsePortfolioSnapshot(portfolioSnapshot());
    expect(Object.isFrozen(parsed.positions)).toBe(true);
    expect(() => parsePortfolioSnapshot(portfolioSnapshot({ qualityStatus: 'missing-price', localMarketValue: null,
      baseMarketValue: money('1.00'), priceObservationId: null })))
      .toThrow(expect.objectContaining({ code: 'PARTIAL_VALUATION' }));
  });

  it('valida documentos, coletas, qualidade e transformações sem armazenar payload bruto', () => {
    expect(parseSourceDocument({
      schemaVersion: '1.0', documentId: 'doc-holdings', sourceId: 'provider', documentType: 'fund-holdings',
      reference: 'provider:holdings:1', publishedAt: null, collectedAt: timestamp, sha256: null,
      retention: 'reference-only'
    })).toMatchObject({ retention: 'reference-only' });
    expect(() => parseSourceDocument({
      schemaVersion: '1.0', documentId: 'doc-raw', sourceId: 'provider', documentType: 'fund-holdings',
      reference: 'provider:holdings:1', publishedAt: null, collectedAt: timestamp, sha256: null,
      retention: 'reference-only', rawPayload: { secret: 'never-store' }
    })).toThrow(expect.objectContaining({ code: 'UNKNOWN_FIELD' }));
    expect(() => parseSourceDocument({
      schemaVersion: '1.0', documentId: 'doc-url', sourceId: 'provider', documentType: 'fund-holdings',
      reference: 'https://provider.test/file?token=hidden', publishedAt: null, collectedAt: timestamp, sha256: null,
      retention: 'reference-only'
    })).toThrow(expect.objectContaining({ code: 'SENSITIVE_REFERENCE' }));
    expect(parseCollection({
      schemaVersion: '1.0', collectionId: 'collection-1', sourceId: 'provider', idempotencyKey: 'key-1',
      endpoint: '/holdings', requestedAt: timestamp, finishedAt: timestamp, status: 'succeeded',
      requestedAssetIds: ['asset-wege3'], observationIds: ['obs-price-1'], httpStatus: 200,
      errorCode: null, retryOfCollectionId: null
    })).toMatchObject({ status: 'succeeded' });
    expect(parseCollection({
      schemaVersion: '1.0', collectionId: 'collection-failed', sourceId: 'provider', idempotencyKey: 'key-failed',
      endpoint: '/holdings', requestedAt: timestamp, finishedAt: timestamp, status: 'failed',
      requestedAssetIds: ['asset-wege3'], observationIds: [], httpStatus: 429,
      errorCode: 'RATE_LIMITED', retryOfCollectionId: null
    })).toMatchObject({ status: 'failed' });
    expect(() => parseCollection({
      schemaVersion: '1.0', collectionId: 'collection-secret', sourceId: 'provider', idempotencyKey: 'key-secret',
      endpoint: '/holdings?apikey=hidden', requestedAt: timestamp, finishedAt: timestamp, status: 'failed',
      requestedAssetIds: [], observationIds: [], httpStatus: 500,
      errorCode: 'UNKNOWN_FAILURE', retryOfCollectionId: null
    })).toThrow(expect.objectContaining({ code: 'SENSITIVE_REFERENCE' }));
    expect(() => parseCollection({
      schemaVersion: '1.0', collectionId: 'collection-error', sourceId: 'provider', idempotencyKey: 'key-error',
      endpoint: '/holdings', requestedAt: timestamp, finishedAt: timestamp, status: 'failed',
      requestedAssetIds: [], observationIds: [], httpStatus: 500,
      errorCode: 'raw provider response', retryOfCollectionId: null
    })).toThrow(expect.objectContaining({ code: 'INVALID_ENUM' }));
    expect(() => parseCollection({
      schemaVersion: '1.0', collectionId: 'collection-2', sourceId: 'provider', idempotencyKey: 'key-2',
      endpoint: '/holdings', requestedAt: timestamp, finishedAt: timestamp, status: 'succeeded',
      requestedAssetIds: ['asset-wege3'], observationIds: ['obs-price-1'], httpStatus: 200,
      errorCode: null, retryOfCollectionId: 'collection-2'
    })).toThrow(expect.objectContaining({ code: 'INVALID_RETRY_REFERENCE' }));
    expect(parseQualityAssessment({
      schemaVersion: '1.0', assessmentId: 'quality-1', subjectId: 'asset-wege3', evaluatedAt: timestamp,
      status: 'stale', issueCodes: ['price-stale'], observationIds: ['obs-price-1'], coverage: '0.75'
    })).toMatchObject({ coverage: '0.75' });
    expect(parseTransformation({
      schemaVersion: '1.0', transformationId: 'transform-1', appliedAt: timestamp,
      operation: 'split-adjustment', ruleVersion: '1.0', inputObservationIds: ['obs-price-1'],
      outputObservationIds: ['obs-price-adjusted'], adjustment: 'split'
    })).toMatchObject({ adjustment: 'split' });
  });

  it('cria snapshot de recomendação imutável, versionado e vinculado ao snapshot de carteira', () => {
    const raw = {
      schemaVersion: '1.0', recommendationSnapshotId: 'recommendation-1', decisionId: 'decision-1',
      portfolioSnapshotId: 'portfolio-snapshot-1', createdAt: timestamp, engineVersion: '1.0',
      policyVersion: '1.0', inputObservationIds: ['obs-price-1'], resultHash: 'a'.repeat(64)
    };
    const parsed = parseRecommendationSnapshot(raw);
    expect(parsed).toMatchObject({ portfolioSnapshotId: 'portfolio-snapshot-1' });
    expect(Object.isFrozen(parsed)).toBe(true);
    raw.inputObservationIds.push('obs-price-2');
    expect(parsed.inputObservationIds).toEqual(['obs-price-1']);
    expect(() => parseRecommendationSnapshot({ ...raw, schemaVersion: '2.0' }))
      .toThrow(expect.objectContaining({ code: 'INVALID_ENUM' }));
  });
});
