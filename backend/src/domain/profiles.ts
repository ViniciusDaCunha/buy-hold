import type { ProfileId } from './profile-ids';
import type { units } from './validation';
import { freeze } from './validation';

export interface ProfileRule {
  readonly id: string;
  readonly unit: typeof units[number];
  readonly direction: 'H' | 'L';
  readonly anchors: readonly number[];
  readonly weightBps: number;
  readonly kind: 'metric' | 'qualitative';
  readonly block: string;
  readonly temporal: 'quality-history' | 'risk-history' | 'current';
  readonly critical: boolean;
}
export interface ProfileDefinition {
  readonly id: ProfileId;
  readonly purchaseSupported: boolean;
  readonly reasonCode: string | null;
  readonly metricValidityDays: number;
  readonly quality: readonly ProfileRule[];
  readonly multiples: readonly ProfileRule[];
  readonly lookThroughWeightBps: number;
  readonly minimumLookThroughCoverageBps: number;
}

// Catálogo declarativo da política fornecida. Avaliação pertence a T04–T06.
function metric(id: string, unit: ProfileRule['unit'], direction: 'H' | 'L', anchors: number[], weightBps: number,
  block: string, temporal: ProfileRule['temporal'] = 'current', critical = false): ProfileRule {
  return { id, unit, direction, anchors, weightBps, block, temporal, critical, kind: 'metric' };
}
function rubric(id: string, weightBps: number, block: string): ProfileRule {
  // Rubricas usam diretamente a nota documentada; as âncoras de identidade não inferem Q.
  return { ...metric(id, 'percent', 'H', [0, 60, 100], weightBps, block), kind: 'qualitative' };
}
const business = ['predictability', 'competitive-advantage', 'governance', 'capital-allocation'].map(id => rubric(id, 625, 'business'));
const nonFinancial = [
  metric('roic-spread', 'pp', 'H', [-2, 0, 3], 2100, 'profitability', 'quality-history'),
  metric('margin-stability', 'pp', 'H', [-6, -2, 0], 900, 'profitability', 'quality-history'),
  metric('net-debt-ebitda', 'ratio', 'L', [1.5, 2.5, 4], 1500, 'solidity', 'risk-history', true),
  metric('interest-cover', 'ratio', 'H', [1.5, 3, 5], 1000, 'solidity', 'risk-history', true),
  ...business,
  metric('cash-conversion', 'ratio', 'H', [0.5, 0.8, 1], 1000, 'income', 'quality-history'),
  rubric('productive-reinvestment', 600, 'income'), rubric('sustainable-distribution', 400, 'income'),
];
function profile(id: ProfileId, quality: ProfileRule[], multiples: ProfileRule[], metricValidityDays: number): ProfileDefinition {
  return { id, quality, multiples, metricValidityDays, purchaseSupported: true, reasonCode: null,
    lookThroughWeightBps: 0, minimumLookThroughCoverageBps: 0 };
}
function brick(id: 'fii-logistics' | 'fii-shopping', vacancy: number[], tenant: number[], pb: number[]): ProfileDefinition {
  return profile(id, [
    metric('vacancy', 'percent', 'L', vacancy, 1500, 'operation'),
    metric('real-revenue-growth', 'percent', 'H', [-5, 0, 3], 1500, 'operation'),
    metric('largest-tenant', 'percent', 'L', tenant, 1250, 'solidity', 'current', true),
    metric('obligations-assets', 'percent', 'L', [10, 20, 35], 1250, 'solidity', 'current', true),
    ...['location-liquidity', 'physical-quality-capex', 'contracts-expirations', 'governance-allocation'].map(id => rubric(id, 625, 'business')),
    metric('distribution-cover', 'ratio', 'H', [0.8, 0.95, 1.05], 1400, 'income'),
    metric('real-distribution-growth', 'percent', 'H', [-5, 0, 3], 600, 'income'),
  ], [metric('pb', 'ratio', 'L', pb, 10000, 'multiple')], 75);
}
export const profiles: readonly ProfileDefinition[] = freeze([
  profile('industrial', nonFinancial, [metric('pe', 'ratio', 'L', [10, 16, 24], 5000, 'multiple'), metric('ev-ebitda', 'ratio', 'L', [6, 9, 14], 5000, 'multiple')], 150),
  profile('consumer-staples', nonFinancial, [metric('pe', 'ratio', 'L', [12, 18, 27], 5000, 'multiple'), metric('ev-ebitda', 'ratio', 'L', [7, 11, 16], 5000, 'multiple')], 150),
  profile('bank', [
    metric('roe-spread', 'pp', 'H', [-3, 0, 4], 2100, 'profitability', 'quality-history'),
    metric('profitable-years', 'percent', 'H', [40, 60, 100], 900, 'profitability'),
    metric('cet1-headroom', 'pp', 'H', [0, 2, 4], 1250, 'solidity', 'risk-history', true),
    metric('default-cover', 'percent', 'H', [80, 120, 180], 625, 'solidity', 'risk-history', true),
    metric('npl90', 'percent', 'L', [2, 4, 7], 625, 'solidity', 'risk-history', true),
    ...business, rubric('credit-vintages', 1200, 'income'), rubric('productive-reinvestment', 400, 'income'), rubric('sustainable-distribution', 400, 'income'),
  ], [metric('pe', 'ratio', 'L', [7, 11, 17], 5000, 'multiple'), metric('pb', 'ratio', 'L', [0.8, 1.5, 2.5], 5000, 'multiple')], 150),
  { ...profile('holding', [metric('holding-debt-nav', 'percent', 'L', [0, 10, 25], 1000, 'solidity', 'risk-history', true),
    rubric('holding-governance-costs', 1000, 'business')], [metric('nav-discount', 'percent', 'H', [0, 15, 30], 10000, 'multiple')], 150),
    lookThroughWeightBps: 8000, minimumLookThroughCoverageBps: 8000 },
  brick('fii-logistics', [3, 8, 18], [15, 30, 50], [0.9, 1.05, 1.25]),
  brick('fii-shopping', [3, 7, 15], [5, 10, 20], [0.85, 1, 1.2]),
  profile('fii-credit', [
    metric('default-exposure', 'percent', 'L', [0, 2, 5], 1500, 'credit', 'current', true),
    rubric('repayment-provisions-losses', 1500, 'credit'),
    metric('largest-debtor', 'percent', 'L', [5, 10, 20], 1250, 'solidity', 'current', true),
    metric('ltv', 'percent', 'L', [50, 65, 80], 1250, 'solidity', 'current', true),
    rubric('origination-transparency-recovery', 2500, 'business'),
    metric('distribution-cover', 'ratio', 'H', [0.8, 0.95, 1.05], 2000, 'income'),
  ], [metric('pb', 'ratio', 'L', [0.95, 1.03, 1.12], 10000, 'multiple')], 75),
  profile('etf-broad', [
    metric('total-fee', 'percent', 'L', [0.2, 0.5, 0.9], 2500, 'costs'),
    metric('tracking-error', 'percent', 'L', [0.5, 1.5, 3], 1250, 'tracking'),
    metric('annual-drag', 'pp', 'L', [0, 0.5, 1.5], 1250, 'tracking'),
    metric('trading-spread', 'percent', 'L', [0.1, 0.3, 0.8], 2000, 'execution'),
    rubric('mandate-structure', 3000, 'business'),
  ], [], 120),
  { ...profile('etf-dividend', [], [], 120), purchaseSupported: false, reasonCode: 'UNSUPPORTED_PURCHASE_PROFILE' },
]);
export const policyConventions = freeze({
  version: '1.0', catalogVersion: '1.0', historyWeightBps: 7000, currentWeightBps: 3000,
  minimumComparableYears: 3, preferredComparableYears: 5, riskComparableYears: 3,
  qualitativeValidityDays: 180, etfValidityDays: 120, fiiValidityDays: 75,
  valuationReviewDays: 30, fxValidityDays: 1,
  confidenceWeightsBps: { coverage: 4000, freshness: 2500, traceability: 2000, consistency: 1500 },
  minimumCoverageBps: 8000, minimumConfidence: 80, fullQuality: 75, conditionalQuality: 65,
  minimumSolidity: 50, minimumBusiness: 50,
  etfMaxPremiumPercent: '0.5', etfSpreadMultiplier: '2',
});
