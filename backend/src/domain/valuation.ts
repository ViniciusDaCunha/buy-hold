import type { SimulationInput } from './input';
import { evaluateQuality, type QualityEvaluation } from './quality';
import { profiles, type ProfileDefinition, type ProfileRule } from './profiles';
import { scoreRule, type ExactScore } from './scoring';
import { ageDays, freeze } from './validation';

export interface ValuationEvidence {
  readonly ruleId: string;
  readonly observedValue: string | null;
  readonly unit: string;
  readonly anchors: readonly number[];
  readonly score: ExactScore | null;
  readonly applicability: 'applicable' | 'not-applicable' | 'missing' | 'stale';
  readonly source: string | null;
  readonly period: Readonly<{ start: string; end: string }> | null;
  readonly reasonCode: string;
}

export interface AssetAssessment {
  readonly ticker: string;
  readonly profileId: string;
  readonly qualityScore: ExactScore | null;
  readonly confidenceScore: ExactScore;
  readonly fundamentalScore: ExactScore | null;
  readonly multipleScore: ExactScore | null;
  readonly priceScore: ExactScore | null;
  readonly safetyMarginBps: number | null;
  readonly priceLimitCents: bigint | null;
  readonly priceLabel: 'attractive' | 'reasonable' | 'stretched' | 'expensive' | 'not-assessed' | 'inconclusive';
  readonly valuationStatus: 'assessed' | 'not-assessed' | 'inconclusive';
  readonly valuationLabel: string;
  readonly executionStatus: 'not-applicable' | 'validated' | 'review';
  readonly eligibilityState: 'full' | 'conditional' | 'hold' | 'watch' | 'review-exit';
  readonly purchaseEligible: boolean;
  readonly conditionalRestrictions: boolean;
  readonly evidences: readonly ValuationEvidence[];
  readonly reasonCodes: readonly string[];
}

export interface MarginOptions {
  readonly cyclical?: boolean;
  readonly materialUncertainty?: boolean;
}

interface Rational { readonly numerator: bigint; readonly denominator: bigint }

const ZERO: ExactScore = Object.freeze({ numerator: 0n, denominator: 1n });

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator = 1n): ExactScore {
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return Object.freeze({ numerator: numerator / divisor * sign, denominator: denominator / divisor * sign });
}

function decimal(value: string): Rational {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return ZERO;
  const fraction = match[3] ?? '';
  return rational(BigInt(`${match[1] ?? ''}${match[2]}${fraction}`), 10n ** BigInt(fraction.length));
}

function compare(left: Rational, right: Rational | number): number {
  const checked = typeof right === 'number' ? rational(BigInt(right)) : right;
  const difference = left.numerator * checked.denominator - checked.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function add(left: Rational, right: Rational): ExactScore {
  return rational(left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator);
}

function multiply(value: Rational, numerator: bigint, denominator = 1n): ExactScore {
  return rational(value.numerator * numerator, value.denominator * denominator);
}

function weighted(parts: readonly { readonly score: ExactScore; readonly weight: number }[]): ExactScore {
  const total = parts.reduce((sum, part) => sum + part.weight, 0);
  if (total === 0) return ZERO;
  const common = parts.reduce((product, part) => product * part.score.denominator, 1n);
  return rational(parts.reduce((sum, part) => sum + part.score.numerator *
    (common / part.score.denominator) * BigInt(part.weight), 0n), common * BigInt(total));
}

function meets(score: ExactScore | null, threshold: number): boolean {
  return score !== null && score.numerator >= BigInt(threshold) * score.denominator;
}

export function calculateSafetyMargin(quality: ExactScore, confidence: ExactScore,
  options: MarginOptions = {}): number | null {
  let margin: number;
  if (meets(quality, 85) && meets(confidence, 90)) margin = 1000;
  else if (meets(quality, 75)) margin = 1500;
  else if (meets(quality, 65)) margin = 2500;
  else return null;
  if (options.cyclical) margin = Math.max(margin, 2500);
  if (options.materialUncertainty) margin += 500;
  return margin;
}

function metric(input: SimulationInput, ticker: string, suffix: string) {
  return [...input.marketSnapshot.metrics].filter(row => row.ticker === ticker && row.ruleId.endsWith(`.${suffix}`))
    .sort((left, right) => {
      const a = `${left.publishedOn}/${left.period.end}/${left.period.start}/${left.source}`;
      const b = `${right.publishedOn}/${right.period.end}/${right.period.start}/${right.source}`;
      return a < b ? 1 : a > b ? -1 : 0;
    })[0];
}

function isPositive(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && compare(decimal(value), 0) > 0;
}

function fundamentalScore(price: bigint, base: bigint): ExactScore {
  const discount = rational(base - price, base);
  const lower = rational(-1n, 5n);
  const upper = rational(1n, 4n);
  if (compare(discount, lower) <= 0) return ZERO;
  if (compare(discount, 0) <= 0) return add(rational(60n), multiply(discount, 300n));
  if (compare(discount, upper) < 0) return add(rational(60n), multiply(discount, 160n));
  return rational(100n);
}

function multipleEvidence(input: SimulationInput, ticker: string, profile: ProfileDefinition, rule: ProfileRule): ValuationEvidence {
  const ruleId = `${profile.id}.${rule.id}`;
  const row = metric(input, ticker, rule.id);
  const supporting = rule.id === 'pe' ? metric(input, ticker, 'normalized-profit') :
    rule.id === 'ev-ebitda' ? metric(input, ticker, 'ebitda') : undefined;
  const unsupportedReason = rule.id === 'pe' && !isPositive(supporting?.value) ? 'NON_POSITIVE_NORMALIZED_PROFIT' :
    rule.id === 'ev-ebitda' && !isPositive(supporting?.value) ? 'NON_POSITIVE_EBITDA' :
    row?.value !== null && row?.value !== undefined && !isPositive(row.value) ? 'NON_POSITIVE_MULTIPLE' : null;
  if (unsupportedReason !== null) return freeze({ ruleId, observedValue: row?.value ?? null, unit: rule.unit,
    anchors: rule.anchors, score: null, applicability: 'not-applicable' as const, source: row?.source ?? null,
    period: row?.period ?? null, reasonCode: unsupportedReason });
  if (!row || row.value === null) return freeze({ ruleId, observedValue: null, unit: rule.unit, anchors: rule.anchors,
    score: null, applicability: 'missing' as const, source: null, period: null, reasonCode: 'MISSING_MULTIPLE' });
  const configured = input.policy.rules.find(candidate => candidate.id === ruleId);
  if (!configured || configured.direction === 'RAW') return freeze({ ruleId, observedValue: row.value, unit: rule.unit,
    anchors: rule.anchors, score: null, applicability: 'missing' as const, source: row.source, period: row.period,
    reasonCode: 'MISSING_MULTIPLE_RULE' });
  const usesPublication = profile.id.startsWith('fii-');
  const fresh = ageDays(usesPublication ? row.publishedOn : row.period.end, input.analysisAsOf) <= profile.metricValidityDays;
  return freeze({ ruleId, observedValue: row.value, unit: rule.unit, anchors: configured.anchors,
    score: fresh ? scoreRule(configured, row.value).score : null, applicability: fresh ? 'applicable' as const : 'stale' as const,
    source: row.source, period: row.period, reasonCode: fresh ? 'MULTIPLE_EVIDENCE' : 'STALE_MULTIPLE' });
}

function eventReasons(input: SimulationInput, ticker: string): string[] {
  const events = [
    ['suspended', 'TRADING_SUSPENDED'], ['capital-breach', 'CAPITAL_OR_OBLIGATION_BREACH'],
    ['continuity-risk', 'UNRESOLVED_CONTINUITY_RISK'], ['fraud', 'CONFIRMED_MATERIAL_FRAUD'],
    ['credit-event-unreviewed', 'UNREVIEWED_CREDIT_EVENT'],
  ] as const;
  return events.flatMap(([suffix, reason]) => isPositive(metric(input, ticker, suffix)?.value) ? [reason] : []);
}

function fundamentalEvidence(valuation: SimulationInput['providedValuations'][number], price: bigint,
  score: ExactScore): ValuationEvidence {
  const discount = rational(valuation.baseCents - price, valuation.baseCents);
  return freeze({ ruleId: 'fundamental-discount', observedValue: discount.denominator === 1n ?
    String(discount.numerator) : `${discount.numerator}/${discount.denominator}`,
    unit: 'ratio', anchors: [-0.2, 0, 0.25], score,
    applicability: 'applicable' as const, source: valuation.source, period: valuation.period,
    reasonCode: 'FUNDAMENTAL_VALUATION' });
}

function classifyPrice(price: bigint, ceiling: bigint, base: bigint): AssetAssessment['priceLabel'] {
  if (price <= ceiling) return 'attractive';
  if (price <= base) return 'reasonable';
  if (price * 5n <= base * 6n) return 'stretched';
  return 'expensive';
}

function baseEligibility(quality: QualityEvaluation, profile: ProfileDefinition): {
  state: AssetAssessment['eligibilityState']; reasons: string[];
} {
  const reasons = [...quality.reasonCodes];
  if (!meets(quality.confidenceScore, 80)) reasons.push('CONFIDENCE_BELOW_80');
  const solidity = quality.blockScores.solidity;
  const business = quality.blockScores.business;
  if (solidity && !meets(solidity, 50)) reasons.push('SOLIDITY_BELOW_50');
  if (business && !meets(business, 50)) reasons.push('BUSINESS_BELOW_50');
  if (profile.id === 'holding') {
    const ownSolidity = quality.evidences.find(row => row.ruleId === 'holding.holding-debt-nav');
    const ownBusiness = quality.evidences.find(row => row.ruleId === 'holding.holding-governance-costs');
    if (ownSolidity && !meets(ownSolidity.score, 50)) reasons.push('SOLIDITY_BELOW_50');
    if (ownBusiness && !meets(ownBusiness.score, 50)) reasons.push('BUSINESS_BELOW_50');
  }
  if (!quality.sufficientForPurchase || reasons.includes('CONFIDENCE_BELOW_80') || reasons.includes('SOLIDITY_BELOW_50') ||
      reasons.includes('BUSINESS_BELOW_50')) return { state: 'watch', reasons };
  if (meets(quality.qualityScore, 75)) return { state: 'full', reasons };
  if (meets(quality.qualityScore, 65)) return { state: 'conditional', reasons };
  if (meets(quality.qualityScore, 60)) return { state: 'hold', reasons };
  return { state: 'watch', reasons };
}

function etfExecution(input: SimulationInput, ticker: string, profile: ProfileDefinition, quotePrice: bigint) {
  const premiumRow = metric(input, ticker, 'nav-premium');
  const spreadRow = metric(input, ticker, 'median-spread');
  const marketRow = metric(input, ticker, 'underlying-market-open');
  const rows = [premiumRow, spreadRow, marketRow];
  const fresh = rows.every(row => row && row.value !== null &&
    ageDays(row.publishedOn, input.analysisAsOf) <= profile.metricValidityDays);
  const evidences: ValuationEvidence[] = [
    ['nav-premium', premiumRow, 'percent'], ['median-spread', spreadRow, 'percent'],
    ['underlying-market-open', marketRow, 'count'],
  ].map(([ruleId, row, unit]) => {
    const observation = typeof row === 'object' ? row : undefined;
    const current = observation?.value !== null && observation?.value !== undefined &&
      ageDays(observation.publishedOn, input.analysisAsOf) <= profile.metricValidityDays;
    return freeze({ ruleId: `${profile.id}.${String(ruleId)}`, observedValue: observation?.value ?? null,
      unit: String(unit), anchors: [], score: null, applicability: !observation || observation.value === null ? 'missing' as const :
        current ? 'applicable' as const : 'stale' as const, source: observation?.source ?? null,
      period: observation?.period ?? null, reasonCode: !observation || observation.value === null ? 'MISSING_ETF_EXECUTION_DATA' :
        current ? 'ETF_EXECUTION_EVIDENCE' : 'STALE_ETF_EXECUTION_DATA' });
  });
  evidences.push(freeze({ ruleId: `${profile.id}.underlying-valuation`, observedValue: null, unit: 'ratio', anchors: [],
    score: null, applicability: 'not-applicable' as const, source: null, period: null,
    reasonCode: 'UNDERLYING_VALUATION_NOT_ASSESSED' }));
  if (!fresh || !premiumRow?.value || !spreadRow?.value || !marketRow?.value) return { valid: false, limit: null, evidences };
  const premium = decimal(premiumRow.value);
  const spread = decimal(spreadRow.value);
  const absolutePremium = rational(premium.numerator < 0n ? -premium.numerator : premium.numerator, premium.denominator);
  const allowedBySpread = multiply(spread, 2n);
  const allowed = compare(allowedBySpread, rational(1n, 2n)) < 0 ? allowedBySpread : rational(1n, 2n);
  const marketOpen = compare(decimal(marketRow.value), rational(1n)) === 0;
  const valid = marketOpen && compare(absolutePremium, rational(1n, 2n)) <= 0 && compare(absolutePremium, allowedBySpread) <= 0 &&
    compare(add(rational(100n), premium), 0) > 0;
  if (!valid) return { valid: false, limit: null, evidences };
  const limitRatio = rational((100n * allowed.denominator + allowed.numerator) * premium.denominator,
    allowed.denominator * (100n * premium.denominator + premium.numerator));
  return { valid: true, limit: quotePrice * limitRatio.numerator / limitRatio.denominator, evidences };
}

function evaluateAsset(input: SimulationInput, quality: QualityEvaluation): AssetAssessment {
  const position = input.portfolio.positions.find(row => row.ticker === quality.ticker)!;
  const profile = profiles.find(row => row.id === position.profileId)!;
  const quote = input.marketSnapshot.quotes.find(row => row.ticker === position.ticker);
  const state = baseEligibility(quality, profile);
  const reasons = new Set([...state.reasons, ...eventReasons(input, position.ticker)]);
  const hardEvents = ['TRADING_SUSPENDED', 'CAPITAL_OR_OBLIGATION_BREACH', 'UNRESOLVED_CONTINUITY_RISK',
    'CONFIRMED_MATERIAL_FRAUD', 'UNREVIEWED_CREDIT_EVENT'];
  let eligibilityState = state.state;
  let conditionalRestrictions = eligibilityState === 'conditional';
  let purchaseEligible = eligibilityState === 'full' || eligibilityState === 'conditional';
  const previous = input.previousEligibility.find(row => row.ticker === position.ticker);
  if (previous && previous.policyVersion !== input.policyVersion) reasons.add('PREVIOUS_STATE_VERSION_MISMATCH');
  if (profile.id !== 'etf-broad' && previous?.policyVersion === input.policyVersion && previous.state === 'full' && eligibilityState === 'conditional' &&
      meets(quality.qualityScore, 70)) {
    eligibilityState = 'full'; conditionalRestrictions = true; purchaseEligible = true;
    reasons.add('FULL_STATE_RETAINED_BY_HYSTERESIS');
  }
  if (position.quantity === 0 && eligibilityState === 'conditional') {
    eligibilityState = 'watch'; purchaseEligible = false; reasons.add('CONDITIONAL_NEW_POSITION');
  }
  if (!profile.purchaseSupported) {
    purchaseEligible = false; eligibilityState = 'watch'; reasons.add(profile.reasonCode ?? 'UNSUPPORTED_PURCHASE_PROFILE');
  }
  if ([...reasons].some(reason => hardEvents.includes(reason))) {
    purchaseEligible = false;
    eligibilityState = reasons.has('CONFIRMED_MATERIAL_FRAUD') || reasons.has('CAPITAL_OR_OBLIGATION_BREACH') ? 'review-exit' : 'watch';
  }

  if (profile.id === 'etf-broad' && quote) {
    const execution = etfExecution(input, position.ticker, profile, quote.priceCents);
    reasons.add('UNDERLYING_VALUATION_NOT_ASSESSED');
    if (!meets(quality.qualityScore, 75)) {
      reasons.add('ETF_QUALITY_BELOW_75'); purchaseEligible = false;
      if (eligibilityState === 'full' || eligibilityState === 'conditional') eligibilityState = 'hold';
    }
    if (!execution.valid) {
      reasons.add('ETF_EXECUTION_REVIEW'); purchaseEligible = false;
      if (eligibilityState === 'full' || eligibilityState === 'conditional') eligibilityState = 'hold';
    }
    return freeze({ ticker: position.ticker, profileId: profile.id, qualityScore: quality.qualityScore,
      confidenceScore: quality.confidenceScore, fundamentalScore: null, multipleScore: null, priceScore: null,
      safetyMarginBps: null, priceLimitCents: execution.limit, priceLabel: 'not-assessed' as const,
      valuationStatus: 'not-assessed' as const, valuationLabel: 'não avaliado',
      executionStatus: execution.valid ? 'validated' as const : 'review' as const, eligibilityState,
      purchaseEligible, conditionalRestrictions, evidences: execution.evidences, reasonCodes: [...reasons] });
  }
  if (profile.id === 'etf-dividend') return freeze({ ticker: position.ticker, profileId: profile.id,
    qualityScore: quality.qualityScore, confidenceScore: quality.confidenceScore, fundamentalScore: null,
    multipleScore: null, priceScore: null, safetyMarginBps: null, priceLimitCents: null,
    priceLabel: 'not-assessed' as const, valuationStatus: 'not-assessed' as const, valuationLabel: 'não avaliado',
    executionStatus: 'not-applicable' as const, eligibilityState, purchaseEligible: false,
    conditionalRestrictions: false, evidences: [], reasonCodes: [...reasons] });

  const multiples = profile.multiples.map(rule => multipleEvidence(input, position.ticker, profile, rule));
  const applicableMultiples = multiples.filter(row => row.applicability === 'applicable' && row.score !== null);
  const missingMultiple = multiples.some(row => row.applicability === 'missing' || row.applicability === 'stale');
  const multipleScore = missingMultiple || applicableMultiples.length === 0 ? null :
    weighted(applicableMultiples.map(row => ({ score: row.score!, weight: 1 })));
  for (const evidence of multiples) if (evidence.reasonCode !== 'MULTIPLE_EVIDENCE') reasons.add(evidence.reasonCode);
  const valuation = input.providedValuations.find(row => row.ticker === position.ticker);
  const valuationFresh = valuation !== undefined && ageDays(valuation.publishedOn, input.analysisAsOf) <= input.policy.validityDays.valuation;
  if (!valuation || !quote || !valuationFresh || multipleScore === null) {
    const valuationReason = !valuation ? 'MISSING_VALUATION' : !valuationFresh ? 'STALE_VALUATION' :
      !quote ? 'MISSING_PRICE' : 'INCONCLUSIVE_MULTIPLES';
    reasons.add(valuationReason);
    const valuationEvidence = freeze({ ruleId: 'fundamental-discount', observedValue: null, unit: 'ratio',
      anchors: [-0.2, 0, 0.25], score: null, applicability: !valuation ? 'missing' as const :
        !valuationFresh ? 'stale' as const : 'missing' as const, source: valuation?.source ?? null,
      period: valuation?.period ?? null, reasonCode: valuationReason });
    return freeze({ ticker: position.ticker, profileId: profile.id, qualityScore: quality.qualityScore,
      confidenceScore: quality.confidenceScore, fundamentalScore: null, multipleScore, priceScore: null,
      safetyMarginBps: null, priceLimitCents: null, priceLabel: 'inconclusive' as const,
      valuationStatus: 'inconclusive' as const, valuationLabel: 'inconclusivo', executionStatus: 'not-applicable' as const,
      eligibilityState: 'watch' as const, purchaseEligible: false, conditionalRestrictions: false,
      evidences: [valuationEvidence, ...multiples], reasonCodes: [...reasons] });
  }
  const fundamental = fundamentalScore(quote.priceCents, valuation.baseCents);
  const priceScore = weighted([{ score: fundamental, weight: 7500 }, { score: multipleScore, weight: 2500 }]);
  const materialUncertainty = isPositive(metric(input, position.ticker, 'material-uncertainty')?.value);
  const margin = quality.qualityScore ? calculateSafetyMargin(quality.qualityScore, quality.confidenceScore,
    { materialUncertainty }) : null;
  const priceLimit = margin === null ? null : valuation.baseCents * BigInt(10000 - margin) / 10000n < valuation.conservativeCents ?
    valuation.baseCents * BigInt(10000 - margin) / 10000n : valuation.conservativeCents;
  const terminalShare = metric(input, position.ticker, 'terminal-share');
  const highTerminal = terminalShare?.value !== null && terminalShare?.value !== undefined && compare(decimal(terminalShare.value), rational(70n)) > 0;
  if (highTerminal) {
    reasons.add('HIGH_TERMINAL_SENSITIVITY');
    if (eligibilityState === 'full') { eligibilityState = position.quantity > 0 ? 'conditional' : 'watch'; conditionalRestrictions = true; }
  }
  const label = priceLimit === null ? 'inconclusive' : classifyPrice(quote.priceCents, priceLimit, valuation.baseCents);
  if (priceLimit === null) {
    purchaseEligible = false;
    if (eligibilityState === 'full' || eligibilityState === 'conditional') eligibilityState = 'hold';
    reasons.add('QUALITY_BELOW_MARGIN_THRESHOLD');
  } else if (quote.priceCents > priceLimit) {
    purchaseEligible = false;
    if (eligibilityState === 'full' || eligibilityState === 'conditional') eligibilityState = 'hold';
    reasons.add('PRICE_ABOVE_CEILING');
  }
  const evidence = fundamentalEvidence(valuation, quote.priceCents, fundamental);
  return freeze({ ticker: position.ticker, profileId: profile.id, qualityScore: quality.qualityScore,
    confidenceScore: quality.confidenceScore, fundamentalScore: fundamental, multipleScore, priceScore,
    safetyMarginBps: margin, priceLimitCents: priceLimit, priceLabel: label, valuationStatus: 'assessed' as const,
    valuationLabel: 'avaliado', executionStatus: 'not-applicable' as const, eligibilityState, purchaseEligible,
    conditionalRestrictions, evidences: [evidence, ...multiples], reasonCodes: [...reasons] });
}

export function evaluateValuationAndEligibility(input: SimulationInput,
  quality: readonly QualityEvaluation[] = evaluateQuality(input)): readonly AssetAssessment[] {
  return freeze(input.portfolio.positions.map(position => {
    const evaluation = quality.find(row => row.ticker === position.ticker);
    if (!evaluation) throw new Error(`Avaliação de qualidade ausente para ${position.ticker}.`);
    return evaluateAsset(input, evaluation);
  }));
}
