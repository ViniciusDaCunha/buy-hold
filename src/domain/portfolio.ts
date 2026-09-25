import type { SimulationInput } from './input';
import { invalid } from './errors';
import { checkedCents, decimalRatio, marketValue } from './money';
import { freeze } from './validation';

export interface ExactRatio {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export interface ProposedAssetValue {
  readonly ticker: string;
  readonly valueCents: bigint;
}

export interface PortfolioAnalysisOptions {
  readonly purchases?: readonly ProposedAssetValue[];
  readonly estimatedCostsCents?: bigint;
}

export interface PortfolioAnalysis {
  readonly budget: {
    readonly contributionCents: bigint;
    readonly releasedCashCents: bigint;
    readonly reinvestmentCents: bigint;
    readonly totalCents: bigint;
  };
  readonly totals: {
    readonly positionsBeforeCents: bigint;
    readonly cashBeforeCents: bigint;
    readonly wealthBeforeCents: bigint;
    readonly postContributionCents: bigint;
    readonly purchasesCents: bigint;
    readonly estimatedCostsCents: bigint;
    readonly wealthAfterCents: bigint;
    readonly cashAfterCents: bigint;
  };
  readonly assets: readonly {
    readonly ticker: string;
    readonly classId: string;
    readonly currentCents: bigint;
    readonly afterCents: bigint;
    readonly targetCents: bigint;
    readonly deficitCents: bigint;
    readonly capacityCents: bigint;
    readonly limitCapacityCents: bigint;
    readonly targetBps: number;
    readonly limitBps: number;
    readonly weightBefore: ExactRatio;
    readonly weightAfter: ExactRatio;
    readonly exposureVerified: boolean;
    readonly reasonCodes: readonly string[];
  }[];
  readonly classes: readonly {
    readonly id: string;
    readonly beforeCents: bigint;
    readonly afterCents: bigint;
    readonly targetCents: bigint;
    readonly deficitCents: bigint;
    readonly weightBefore: ExactRatio;
    readonly weightAfter: ExactRatio;
  }[];
  readonly cash: {
    readonly beforeCents: bigint;
    readonly afterCents: bigint;
    readonly targetCents: bigint;
    readonly weightBefore: ExactRatio;
    readonly weightAfter: ExactRatio;
  };
  readonly exposures: readonly {
    readonly kind: 'sector' | 'group';
    readonly id: string;
    readonly value: ExactRatio;
    readonly weight: ExactRatio;
    readonly limitBps: number;
    readonly exceeded: boolean;
  }[];
}

export function analyzePortfolio(input: SimulationInput,
  options: PortfolioAnalysisOptions = {}): PortfolioAnalysis {
  const costs = checkedCents(options.estimatedCostsCents ?? 0n, 'portfolio.estimatedCostsCents');
  const purchases = options.purchases ?? [];
  if (purchases.length > 100) invalid('TOO_MANY_ASSETS', 'portfolio.purchases', 'Máximo de 100 ativos comprados.');
  const purchaseByTicker = new Map<string, bigint>();
  for (const [index, purchase] of purchases.entries()) {
    if (!input.portfolio.positions.some(position => position.ticker === purchase.ticker)) {
      invalid('UNKNOWN_ASSET', `portfolio.purchases.${index}.ticker`, 'Compra pertence a ativo fora do universo.');
    }
    if (purchaseByTicker.has(purchase.ticker)) invalid('DUPLICATE', 'portfolio.purchases', 'Agregue a compra por ativo.');
    purchaseByTicker.set(purchase.ticker, checkedCents(purchase.valueCents, `portfolio.purchases.${index}.valueCents`));
  }
  const purchaseTotal = [...purchaseByTicker.values()].reduce((sum, value) => sum + value, 0n);
  const budget = input.aporteCents + input.portfolio.releasedCashCents + input.portfolio.reinvestmentCents;
  if (purchaseTotal + costs > budget) invalid('BUDGET_EXCEEDED', 'portfolio.purchases', 'Compras e custos excedem o orçamento investível.');

  const beforeValues = new Map<string, bigint>();
  for (const position of input.portfolio.positions) {
    if (position.quantity === 0) {
      beforeValues.set(position.ticker, 0n);
      continue;
    }
    const quote = input.marketSnapshot.quotes.find(row => row.ticker === position.ticker);
    if (!quote) invalid('MISSING_PRICE', 'marketSnapshot.quotes', 'Cotação necessária para valorar posição existente.');
    const fx = position.currency === 'BRL' ? decimalRatio('1') : input.fx ? decimalRatio(input.fx.rate) : null;
    if (fx === null) invalid('MISSING_FX', 'fx', 'Câmbio necessário para valorar posição existente.');
    beforeValues.set(position.ticker, marketValue(quote.priceCents, position.quantity, fx));
  }
  const positionsBefore = [...beforeValues.values()].reduce((sum, value) => sum + value, 0n);
  const wealthBefore = checkedCents(positionsBefore + input.portfolio.cashCents, 'portfolio.wealthBeforeCents');
  const postContribution = checkedCents(wealthBefore + input.aporteCents, 'portfolio.postContributionCents');
  const wealthAfter = checkedCents(postContribution - costs, 'portfolio.wealthAfterCents');
  const cashAfter = input.portfolio.cashCents + input.aporteCents - purchaseTotal - costs;
  checkedCents(cashAfter, 'portfolio.cashAfterCents');
  const afterValues = new Map(input.portfolio.positions.map(position => [position.ticker,
    beforeValues.get(position.ticker)! + (purchaseByTicker.get(position.ticker) ?? 0n)]));

  const divisor = (left: bigint, right: bigint): bigint => {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
  };
  const ratio = (numerator: bigint, denominator: bigint): ExactRatio => {
    if (denominator === 0n) return Object.freeze({ numerator: 0n, denominator: 1n });
    const common = divisor(numerator, denominator);
    return Object.freeze({ numerator: numerator / common, denominator: denominator / common });
  };
  const target = (bps: number) => postContribution * BigInt(bps) / 10000n;
  const positiveDifference = (desired: bigint, current: bigint) => desired > current ? desired - current : 0n;

  type Dimension = 'sector' | 'group';
  const exposureScaled = new Map<string, bigint>();
  for (const exposure of input.marketSnapshot.exposures) {
    const value = afterValues.get(exposure.ticker) ?? 0n;
    for (const dimension of ['sector', 'group'] as const) {
      const key = `${dimension}/${exposure[dimension]}`;
      exposureScaled.set(key, (exposureScaled.get(key) ?? 0n) + value * BigInt(exposure.weightBps));
    }
  }
  const dimensionLimit = (dimension: Dimension) => dimension === 'sector' ? input.policy.limits.sectorBps : input.policy.limits.groupBps;
  const exposures = [...exposureScaled.entries()].map(([key, scaled]) => {
    const separator = key.indexOf('/');
    const kind = key.slice(0, separator) as Dimension;
    const id = key.slice(separator + 1);
    const limitBps = dimensionLimit(kind);
    return { kind, id, value: ratio(scaled, 10000n), weight: ratio(scaled, 10000n * wealthAfter), limitBps,
      exceeded: scaled > wealthAfter * BigInt(limitBps) };
  }).sort((left, right) => left.kind < right.kind ? -1 : left.kind > right.kind ? 1 :
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  const assets = input.portfolio.positions.map(position => {
    const current = beforeValues.get(position.ticker)!;
    const after = afterValues.get(position.ticker)!;
    const targetCents = target(position.targetBps);
    const deficit = positiveDifference(targetCents, after);
    const limitBps = position.profileId === 'etf-broad' ? input.policy.limits.etfBps : input.policy.limits.individualBps;
    const individualHeadroom = wealthAfter * BigInt(limitBps) - after * 10000n;
    let limitCapacity = individualHeadroom > 0n ? individualHeadroom / 10000n : 0n;
    const reasons = new Set<string>();
    if (individualHeadroom < 0n) reasons.add('CURRENT_LIMIT_EXCEEDED');
    const rows = input.marketSnapshot.exposures.filter(exposure => exposure.ticker === position.ticker);
    const exposureCoverage = rows.reduce((sum, exposure) => sum + exposure.weightBps, 0);
    const exposureVerified = exposureCoverage === 10000;
    if (!exposureVerified) {
      reasons.add('UNKNOWN_EXPOSURE');
      limitCapacity = 0n;
    } else {
      for (const exposure of rows) {
        if (exposure.weightBps === 0) continue;
        for (const dimension of ['sector', 'group'] as const) {
          const key = `${dimension}/${exposure[dimension]}`;
          const currentScaled = exposureScaled.get(key) ?? 0n;
          const headroom = wealthAfter * BigInt(dimensionLimit(dimension)) - currentScaled;
          if (headroom < 0n) reasons.add('CURRENT_EXPOSURE_LIMIT_EXCEEDED');
          const capacity = headroom > 0n ? headroom / BigInt(exposure.weightBps) : 0n;
          if (capacity < limitCapacity) limitCapacity = capacity;
        }
      }
    }
    if (deficit === 0n) reasons.add('NO_DEFICIT');
    const capacity = deficit < limitCapacity ? deficit : limitCapacity;
    return { ticker: position.ticker, classId: position.classId, currentCents: current, afterCents: after,
      targetCents, deficitCents: deficit, capacityCents: capacity, limitCapacityCents: limitCapacity,
      targetBps: position.targetBps, limitBps, weightBefore: ratio(current, wealthBefore),
      weightAfter: ratio(after, wealthAfter), exposureVerified, reasonCodes: [...reasons] };
  });

  const classes = input.policy.classes.map(policyClass => {
    const positions = input.portfolio.positions.filter(position => position.classId === policyClass.id);
    const before = positions.reduce((sum, position) => sum + beforeValues.get(position.ticker)!, 0n);
    const after = positions.reduce((sum, position) => sum + afterValues.get(position.ticker)!, 0n);
    const targetCents = target(policyClass.targetBps);
    return { id: policyClass.id, beforeCents: before, afterCents: after, targetCents,
      deficitCents: positiveDifference(targetCents, after), weightBefore: ratio(before, wealthBefore),
      weightAfter: ratio(after, wealthAfter) };
  });

  return freeze({ budget: { contributionCents: input.aporteCents, releasedCashCents: input.portfolio.releasedCashCents,
    reinvestmentCents: input.portfolio.reinvestmentCents, totalCents: budget },
  totals: { positionsBeforeCents: positionsBefore, cashBeforeCents: input.portfolio.cashCents,
    wealthBeforeCents: wealthBefore, postContributionCents: postContribution, purchasesCents: purchaseTotal,
    estimatedCostsCents: costs, wealthAfterCents: wealthAfter, cashAfterCents: cashAfter },
  assets, classes, cash: { beforeCents: input.portfolio.cashCents, afterCents: cashAfter,
    targetCents: target(input.policy.cashTargetBps), weightBefore: ratio(input.portfolio.cashCents, wealthBefore),
    weightAfter: ratio(cashAfter, wealthAfter) }, exposures });
}
