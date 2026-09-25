// Fixture mínima de contrato; não é um cenário financeiro de T03.
export function inputFixture() {
  const metadata = () => ({
    period: { start: '2025-01-01', end: '2025-12-31' },
    publishedOn: '2026-02-01', collectedOn: '2026-09-14',
    source: 'fixture fictícia', method: 'provided_fixture', adjustments: 'nenhum',
  });
  return {
    schemaVersion: '1.0', policyVersion: '1.0', fixtureVersion: 'test-1',
    scenarioId: 'contract-test', analysisAsOf: '2026-09-14', aporteCents: '50000',
    portfolio: {
      cashCents: '100', releasedCashCents: '25', reinvestmentCents: '25',
      positions: [{ ticker: 'TEST', currency: 'BRL', classId: 'stocks', profileId: 'industrial', quantity: 1, targetBps: 1000 }],
    },
    policy: {
      version: '1.0', classes: [{ id: 'stocks', targetBps: 1000 }], cashTargetBps: 9000,
      limits: { individualBps: 1000, etfBps: 4000, sectorBps: 2500, groupBps: 1500, conditionalBps: 2000, maxPurchases: 5 },
      priceReserve: '0.005',
      validityDays: { metric: 365, qualitative: 365, valuation: 365, fx: 1 },
      rules: [{ id: 'profit', unit: 'BRL', direction: 'H', anchors: [-2, 0, 3], weightBps: 10000 }],
    },
    marketSnapshot: {
      lastTradingDate: '2026-09-11',
      quotes: [{ ticker: 'TEST', currency: 'BRL', priceCents: '1000', asOf: '2026-09-11', source: 'fixture' }],
      metrics: [{ ticker: 'TEST', ruleId: 'profit', value: '-1.25' as string | null, unit: 'BRL', ...metadata() }],
      exposures: [{ ticker: 'TEST', sector: 'industry', group: 'synthetic', weightBps: 10000 }],
    },
    qualitativeAssessments: [{ ticker: 'TEST', ruleId: 'governance', score: 75 as number | null, reason: 'evidência fictícia', reviewTrigger: 'mudança na gestão', ...metadata() }],
    providedValuations: [{ ticker: 'TEST', currency: 'BRL', conservativeCents: '1500', baseCents: '2000', favorableCents: '2500', provenance: 'provided_fixture', ...metadata() }],
    costs: { fixedCents: '0', variableRate: '0', fxSpread: '0', remittanceCents: '0' },
    fx: null as null | { from: string; to: string; rate: string; asOf: string; source: string },
  };
}
