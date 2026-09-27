import type { Currency } from './money';
import type { ExactRatio } from './portfolio';
import type { ExactScore } from './scoring';
import type { JsonValue, units } from './validation';

export interface Evidence {
  readonly ruleId: string;
  readonly observedValue: string | null;
  readonly unit: typeof units[number];
  readonly anchors: readonly number[];
  readonly score: ExactScore | null;
  readonly applicability: 'applicable' | 'not-applicable' | 'missing' | 'invalid' | 'stale';
  readonly source: string | null;
  readonly period: { readonly start: string; readonly end: string } | null;
  readonly reasonCode: string;
}

export interface ReasonExplanation {
  readonly code: string;
  readonly message: string;
  readonly reviewTrigger: string;
}

export interface Evaluation {
  readonly ticker: string;
  readonly currency: Currency;
  readonly classId: string;
  readonly profileId: string;
  readonly evidence: readonly Evidence[];
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
  readonly purchasedQuantity: number;
  readonly reasonCodes: readonly string[];
  readonly explanations: readonly ReasonExplanation[];
}

export interface Purchase {
  readonly ticker: string;
  readonly currency: Currency;
  readonly quantity: number;
  readonly priceSnapshot: bigint;
  readonly priceLimit: bigint;
  readonly conversion: string;
  readonly principal: bigint;
  readonly reserve: bigint;
  readonly fees: bigint;
  readonly reservedTotal: bigint;
  readonly reasonCodes: readonly string[];
  readonly explanations: readonly ReasonExplanation[];
}

export interface Allocation {
  readonly id: string;
  readonly kind: 'asset' | 'class' | 'cash' | 'sector' | 'group';
  readonly value: ExactRatio;
  readonly valueCents: bigint | null;
  readonly weight: ExactRatio;
  readonly weightBps: number;
  readonly limitBps: number | null;
}

export interface SimulationResult {
  readonly schemaVersion: '1.0';
  readonly simulation: true;
  readonly decisionId: string;
  readonly snapshots: readonly JsonValue[];
  readonly evaluations: readonly Evaluation[];
  readonly purchases: readonly Purchase[];
  readonly excludedAssets: readonly {
    readonly ticker: string;
    readonly reasonCodes: readonly string[];
    readonly explanations: readonly ReasonExplanation[];
  }[];
  readonly allocationsBefore: readonly Allocation[];
  readonly allocationsAfter: readonly Allocation[];
  readonly allocationsTarget: readonly Allocation[];
  readonly principalCents: bigint;
  readonly reserveCents: bigint;
  readonly feesCents: bigint;
  readonly unallocatedCents: bigint;
  readonly warnings: readonly string[];
}
