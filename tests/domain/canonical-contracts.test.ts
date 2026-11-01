import { describe, expect, it } from 'vitest';
import { InputError } from '../../backend/src/domain/errors';
import {
  parseCanonicalAsset,
  parseCanonicalClassification,
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
  parseTransformation,
} from '../../backend/src/domain/canonical-contracts';

const stamp = '2026-10-31T13:00:00-03:00';
const decimal = (value: string, scale = 2) => ({ value, scale });
const money = (value: string, currency = 'BRL') => ({ amount: decimal(value), currency });

const asset = {
  schemaVersion: '1.0', assetId: 'asset-itub4', instrumentType: 'stock', primarySymbol: 'ITUB4', currency: 'BRL',
  identityState: 'identified', issuerId: null, identifiers: [{ scheme: 'isin', value: 'BRITUBACNPR1' }],
  symbols: [
    { symbol: 'ITUB4', validFrom: '2020-01-01', validTo: null, sourceId: 'manual-catalog' },
    { symbol: 'ITUB3', validFrom: null, validTo: '2019-12-31', sourceId: 'manual-catalog' },
  ],
};

const portfolioSnapshot = {
  schemaVersion: '1.0', snapshotId: 'portfolio-2026-10-31', asOf: stamp, baseCurrency: 'BRL',
  openingPositionIds: ['opening-itub4'], confirmedEventIds: [],
  cashBalances: [{ schemaVersion: '1.0', balanceId: 'cash-brl', amount: money('100.00'), asOf: stamp,
    basis: 'user-reported', sourceEventIds: [] }],
  valuations: [{ assetId: 'asset-itub4', quantity: decimal('10'), currency: 'BRL', localMarketValue: money('350.00'),
    baseMarketValue: money('350.00'), priceObservationId: 'quote-itub4', fxObservationId: null, state: 'valued' }],
  observationIds: ['quote-itub4'], classificationIds: ['sector-itub'], compositionIds: [], transformationIds: [],
  qualityAssessmentIds: [], policyVersion: 'policy-1.0',
};

function expectCode(action: () => unknown, code: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(InputError);
    expect((error as InputError).code).toBe(code);
    return;
  }
  throw new Error(`Expected InputError ${code}`);
}

describe('canonical asset contract', () => {
  it('rejects schema versions that are not explicitly supported', () => {
    expect(() => parseCanonicalAsset({
      schemaVersion: '9.0',
      assetId: 'asset-itub4',
      instrumentType: 'stock',
      primarySymbol: 'ITUB4',
      currency: 'BRL',
      identityState: 'identified',
      issuerId: 'issuer-itau',
      identifiers: [],
      symbols: [{ symbol: 'ITUB4', validFrom: null, validTo: null, sourceId: 'manual' }],
    })).toThrowError(expect.objectContaining({
      constructor: InputError,
      code: 'UNSUPPORTED_SCHEMA_VERSION',
    }));
  });

  it('keeps ticker history separate from the stable internal asset identity', () => {
    const parsed = parseCanonicalAsset(asset);
    expect(parsed.assetId).toBe('asset-itub4');
    expect(parsed.symbols.map(item => item.symbol)).toEqual(['ITUB4', 'ITUB3']);
    expect(parsed.identifiers[0]?.value).toBe('BRITUBACNPR1');
    expect(Object.isFrozen(parsed.symbols)).toBe(true);
  });

  it('does not accept an unidentified entity as a resolved asset', () => {
    expectCode(() => parseCanonicalAsset({ ...asset, issuerId: null, identifiers: [] }), 'UNRESOLVED_IDENTITY');
  });

  it('keeps ticker-only assets unresolved even when the ticker is listed as an identifier', () => {
    const tickerOnly = { ...asset, issuerId: null, identifiers: [{ scheme: 'ticker', value: 'ITUB4' }] };
    expectCode(() => parseCanonicalAsset(tickerOnly), 'UNRESOLVED_IDENTITY');
    expect(parseCanonicalAsset({ ...tickerOnly, identityState: 'unresolved' }).identityState).toBe('unresolved');
    expectCode(() => parseCanonicalAsset({ ...asset, identifiers: [{ scheme: 'isin', value: 'ITUB4' }] }), 'INVALID_EXTERNAL_ID');
    expectCode(() => parseCanonicalAsset({ ...asset, identifiers: [{ scheme: 'constructor', value: 'ITUB4' }] }), 'UNRESOLVED_IDENTITY');
  });
});

describe('canonical classification and fund composition contracts', () => {
  it('keeps unknown classification distinct from an unclassified value', () => {
    const parsed = parseCanonicalClassification({ schemaVersion: '1.0', classificationId: null, assetId: 'asset-itub4',
      dimension: 'sector', state: 'unknown', method: 'provider', weightBps: 10000, effectiveFrom: null,
      effectiveTo: null, publishedAt: null, collectedAt: stamp, sourceId: 'cvm' });
    expect(parsed.state).toBe('unknown');
    expect(parsed.classificationId).toBeNull();
  });

  it('preserves requested and returned component symbols and accounts for all fund weight', () => {
    const parsed = parseFundComposition({ schemaVersion: '1.0', compositionId: 'ivvb11-2026q3', assetId: 'asset-ivvb11',
      status: 'available', referenceDate: '2026-09-30', publishedAt: null, collectedAt: stamp, sourceId: 'provider',
      endpointOrFile: '/portfolio/history', recordReference: 'q3', coverageBps: 8000, unclassifiedBps: 2000,
      components: [
        { assetId: 'asset-aapl', requestedSymbol: 'AAPL', returnedSymbol: 'AAPL', weightBps: 5000, identityState: 'identified' },
        { assetId: null, requestedSymbol: 'UNKNOWN', returnedSymbol: 'UNKNOWN.A', weightBps: 2000, identityState: 'unresolved' },
        { assetId: 'asset-msft', requestedSymbol: 'MSFT', returnedSymbol: 'MSFT', weightBps: 3000, identityState: 'identified' },
      ] });
    expect(parsed.components[1]?.requestedSymbol).toBe('UNKNOWN');
    expect(parsed.components[1]?.returnedSymbol).toBe('UNKNOWN.A');
    expect(parsed.unclassifiedBps).toBe(2000);
    expectCode(() => parseFundComposition({ schemaVersion: '1.0', compositionId: 'bad', assetId: 'asset-ivvb11',
      status: 'available', referenceDate: '2026-09-30', publishedAt: null, collectedAt: stamp, sourceId: 'provider',
      endpointOrFile: '/portfolio', recordReference: null, coverageBps: 8000, unclassifiedBps: 1000,
      components: [] }), 'INVALID_COMPOSITION');
  });
});

describe('canonical positions and financial events', () => {
  it('keeps unknown historical cost explicit without deriving it from current price', () => {
    const parsed = parseOpeningPosition({ schemaVersion: '1.0', positionId: 'opening-itub4', assetId: 'asset-itub4',
      quantity: decimal('10'), currency: 'BRL', effectiveOn: '2026-09-30', acquiredOn: null,
      unitAcquisitionPrice: null, costBasis: null, costs: null, recordedAt: stamp, reviewedAt: null, sourceKind: 'manual', sourceId: null });
    expect(parsed.costBasis).toBeNull();
    expect(parsed.acquiredOn).toBeNull();
    const reviewedImport = parseOpeningPosition({ schemaVersion: '1.0', positionId: 'opening-imported', assetId: 'asset-itub4',
      quantity: decimal('10'), currency: 'BRL', effectiveOn: '2026-09-30', acquiredOn: '2025-01-01',
      unitAcquisitionPrice: money('30.00'), costBasis: money('300.00'), costs: money('0.00'), recordedAt: stamp,
      reviewedAt: stamp, sourceKind: 'imported-reviewed', sourceId: 'statement-import-1' });
    expect(reviewedImport.reviewedAt).toBe(stamp);
    expectCode(() => parseOpeningPosition({ schemaVersion: '1.0', positionId: 'bad', assetId: 'asset-itub4',
      quantity: { value: 10, scale: 0 }, currency: 'BRL', effectiveOn: '2026-09-30', acquiredOn: null,
      unitAcquisitionPrice: null, costBasis: null, costs: null, recordedAt: stamp, reviewedAt: null, sourceKind: 'manual', sourceId: null }), 'INVALID_TEXT');
  });

  it('distinguishes an external contribution from a proposed or confirmed purchase', () => {
    const parsed = parseFinancialEvent({ schemaVersion: '1.0', eventId: 'deposit-1', eventType: 'external-contribution',
      status: 'confirmed', assetId: null, quantity: null, unitPrice: null, grossAmount: money('1000.00'),
      netAmount: money('1000.00'), costs: null, occurredAt: stamp, effectiveOn: '2026-10-31',
      recordedAt: stamp, reviewedAt: null,
      source: { kind: 'manual', sourceId: null, externalOperationId: null }, reversesEventId: null });
    expect(parsed.eventType).toBe('external-contribution');
    expect(parsed.status).toBe('confirmed');
    const pendingImport = parseFinancialEvent({ schemaVersion: '1.0', eventId: 'imported-pending-1', eventType: 'purchase',
      status: 'imported-pending', assetId: 'asset-itub4', quantity: decimal('1'), unitPrice: money('35.00'),
      grossAmount: money('35.00'), netAmount: money('35.00'), costs: null, occurredAt: stamp, effectiveOn: '2026-10-31',
      recordedAt: stamp, reviewedAt: null,
      source: { kind: 'imported', sourceId: 'statement-import-1', externalOperationId: 'row-17' }, reversesEventId: null });
    expect(pendingImport.status).toBe('imported-pending');
    expectCode(() => parseFinancialEvents([
      { schemaVersion: '1.0', eventId: 'imported-1', eventType: 'purchase', status: 'imported-pending', assetId: 'asset-itub4',
        quantity: decimal('1'), unitPrice: money('35.00'), grossAmount: money('35.00'), netAmount: money('35.00'), costs: null,
        occurredAt: stamp, effectiveOn: '2026-10-31', recordedAt: stamp, reviewedAt: null,
        source: { kind: 'imported', sourceId: 'statement-import-1', externalOperationId: 'row-17' }, reversesEventId: null },
      { schemaVersion: '1.0', eventId: 'imported-2', eventType: 'purchase', status: 'imported-pending', assetId: 'asset-itub4',
        quantity: decimal('1'), unitPrice: money('35.00'), grossAmount: money('35.00'), netAmount: money('35.00'), costs: null,
        occurredAt: stamp, effectiveOn: '2026-10-31', recordedAt: stamp, reviewedAt: null,
        source: { kind: 'imported', sourceId: 'statement-import-1', externalOperationId: 'row-17' }, reversesEventId: null },
    ]), 'DUPLICATE');
    expectCode(() => parseFinancialEvent({ schemaVersion: '1.0', eventId: 'unreviewed-import', eventType: 'purchase',
      status: 'confirmed', assetId: 'asset-itub4', quantity: decimal('1'), unitPrice: money('35.00'),
      grossAmount: money('35.00'), netAmount: money('35.00'), costs: null, occurredAt: stamp, effectiveOn: '2026-10-31',
      recordedAt: stamp, reviewedAt: null,
      source: { kind: 'imported', sourceId: 'statement-import-1', externalOperationId: 'row-18' }, reversesEventId: null }), 'MISSING_REVIEW');
    expectCode(() => parseFinancialEvent({ schemaVersion: '1.0', eventId: 'bad', eventType: 'purchase',
      status: 'imported-pending', assetId: 'asset-itub4', quantity: decimal('1'), unitPrice: money('35'),
      grossAmount: money('35'), netAmount: money('35'), costs: null, occurredAt: stamp, effectiveOn: '2026-10-31',
      recordedAt: stamp, reviewedAt: null,
      source: { kind: 'manual', sourceId: null, externalOperationId: null }, reversesEventId: null }), 'INVALID_EVENT_STATUS');
  });

  it('models an estorno as its own linked event', () => {
    const parsed = parseFinancialEvent({ schemaVersion: '1.0', eventId: 'reversal-1', eventType: 'reversal', status: 'reversed',
      assetId: null, quantity: null, unitPrice: null, grossAmount: null, netAmount: null, costs: null,
      occurredAt: stamp, effectiveOn: '2026-10-31', recordedAt: stamp, reviewedAt: stamp,
      source: { kind: 'manual', sourceId: null, externalOperationId: null },
      reversesEventId: 'purchase-original' });
    expect(parsed.reversesEventId).toBe('purchase-original');
    expectCode(() => parseFinancialEvent({ schemaVersion: '1.0', eventId: 'bad-reversal', eventType: 'reversal', status: 'confirmed',
      assetId: null, quantity: null, unitPrice: null, grossAmount: null, netAmount: null, costs: null,
      occurredAt: stamp, effectiveOn: '2026-10-31', recordedAt: stamp, reviewedAt: null,
      source: { kind: 'manual', sourceId: null, externalOperationId: null },
      reversesEventId: null }), 'INVALID_EVENT');
  });

  it('requires event references when a cash balance claims to be derived', () => {
    expectCode(() => parseCashBalance({ schemaVersion: '1.0', balanceId: 'cash', amount: money('0.00'), asOf: stamp,
      basis: 'derived-from-confirmed-events', sourceEventIds: [] }), 'MISSING_PROVENANCE');
    expect(parseCashBalance({ schemaVersion: '1.0', balanceId: 'cash', amount: money('0.00'), asOf: stamp,
      basis: 'user-reported', sourceEventIds: [] }).amount.amount.value).toBe('0.00');
  });
});

describe('canonical source, observation and quality contracts', () => {
  it('rejects a payload hash when retention permission is unknown', () => {
    expectCode(() => parseSourceDocument({ schemaVersion: '1.0', documentId: 'doc-1', sourceId: 'cvm', documentType: 'itr',
      issuerId: null, endpointOrFile: 'ITR/2026.zip', recordReference: null, publishedAt: null, collectedAt: stamp,
      payloadRetention: 'unknown', hashRetention: 'unknown', payloadHash: 'a'.repeat(64), parserVersion: 'cvm-parser-1' }), 'INVALID_RETENTION');
  });

  it('keeps explicit zero, exact decimals, period and unknown publication time', () => {
    const parsed = parseMarketObservation({ schemaVersion: '1.0', observationId: 'roe-1', assetId: 'asset-itub4',
      requestedSymbol: 'ITUB4', returnedSymbol: 'ITUB4',
      semanticField: 'bank.roe-spread', sourceField: 'returnOnEquity', originalValue: 0, normalizedValue: decimal('0', 8),
      unit: 'percent', currency: null, period: { kind: 'ttm', start: '2025-10-01', end: '2026-09-30' },
      marketAt: null, validUntil: null, publishedAt: null, collectedAt: stamp, sourceId: 'brapi',
      endpointOrFile: '/api/v2/stocks/financial-data', recordReference: 'ITUB4', hashRetention: 'unknown', payloadHash: null,
      parserVersion: 'brapi-v2-1', state: 'unknown-publication-time' });
    expect(parsed.normalizedValue?.value).toBe('0');
    expect(parsed.publishedAt).toBeNull();
    expect(parsed.period.kind).toBe('ttm');
    expectCode(() => parseMarketObservation({ ...parsed, originalValue: null }), 'INVALID_OBSERVATION_STATE');
    expectCode(() => parseMarketObservation({ ...parsed, marketAt: '2026-10-31T16:00:00.0009Z',
      collectedAt: '2026-10-31T16:00:00.0001Z' }), 'INVALID_TIME_ORDER');
    expect(parseMarketObservation({ ...parsed, marketAt: '2026-10-31T16:00:00.0001Z',
      collectedAt: '2026-10-31T16:00:00.0009Z' }).marketAt).toBe('2026-10-31T16:00:00.0001Z');
    expectCode(() => parseMarketObservation({ schemaVersion: '1.0', observationId: 'bad', assetId: 'asset-itub4',
      requestedSymbol: 'ITUB4', returnedSymbol: null,
      semanticField: 'price', sourceField: 'regularMarketPrice', originalValue: '35.00', normalizedValue: decimal('35'),
      unit: 'currency-per-share', currency: null, period: { kind: 'spot', start: null, end: null }, marketAt: null,
      validUntil: null, publishedAt: null, collectedAt: stamp, sourceId: 'brapi', endpointOrFile: '/quote',
      recordReference: null, hashRetention: 'unknown', payloadHash: null, parserVersion: 'brapi-v2-1', state: 'available' }), 'INVALID_UNIT');
    expectCode(() => parseMarketObservation({ schemaVersion: '1.0', observationId: 'bad-hash', assetId: 'asset-itub4',
      requestedSymbol: 'ITUB4', returnedSymbol: 'ITUB4',
      semanticField: 'market.price', sourceField: 'regularMarketPrice', originalValue: '35.00', normalizedValue: decimal('35'),
      unit: 'currency-per-share', currency: 'BRL', period: { kind: 'spot', start: null, end: null }, marketAt: null,
      validUntil: null, publishedAt: null, collectedAt: stamp, sourceId: 'brapi', endpointOrFile: '/quote',
      recordReference: null, hashRetention: 'unknown', payloadHash: 'a'.repeat(64), parserVersion: 'brapi-v2-1', state: 'available' }), 'INVALID_RETENTION');
  });

  it('captures source collection outcomes and data quality as explicit states', () => {
    const collection = parseCollection({ schemaVersion: '1.0', collectionId: 'collect-1', sourceId: 'brapi', startedAt: stamp,
      completedAt: '2026-10-31T13:01:00-03:00', status: 'partial', requestedAssetIds: ['asset-itub4', 'asset-schd'],
      successCount: 1, failureCount: 1, errors: [{ assetId: 'asset-schd', code: 'NO_COVERAGE', retryable: false }] });
    expect(collection.status).toBe('partial');
    expect(collection.errors[0]?.code).toBe('NO_COVERAGE');
    const quality = parseQualityAssessment({ schemaVersion: '1.0', assessmentId: 'quality-1', observationId: 'roe-1',
      state: 'conflict', reasonCodes: ['COMPARABLE_SOURCE_DIVERGENCE'], comparedObservationIds: ['roe-2'],
      assessedAt: stamp, policyVersion: 'quality-1.0' });
    expect(quality.state).toBe('conflict');
  });

  it('requires a source observation for every persisted transformation', () => {
    const converted = parseTransformation({ schemaVersion: '1.0', transformationId: 'fx-usd-brl-1', kind: 'currency-conversion',
      operation: 'multiply-ptax-reference', operationVersion: '1.0', sourceObservationIds: ['ptax-usd-brl'],
      inputValue: decimal('10.00'), outputValue: decimal('50.00'), inputUnit: 'currency', inputCurrency: 'USD',
      outputUnit: 'currency', outputCurrency: 'BRL', appliedAt: stamp });
    expect(converted.inputCurrency).toBe('USD');
    expect(converted.outputCurrency).toBe('BRL');
    expectCode(() => parseTransformation({ schemaVersion: '1.0', transformationId: 'fx-1', kind: 'currency-conversion',
      operation: 'multiply-fx', operationVersion: '1.0', sourceObservationIds: [], inputValue: decimal('1.00'),
      outputValue: decimal('5.00'), inputUnit: 'currency', inputCurrency: 'USD', outputUnit: 'currency', outputCurrency: 'BRL',
      appliedAt: stamp }), 'MISSING_PROVENANCE');
  });
});

describe('canonical reproducibility snapshots', () => {
  it('rejects every partial monetary tuple in negative valuation states', () => {
    const absent = { ...portfolioSnapshot.valuations[0], localMarketValue: null, baseMarketValue: null,
      priceObservationId: null, fxObservationId: null };
    for (const state of ['missing-price', 'invalid', 'unavailable'] as const) {
      expect(parsePortfolioSnapshot({ ...portfolioSnapshot, valuations: [{ ...absent, state }] }).valuations[0]?.state).toBe(state);
      for (const partial of [
        { localMarketValue: money('350.00') }, { baseMarketValue: money('350.00') },
        { priceObservationId: 'quote-itub4' }, { fxObservationId: 'fx-usd-brl' },
      ]) {
        expectCode(() => parsePortfolioSnapshot({ ...portfolioSnapshot,
          valuations: [{ ...absent, ...partial, state }] }), 'INVALID_VALUATION_SNAPSHOT');
      }
    }
    const missingFx = parsePortfolioSnapshot({ ...portfolioSnapshot,
      valuations: [{ ...absent, state: 'missing-fx', currency: 'USD', localMarketValue: money('70.00', 'USD'),
        priceObservationId: 'quote-usd' }] });
    expect(missingFx.valuations[0]?.baseMarketValue).toBeNull();
  });

  it('validates portfolio and recommendation snapshots and preserves their input JSON', () => {
    const parsed = parsePortfolioSnapshot(portfolioSnapshot);
    expect(parsed.valuations[0]?.baseMarketValue?.amount.value).toBe('350.00');
    expect(parsed.classificationIds).toEqual(['sector-itub']);
    expectCode(() => parsePortfolioSnapshot({ ...portfolioSnapshot, baseCurrency: 'BRL',
      valuations: [{ ...portfolioSnapshot.valuations[0], state: 'valued', baseMarketValue: null }] }), 'INVALID_VALUATION_SNAPSHOT');
    expectCode(() => parsePortfolioSnapshot({ ...portfolioSnapshot,
      valuations: [{ ...portfolioSnapshot.valuations[0], state: 'missing-price',
        localMarketValue: null, priceObservationId: null }] }), 'INVALID_VALUATION_SNAPSHOT');
    expectCode(() => parsePortfolioSnapshot({ ...portfolioSnapshot, asOf: '2026-10-31T16:00:00.0001Z',
      cashBalances: [{ ...portfolioSnapshot.cashBalances[0], asOf: '2026-10-31T16:00:00.0009Z' }] }), 'INVALID_PERIOD');
    expectCode(() => parsePortfolioSnapshot({ ...portfolioSnapshot, confirmedEventIds: ['event-1', 'event-1'] }), 'DUPLICATE');
    const recommendation = parseRecommendationSnapshot({ schemaVersion: '1.0', recommendationId: 'recommendation-1',
      decisionId: 'sha256-decision-id', generatedAt: stamp, engineVersion: 'engine-1.0', policyVersion: 'policy-1.0',
      portfolioSnapshot, inputSnapshot: { market: { price: '35.00' }, parameters: { baseCurrency: 'BRL' } },
      outputSnapshot: { status: 'simulation', purchases: [] }, observationIds: ['quote-itub4'] });
    expect(recommendation.inputSnapshot).toEqual({ market: { price: '35.00' }, parameters: { baseCurrency: 'BRL' } });
    expect(Object.isFrozen(recommendation.inputSnapshot)).toBe(true);
  });
});
