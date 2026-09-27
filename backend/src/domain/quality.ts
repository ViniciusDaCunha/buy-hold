import type { SimulationInput } from './input';
import type { ProfileDefinition, ProfileRule } from './profiles';
import { policyConventions, profiles } from './profiles';
import { scoreRule, type ExactScore } from './scoring';
import { ageDays, freeze } from './validation';

interface QualityObservation {
  readonly basis: 'current' | 'historical' | 'qualitative';
  readonly observedValue: string;
  readonly score: ExactScore;
  readonly source: string;
  readonly period: Readonly<{ start: string; end: string }>;
}

export interface QualityEvidence {
  readonly ruleId: string;
  readonly block: string;
  readonly applicability: 'applicable' | 'unsupported';
  readonly observedValue: string | null;
  readonly unit: string;
  readonly anchors: readonly number[];
  readonly score: ExactScore;
  readonly observations: readonly QualityObservation[];
  readonly coverage: boolean;
  readonly fresh: boolean;
  readonly traceable: boolean;
  readonly consistent: boolean;
  readonly source: string | null;
  readonly period: Readonly<{ start: string; end: string }> | null;
  readonly reasonCode: string;
}

export interface QualityEvaluation {
  readonly ticker: string;
  readonly profileId: string;
  readonly qualityScore: ExactScore | null;
  readonly confidenceScore: ExactScore;
  readonly coverageBps: number;
  readonly blockScores: Readonly<Record<string, ExactScore>>;
  readonly evidences: readonly QualityEvidence[];
  readonly reasonCodes: readonly string[];
  readonly sufficientForPurchase: boolean;
}

interface MetricRow {
  readonly ruleId: string;
  readonly value: string | null;
  readonly basis: 'current' | 'historical';
  readonly sampleCount: number;
  readonly period: Readonly<{ start: string; end: string }>;
  readonly publishedOn: string;
  readonly source: string;
  readonly method: string;
}

interface QualitativeRow {
  readonly ruleId: string;
  readonly score: number | null;
  readonly reason: string;
  readonly reviewTrigger: string;
  readonly period: Readonly<{ start: string; end: string }>;
  readonly publishedOn: string;
  readonly source: string;
  readonly method: string;
}

const ZERO: ExactScore = Object.freeze({ numerator: 0n, denominator: 1n });
const FIFTY: ExactScore = Object.freeze({ numerator: 50n, denominator: 1n });

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function exact(numerator: bigint, denominator = 1n): ExactScore {
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return Object.freeze({ numerator: numerator / divisor * sign, denominator: denominator / divisor * sign });
}

function weighted(parts: readonly { readonly score: ExactScore; readonly weight: number | bigint }[]): ExactScore {
  const totalWeight = parts.reduce<bigint>((sum, part) => sum + BigInt(part.weight), 0n);
  if (totalWeight === 0n) return ZERO;
  const common = parts.reduce((product, part) => product * part.score.denominator, 1n);
  const numerator = parts.reduce((sum, part) =>
    sum + part.score.numerator * (common / part.score.denominator) * BigInt(part.weight), 0n);
  return exact(numerator, common * totalWeight);
}

function minimum(left: ExactScore, right: ExactScore): ExactScore {
  return left.numerator * right.denominator <= right.numerator * left.denominator ? left : right;
}

function configuredRule(input: SimulationInput, ruleId: string) {
  return input.policy.rules.find(rule => rule.id === ruleId);
}

function scoreMetric(input: SimulationInput, row: MetricRow): ExactScore {
  const rule = configuredRule(input, row.ruleId);
  if (!rule || rule.direction === 'RAW' || row.value === null) return FIFTY;
  return scoreRule(rule, row.value).score;
}

function metricFresh(profile: ProfileDefinition, row: MetricRow, analysisAsOf: string): boolean {
  const usesPublication = row.basis === 'historical' || profile.id.startsWith('fii-') || profile.id.startsWith('etf-');
  return ageDays(usesPublication ? row.publishedOn : row.period.end, analysisAsOf) <= profile.metricValidityDays;
}

function comparableRowsConsistent(rows: readonly MetricRow[], unit: ProfileRule['unit']): boolean {
  const values = rows.flatMap(row => row.value === null ? [] : [Number(row.value)]);
  if (values.length < 2) return true;
  const minimumValue = Math.min(...values);
  const maximumValue = Math.max(...values);
  if (unit === 'percent' || unit === 'pp') return maximumValue - minimumValue <= 1;
  if (minimumValue <= 0) return maximumValue === minimumValue;
  return maximumValue - minimumValue <= minimumValue * 0.05;
}

function metricEvidence(input: SimulationInput, profile: ProfileDefinition, rule: ProfileRule,
  rows: readonly MetricRow[]): QualityEvidence {
  const ordered = [...rows].sort((left, right) => {
    const leftKey = `${left.publishedOn}/${left.period.end}/${left.period.start}/${left.source}/${left.value ?? ''}`;
    const rightKey = `${right.publishedOn}/${right.period.end}/${right.period.start}/${right.source}/${right.value ?? ''}`;
    return leftKey < rightKey ? 1 : leftKey > rightKey ? -1 : 0;
  });
  const currentRows = ordered.filter(row => row.basis === 'current');
  const historicalRows = ordered.filter(row => row.basis === 'historical');
  const current = currentRows[0];
  const historical = historicalRows[0];
  const requiresHistory = rule.temporal !== 'current';
  const required = requiresHistory ? [historical, current] : [current];
  const relevantRows = requiresHistory ? [...historicalRows, ...currentRows] : currentRows;
  const consistent = comparableRowsConsistent(currentRows, rule.unit) &&
    (!requiresHistory || comparableRowsConsistent(historicalRows, rule.unit));
  const enoughHistory = !requiresHistory || (historical?.sampleCount ?? 0) >=
    (rule.temporal === 'risk-history' ? policyConventions.riskComparableYears : policyConventions.minimumComparableYears);
  const coverage = required.every(row => row?.value !== null && row?.value !== undefined) && enoughHistory;
  const available = relevantRows.filter((row): row is MetricRow => row.value !== null);
  const observations = available.map(row => ({ basis: row.basis, observedValue: row.value!, score: scoreMetric(input, row),
    source: row.source, period: row.period }));
  let score = FIFTY;
  if (coverage && current) {
    const currentScore = scoreMetric(input, current);
    if (rule.temporal === 'quality-history' && historical) {
      score = weighted([{ score: scoreMetric(input, historical), weight: policyConventions.historyWeightBps },
        { score: currentScore, weight: policyConventions.currentWeightBps }]);
    } else if (rule.temporal === 'risk-history' && historical) score = minimum(scoreMetric(input, historical), currentScore);
    else score = currentScore;
  }
  const fresh = coverage && relevantRows.every(row => metricFresh(profile, row, input.analysisAsOf));
  const traceable = coverage && relevantRows.every(row => row.source.length > 0 && row.method.length > 0);
  const values = available.map(row => row.value!);
  return freeze({ ruleId: `${profile.id}.${rule.id}`, block: rule.block, applicability: 'applicable' as const,
    observedValue: coverage ? (values.every(value => value === values[0]) ? values[0]! : values.join('|')) : null,
    unit: rule.unit, anchors: configuredRule(input, `${profile.id}.${rule.id}`)?.anchors ?? [],
    score, observations, coverage, fresh, traceable, consistent,
    source: coverage ? available.map(row => row.source).join(' | ') : null,
    period: coverage ? { start: available.reduce((date, row) => row.period.start < date ? row.period.start : date, available[0]!.period.start),
      end: available.reduce((date, row) => row.period.end > date ? row.period.end : date, available[0]!.period.end) } : null,
    reasonCode: !coverage ? (requiresHistory && !enoughHistory ? 'INSUFFICIENT_HISTORY' : 'MISSING_APPLICABLE_EVIDENCE') :
      !consistent ? 'UNRESOLVED_CONFLICT' : !fresh ? 'STALE_QUALITY_DATA' :
        !traceable ? 'UNTRACEABLE_EVIDENCE' : 'QUALITY_EVIDENCE' });
}

function qualitativeEvidence(input: SimulationInput, profile: ProfileDefinition, rule: ProfileRule,
  row: QualitativeRow | undefined): QualityEvidence {
  const coverage = row?.score !== null && row?.score !== undefined;
  const validity = profile.id.startsWith('etf-') ? policyConventions.etfValidityDays : policyConventions.qualitativeValidityDays;
  const fresh = coverage && ageDays(row.publishedOn, input.analysisAsOf) <= validity;
  const traceable = coverage && row.source.length > 0 && row.method.length > 0 && row.reason.length > 0 && row.reviewTrigger.length > 0;
  const score = coverage ? exact(BigInt(row.score!)) : FIFTY;
  return freeze({ ruleId: `${profile.id}.${rule.id}`, block: rule.block, applicability: 'applicable' as const,
    observedValue: coverage ? String(row.score) : null, unit: rule.unit,
    anchors: configuredRule(input, `${profile.id}.${rule.id}`)?.anchors ?? [], score,
    observations: coverage ? [{ basis: 'qualitative' as const, observedValue: String(row.score), score,
      source: row.source, period: row.period }] : [], coverage, fresh, traceable, consistent: true,
    source: coverage ? row.source : null, period: coverage ? row.period : null,
    reasonCode: !coverage ? 'MISSING_APPLICABLE_EVIDENCE' : !fresh ? 'STALE_QUALITY_DATA' :
      !traceable ? 'UNTRACEABLE_EVIDENCE' : 'QUALITY_EVIDENCE' });
}

function confidence(evidences: readonly QualityEvidence[], rules: readonly ProfileRule[]) {
  const totalWeight = rules.reduce((sum, rule) => sum + rule.weightBps, 0);
  if (totalWeight === 0) return { score: ZERO, coverageBps: 0 };
  const component = (key: 'coverage' | 'fresh' | 'traceable' | 'consistent') => {
    const met = evidences.reduce((sum, evidence, index) => sum + (evidence[key] ? rules[index]!.weightBps : 0), 0);
    return exact(BigInt(met * 100), BigInt(totalWeight));
  };
  const coverageScore = component('coverage');
  return { coverageBps: Number(coverageScore.numerator * 100n / coverageScore.denominator),
    score: weighted([{ score: coverageScore, weight: policyConventions.confidenceWeightsBps.coverage },
      { score: component('fresh'), weight: policyConventions.confidenceWeightsBps.freshness },
      { score: component('traceable'), weight: policyConventions.confidenceWeightsBps.traceability },
      { score: component('consistent'), weight: policyConventions.confidenceWeightsBps.consistency }]) };
}

function evaluateDefinition(input: SimulationInput, ticker: string, profile: ProfileDefinition,
  metrics: readonly MetricRow[], qualitative: readonly QualitativeRow[]): QualityEvaluation {
  if (!profile.purchaseSupported) return freeze({ ticker, profileId: profile.id, qualityScore: null,
    confidenceScore: ZERO, coverageBps: 0, blockScores: {}, evidences: [],
    reasonCodes: [profile.reasonCode ?? 'UNSUPPORTED_PURCHASE_PROFILE'], sufficientForPurchase: false });
  const evidences = profile.quality.map(rule => rule.kind === 'metric'
    ? metricEvidence(input, profile, rule, metrics.filter(row => row.ruleId === `${profile.id}.${rule.id}`))
    : qualitativeEvidence(input, profile, rule, qualitative.find(row => row.ruleId === `${profile.id}.${rule.id}`)));
  const blockScores: Record<string, ExactScore> = {};
  for (const block of new Set(profile.quality.map(rule => rule.block))) {
    blockScores[block] = weighted(profile.quality.map((rule, index) => ({ rule, evidence: evidences[index]! }))
      .filter(item => item.rule.block === block).map(item => ({ score: item.evidence.score, weight: item.rule.weightBps })));
  }
  const qualityScore = weighted(profile.quality.map((rule, index) => ({ score: evidences[index]!.score, weight: rule.weightBps })));
  const trust = confidence(evidences, profile.quality);
  const reasons = new Set<string>();
  for (const evidence of evidences) if (evidence.reasonCode !== 'QUALITY_EVIDENCE') reasons.add(evidence.reasonCode);
  if (trust.coverageBps < policyConventions.minimumCoverageBps) reasons.add('INSUFFICIENT_COVERAGE');
  if (trust.score.numerator < BigInt(policyConventions.minimumConfidence) * trust.score.denominator) reasons.add('INSUFFICIENT_CONFIDENCE');
  if (profile.quality.some((rule, index) => rule.critical && !evidences[index]!.coverage)) reasons.add('MISSING_CRITICAL_SOLVENCY_DATA');
  const hasBlockingEvidence = evidences.some((evidence, index) => evidence.reasonCode === 'STALE_QUALITY_DATA' ||
    evidence.reasonCode === 'INSUFFICIENT_HISTORY' || evidence.reasonCode === 'UNRESOLVED_CONFLICT' ||
    (profile.quality[index]!.critical && !evidence.coverage));
  const sufficientForPurchase = trust.coverageBps >= policyConventions.minimumCoverageBps &&
    trust.score.numerator >= BigInt(policyConventions.minimumConfidence) * trust.score.denominator &&
    !hasBlockingEvidence;
  return freeze({ ticker, profileId: profile.id, qualityScore, confidenceScore: trust.score, coverageBps: trust.coverageBps,
    blockScores, evidences, reasonCodes: [...reasons], sufficientForPurchase });
}

function evaluateHolding(input: SimulationInput, ticker: string, profile: ProfileDefinition): QualityEvaluation {
  const holding = input.holdingDetails.find(row => row.ticker === ticker);
  const own = evaluateDefinition(input, ticker, profile, input.marketSnapshot.metrics.filter(row => row.ticker === ticker),
    input.qualitativeAssessments.filter(row => row.ticker === ticker));
  if (!holding || holding.investees.length === 0) return freeze({ ...own,
    reasonCodes: [...own.reasonCodes, 'MISSING_HOLDING_DETAILS'], sufficientForPurchase: false });
  const investees = holding.investees.map(investee => {
    const definition = profiles.find(row => row.id === investee.profileId)!;
    return { valueCents: investee.valueCents, id: investee.id,
      evaluation: evaluateDefinition(input, ticker, definition, investee.metrics, investee.qualitativeAssessments) };
  });
  const coveredValue = investees.reduce((sum, row) => sum + row.valueCents, 0n);
  const lookThroughQuality = weighted(investees.map(row => ({ score: row.evaluation.qualityScore ?? ZERO, weight: row.valueCents })));
  const ownQuality = own.qualityScore ?? ZERO;
  const qualityScore = weighted([{ score: lookThroughQuality, weight: profile.lookThroughWeightBps },
    { score: ownQuality, weight: 10000 - profile.lookThroughWeightBps }]);
  const economicCoverageBps = Number(coveredValue * 10000n / holding.totalValueCents);
  const investeeCoverage = coveredValue === 0n ? 0 : Number(investees.reduce((sum, row) =>
    sum + BigInt(row.evaluation.coverageBps) * row.valueCents, 0n) / coveredValue);
  const lookThroughCoverage = Math.floor(investeeCoverage * economicCoverageBps / 10000);
  const coverageBps = Math.floor((lookThroughCoverage * profile.lookThroughWeightBps +
    own.coverageBps * (10000 - profile.lookThroughWeightBps)) / 10000);
  const lookThroughConfidence = weighted(investees.map(row => ({ score: row.evaluation.confidenceScore, weight: row.valueCents })));
  const confidenceScore = weighted([{ score: weighted([{ score: lookThroughConfidence, weight: coveredValue },
    { score: ZERO, weight: holding.totalValueCents - coveredValue }]), weight: profile.lookThroughWeightBps },
    { score: own.confidenceScore, weight: 10000 - profile.lookThroughWeightBps }]);
  const evidences = [...investees.flatMap(row => row.evaluation.evidences.map(evidence =>
    freeze({ ...evidence, ruleId: `${row.id}/${evidence.ruleId}` }))), ...own.evidences];
  const reasons = new Set([...own.reasonCodes, ...investees.flatMap(row => row.evaluation.reasonCodes)]);
  if (economicCoverageBps < profile.minimumLookThroughCoverageBps) reasons.add('INSUFFICIENT_HOLDING_COVERAGE');
  if (coverageBps < policyConventions.minimumCoverageBps) reasons.add('INSUFFICIENT_COVERAGE');
  if (confidenceScore.numerator < BigInt(policyConventions.minimumConfidence) * confidenceScore.denominator) reasons.add('INSUFFICIENT_CONFIDENCE');
  return freeze({ ticker, profileId: profile.id, qualityScore, confidenceScore, coverageBps,
    blockScores: { 'look-through': lookThroughQuality, own: ownQuality }, evidences, reasonCodes: [...reasons],
    sufficientForPurchase: own.sufficientForPurchase && investees.every(row => row.evaluation.sufficientForPurchase) &&
      economicCoverageBps >= profile.minimumLookThroughCoverageBps && coverageBps >= policyConventions.minimumCoverageBps &&
      confidenceScore.numerator >= BigInt(policyConventions.minimumConfidence) * confidenceScore.denominator });
}

export function evaluateQuality(input: SimulationInput): readonly QualityEvaluation[] {
  return freeze(input.portfolio.positions.map(position => {
    const profile = profiles.find(row => row.id === position.profileId)!;
    return profile.id === 'holding' ? evaluateHolding(input, position.ticker, profile) :
      evaluateDefinition(input, position.ticker, profile,
        input.marketSnapshot.metrics.filter(row => row.ticker === position.ticker),
        input.qualitativeAssessments.filter(row => row.ticker === position.ticker));
  }));
}
