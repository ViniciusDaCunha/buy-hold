import type { SimulationInput } from './input';
import { invalid } from './errors';
import { decimalRatio, marketValue, purchaseCost } from './money';
import { analyzePortfolio, type PortfolioAnalysis } from './portfolio';
import type { ExactScore } from './scoring';
import { evaluateValuationAndEligibility, type AssetAssessment } from './valuation';
import { freeze } from './validation';

export interface AllocationLine {
  readonly ticker: string;
  readonly classId: string;
  readonly currency: 'BRL' | 'USD';
  readonly quantity: number;
  readonly priceCents: bigint;
  readonly priceLimitCents: bigint;
  readonly principalCents: bigint;
  readonly reserveCents: bigint;
  readonly feesCents: bigint;
  readonly reservedTotalCents: bigint;
  readonly priority: ExactScore;
  readonly conditional: boolean;
}

export interface ClassAllocation {
  readonly id: string;
  readonly deficitCents: bigint;
  readonly budgetCents: bigint;
  readonly spentCents: bigint;
  readonly unallocatedCents: bigint;
  readonly reasonCodes: readonly string[];
}

export interface AllocationResult {
  readonly budget: PortfolioAnalysis['budget'];
  readonly classAllocations: readonly ClassAllocation[];
  readonly unassignedCents: bigint;
  readonly lines: readonly AllocationLine[];
  readonly principalCents: bigint;
  readonly reserveCents: bigint;
  readonly feesCents: bigint;
  readonly reservedTotalCents: bigint;
  readonly conditionalDebitCents: bigint;
  readonly unallocatedCents: bigint;
  readonly assetDecisions: readonly {
    readonly ticker: string;
    readonly status: 'purchased' | 'excluded';
    readonly reasonCodes: readonly string[];
  }[];
  readonly portfolioBefore: PortfolioAnalysis;
  readonly portfolioAfter: PortfolioAnalysis;
}

export interface AllocationOptions {
  readonly assessments?: readonly AssetAssessment[];
}

interface Rational { readonly numerator: bigint; readonly denominator: bigint }

interface Candidate {
  readonly ticker: string;
  readonly classId: string;
  readonly currency: 'BRL' | 'USD';
  readonly priceCents: bigint;
  readonly priceLimitCents: bigint;
  readonly capacityCents: bigint;
  readonly priority: ExactScore;
  readonly confidence: ExactScore;
  readonly quality: ExactScore;
  readonly conditional: boolean;
  readonly unitDebitCents: bigint;
  readonly unitReservedCents: bigint;
  readonly preliminary: Rational;
}

interface LineCost {
  readonly candidate: Candidate;
  readonly quantity: number;
  readonly marketValueCents: bigint;
  readonly principalCents: bigint;
  readonly reserveCents: bigint;
  readonly feesCents: bigint;
  readonly reservedTotalCents: bigint;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator = 1n): ExactScore {
  const sign = denominator < 0n ? -1n : 1n;
  const common = gcd(numerator, denominator);
  return Object.freeze({ numerator: numerator / common * sign, denominator: denominator / common * sign });
}

function add(left: Rational, right: Rational): ExactScore {
  return rational(left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator);
}

function multiply(left: Rational, right: Rational): ExactScore {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
}

function compare(left: Rational, right: Rational): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Distribuição inteira por maior resto, repetida quando algum item satura. */
function distribute(total: bigint, rows: readonly { readonly id: string; readonly weight: Rational; readonly cap: bigint }[]): Map<string, bigint> {
  const result = new Map(rows.map(row => [row.id, 0n]));
  let remaining = total;
  let active = rows.filter(row => row.cap > 0n && row.weight.numerator > 0n);
  while (remaining > 0n && active.length > 0) {
    const weight = active.reduce((sum, row) => add(sum, row.weight), rational(0n));
    const calculated = active.map(row => {
      const current = result.get(row.id)!;
      const numerator = remaining * row.weight.numerator * weight.denominator;
      const denominator = row.weight.denominator * weight.numerator;
      const floor = numerator / denominator;
      const room = row.cap - current;
      return { row, room, floor: floor < room ? floor : room,
        remainder: rational(numerator % denominator, denominator) };
    });
    let assigned = calculated.reduce((sum, row) => sum + row.floor, 0n);
    for (const row of calculated) result.set(row.row.id, result.get(row.row.id)! + row.floor);
    remaining -= assigned;
    if (remaining === 0n) break;

    const remainderOrder = calculated.filter(row => result.get(row.row.id)! < row.row.cap)
      .sort((left, right) => compare(right.remainder, left.remainder) || compareText(left.row.id, right.row.id));
    assigned = 0n;
    for (const row of remainderOrder) {
      if (remaining === 0n) break;
      result.set(row.row.id, result.get(row.row.id)! + 1n);
      remaining--; assigned++;
    }
    active = active.filter(row => result.get(row.id)! < row.cap);
    if (assigned === 0n && calculated.every(row => row.floor === 0n)) break;
  }
  return result;
}

function priority(assessment: AssetAssessment, deficit: bigint, target: bigint): ExactScore {
  const quality = assessment.qualityScore!;
  const base = assessment.profileId === 'etf-broad' ? quality : add(
    multiply(quality, rational(3n, 5n)), multiply(assessment.priceScore!, rational(2n, 5n)));
  const utilization = target === 0n ? rational(0n) : rational(deficit < target ? deficit : target, target);
  return multiply(multiply(base, rational(assessment.confidenceScore.numerator,
    assessment.confidenceScore.denominator * 100n)), add(rational(3n, 4n), multiply(utilization, rational(1n, 4n))));
}

function rawLine(candidate: Candidate, quantity: number) {
  return { ticker: candidate.ticker, currency: candidate.currency, quantity, priceCents: candidate.priceCents,
    ceilingCents: candidate.priceLimitCents } as const;
}

function moneyParameters(input: SimulationInput) {
  return { costs: { fixedCents: input.costs.fixedCents, remittanceCents: input.costs.remittanceCents,
    variableRate: decimalRatio(input.costs.variableRate), fxSpread: decimalRatio(input.costs.fxSpread) },
  fx: input.fx ? decimalRatio(input.fx.rate) : null, reserve: decimalRatio(input.policy.priceReserve) };
}

function markedValue(input: SimulationInput, currency: 'BRL' | 'USD', priceCents: bigint, quantity: number): bigint {
  if (currency === 'USD' && input.fx === null) invalid('MISSING_FX', 'fx', 'Câmbio necessário para valorar compra em USD.');
  return marketValue(priceCents, quantity, decimalRatio(currency === 'BRL' ? '1' : input.fx!.rate));
}

function calculateLines(input: SimulationInput, candidates: readonly Candidate[], quantities: ReadonlyMap<string, number>): LineCost[] {
  const ordered = candidates.filter(row => (quantities.get(row.ticker) ?? 0) > 0)
    .sort((left, right) => compareText(left.ticker, right.ticker));
  const result: LineCost[] = [];
  let previous = { principalCents: 0n, reserveCents: 0n, feesCents: 0n, reservedTotalCents: 0n };
  for (let index = 0; index < ordered.length; index++) {
    const prefix = ordered.slice(0, index + 1).map(candidate => rawLine(candidate, quantities.get(candidate.ticker)!));
    const parameters = moneyParameters(input);
    const current = purchaseCost(prefix, parameters.costs, parameters.fx, parameters.reserve);
    const candidate = ordered[index]!;
    result.push({ candidate, quantity: quantities.get(candidate.ticker)!,
      marketValueCents: markedValue(input, candidate.currency, candidate.priceCents, quantities.get(candidate.ticker)!),
      principalCents: current.principalCents - previous.principalCents,
      reserveCents: current.reserveCents - previous.reserveCents,
      feesCents: current.feesCents - previous.feesCents,
      reservedTotalCents: current.reservedTotalCents - previous.reservedTotalCents });
    previous = current;
  }
  return result;
}

function portfolioWithPurchases(input: SimulationInput, lines: readonly LineCost[]): PortfolioAnalysis {
  // Reserva, taxas e diferença de arredondamento consomem caixa sem valorizar posições.
  return analyzePortfolio(input, {
    purchases: lines.map(row => ({ ticker: row.candidate.ticker, valueCents: row.marketValueCents })),
    estimatedCostsCents: lines.reduce((sum, row) => sum + row.reservedTotalCents - row.marketValueCents, 0n),
  });
}

function sumCosts(lines: readonly LineCost[]) {
  return lines.reduce((sum, line) => ({ principalCents: sum.principalCents + line.principalCents,
    reserveCents: sum.reserveCents + line.reserveCents, feesCents: sum.feesCents + line.feesCents,
    reservedTotalCents: sum.reservedTotalCents + line.reservedTotalCents }),
  { principalCents: 0n, reserveCents: 0n, feesCents: 0n, reservedTotalCents: 0n });
}

export function allocateContribution(input: SimulationInput, options: AllocationOptions = {}): AllocationResult {
  const portfolioBefore = analyzePortfolio(input);
  const assessments = options.assessments ?? evaluateValuationAndEligibility(input);
  const totalBudget = portfolioBefore.budget.totalCents;
  const classBudgets = distribute(totalBudget, portfolioBefore.classes.map(row => ({ id: row.id,
    weight: rational(row.deficitCents), cap: row.deficitCents })));
  const assignedBudget = [...classBudgets.values()].reduce((sum, value) => sum + value, 0n);
  const unassignedCents = totalBudget - assignedBudget;

  const provisional = input.portfolio.positions.flatMap(position => {
    const assessment = assessments.find(row => row.ticker === position.ticker);
    const asset = portfolioBefore.assets.find(row => row.ticker === position.ticker)!;
    const quote = input.marketSnapshot.quotes.find(row => row.ticker === position.ticker);
    const classBudget = classBudgets.get(position.classId) ?? 0n;
    if (!assessment?.purchaseEligible || !assessment.qualityScore || !assessment.priceLimitCents || !quote ||
        asset.capacityCents === 0n || classBudget === 0n || quote.priceCents > assessment.priceLimitCents ||
        (assessment.conditionalRestrictions && position.quantity === 0) ||
        (assessment.profileId !== 'etf-broad' && assessment.priceScore === null)) return [];
    const score = priority(assessment, asset.deficitCents, asset.targetCents);
    const conditional = assessment.conditionalRestrictions || assessment.eligibilityState === 'conditional';
    const parameters = moneyParameters(input);
    const one = purchaseCost([{ ticker: position.ticker, currency: position.currency, quantity: 1,
      priceCents: quote.priceCents, ceilingCents: assessment.priceLimitCents }], parameters.costs,
    parameters.fx, parameters.reserve);
    if (markedValue(input, position.currency, quote.priceCents, 1) > asset.capacityCents || one.reservedTotalCents > classBudget ||
        (conditional && one.reservedTotalCents * 10000n > totalBudget * BigInt(input.policy.limits.conditionalBps))) return [];
    return [{ ticker: position.ticker, classId: position.classId, currency: position.currency,
      priceCents: quote.priceCents, priceLimitCents: assessment.priceLimitCents, capacityCents: asset.capacityCents,
      priority: score, confidence: assessment.confidenceScore, quality: assessment.qualityScore,
      conditional, unitDebitCents: one.reservedTotalCents,
      unitReservedCents: one.principalCents + one.reserveCents }];
  });

  const sumsByClass = new Map<string, ExactScore>();
  for (const row of provisional) sumsByClass.set(row.classId, add(sumsByClass.get(row.classId) ?? rational(0n), row.priority));
  const candidates: Candidate[] = provisional.map(row => ({ ...row,
    preliminary: rational((classBudgets.get(row.classId) ?? 0n) * row.priority.numerator * sumsByClass.get(row.classId)!.denominator,
      row.priority.denominator * sumsByClass.get(row.classId)!.numerator) }));
  const selected = candidates.sort((left, right) => compare(right.preliminary, left.preliminary) ||
    compare(right.confidence, left.confidence) || compare(right.quality, left.quality) ||
    (left.unitDebitCents < right.unitDebitCents ? -1 : left.unitDebitCents > right.unitDebitCents ? 1 : 0) ||
    compareText(left.ticker, right.ticker)).slice(0, input.policy.limits.maxPurchases);

  const targetShares = new Map<string, bigint>();
  for (const classId of input.policy.classes.map(row => row.id)) {
    const rows = selected.filter(row => row.classId === classId);
    const shares = distribute(classBudgets.get(classId) ?? 0n,
      rows.map(row => ({ id: row.ticker, weight: row.priority, cap: row.capacityCents })));
    for (const [ticker, value] of shares) targetShares.set(ticker, value);
  }

  const quantities = new Map(selected.map(row => [row.ticker, 0]));
  const conditionalLimit = totalBudget * BigInt(input.policy.limits.conditionalBps);
  const feasible = (candidate: Candidate, quantity: number, shareLimit?: bigint): boolean => {
    const trial = new Map(quantities);
    trial.set(candidate.ticker, quantity);
    const lines = calculateLines(input, selected, trial);
    const totals = sumCosts(lines);
    if (totals.reservedTotalCents > totalBudget || lines.length > input.policy.limits.maxPurchases) return false;
    if (shareLimit !== undefined && lines.find(row => row.candidate.ticker === candidate.ticker)!.reservedTotalCents > shareLimit) return false;
    for (const policyClass of input.policy.classes) {
      const spent = lines.filter(row => row.candidate.classId === policyClass.id)
        .reduce((sum, row) => sum + row.reservedTotalCents, 0n);
      if (spent > (classBudgets.get(policyClass.id) ?? 0n)) return false;
    }
    const conditionalDebit = lines.filter(row => row.candidate.conditional)
      .reduce((sum, row) => sum + row.reservedTotalCents, 0n);
    if (conditionalDebit * 10000n > conditionalLimit) return false;
    for (const line of lines) {
      if (line.marketValueCents > line.candidate.capacityCents) return false;
    }
    const after = portfolioWithPurchases(input, lines);
    return lines.every(line => {
      const asset = after.assets.find(row => row.ticker === line.candidate.ticker)!;
      return !asset.reasonCodes.includes('CURRENT_LIMIT_EXCEEDED') &&
        !asset.reasonCodes.includes('CURRENT_EXPOSURE_LIMIT_EXCEEDED');
    });
  };

  const maximumAddition = (candidate: Candidate, shareLimit?: bigint): number => {
    const current = quantities.get(candidate.ticker) ?? 0;
    const available = classBudgets.get(candidate.classId) ?? 0n;
    // O custo fixo da primeira unidade não pode limitar a busca: unidades adicionais
    // compartilham a mesma linha. O valor reservado unitário é o limite inferior seguro.
    const rough = available / candidate.unitReservedCents + 2n;
    const upper = Number(rough > 1_000_000_000n - BigInt(current) ? 1_000_000_000n : BigInt(current) + rough);
    let low = current;
    let high = upper;
    while (low < high) {
      const middle = low + Math.ceil((high - low) / 2);
      if (feasible(candidate, middle, shareLimit)) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const priorityOrder = [...selected].sort((left, right) => compare(right.priority, left.priority) ||
    compare(right.confidence, left.confidence) || compare(right.quality, left.quality) ||
    (left.unitDebitCents < right.unitDebitCents ? -1 : left.unitDebitCents > right.unitDebitCents ? 1 : 0) ||
    compareText(left.ticker, right.ticker));
  for (const candidate of priorityOrder) {
    quantities.set(candidate.ticker, maximumAddition(candidate, targetShares.get(candidate.ticker) ?? 0n));
  }
  // O equivalente determinístico de acrescentar uma unidade repetidamente: esgota o
  // candidato de maior R antes de tentar o seguinte, sempre revalidando o conjunto.
  for (const candidate of priorityOrder) quantities.set(candidate.ticker, maximumAddition(candidate));

  const calculated = calculateLines(input, selected, quantities);
  const totals = sumCosts(calculated);
  const portfolioAfter = portfolioWithPurchases(input, calculated);
  const lines: AllocationLine[] = calculated.map(row => ({ ticker: row.candidate.ticker,
    classId: row.candidate.classId, currency: row.candidate.currency, quantity: row.quantity,
    priceCents: row.candidate.priceCents, priceLimitCents: row.candidate.priceLimitCents,
    principalCents: row.principalCents, reserveCents: row.reserveCents, feesCents: row.feesCents,
    reservedTotalCents: row.reservedTotalCents, priority: row.candidate.priority,
    conditional: row.candidate.conditional }));
  const classAllocations = portfolioBefore.classes.map(row => {
    const budgetCents = classBudgets.get(row.id) ?? 0n;
    const spentCents = lines.filter(line => line.classId === row.id).reduce((sum, line) => sum + line.reservedTotalCents, 0n);
    const possible = candidates.filter(candidate => candidate.classId === row.id);
    const chosen = selected.filter(candidate => candidate.classId === row.id);
    const reasonCodes = possible.length === 0 ? ['NO_ELIGIBLE_WHOLE_UNIT'] : chosen.length === 0 ? ['GLOBAL_LINE_LIMIT'] :
      spentCents < budgetCents ? ['UNALLOCATED_CLASS_BALANCE'] : [];
    return { id: row.id, deficitCents: row.deficitCents, budgetCents, spentCents,
      unallocatedCents: budgetCents - spentCents, reasonCodes };
  });
  const conditionalDebitCents = lines.filter(line => line.conditional)
    .reduce((sum, line) => sum + line.reservedTotalCents, 0n);
  const candidateTickers = new Set(candidates.map(row => row.ticker));
  const selectedTickers = new Set(selected.map(row => row.ticker));
  const purchasedTickers = new Set(lines.map(row => row.ticker));
  const assetDecisions = [...input.portfolio.positions].sort((left, right) => compareText(left.ticker, right.ticker))
    .map(position => {
      if (purchasedTickers.has(position.ticker)) return { ticker: position.ticker, status: 'purchased' as const,
        reasonCodes: ['PURCHASE_ELIGIBLE', 'PRIORITY_SELECTED', 'INTEGER_QUANTITY', 'COSTS_RESERVED'] };
      const assessment = assessments.find(row => row.ticker === position.ticker);
      const asset = portfolioBefore.assets.find(row => row.ticker === position.ticker)!;
      const quote = input.marketSnapshot.quotes.find(row => row.ticker === position.ticker);
      const classBudget = classBudgets.get(position.classId) ?? 0n;
      let reasonCodes: string[];
      if (!assessment) reasonCodes = ['ASSESSMENT_MISSING'];
      else if (!assessment.purchaseEligible) reasonCodes = [...assessment.reasonCodes];
      else if (!assessment.qualityScore) reasonCodes = ['QUALITY_NOT_AVAILABLE'];
      else if (!assessment.priceLimitCents) reasonCodes = ['PRICE_LIMIT_NOT_AVAILABLE'];
      else if (!quote) reasonCodes = ['MISSING_PRICE'];
      else if (asset.capacityCents === 0n) reasonCodes = [...asset.reasonCodes, 'NO_CAPACITY'];
      else if (classBudget === 0n) reasonCodes = ['NO_CLASS_BUDGET'];
      else if (quote.priceCents > assessment.priceLimitCents) reasonCodes = ['PRICE_ABOVE_CEILING'];
      else if (assessment.conditionalRestrictions && position.quantity === 0) reasonCodes = ['CONDITIONAL_NEW_POSITION'];
      else if (assessment.profileId !== 'etf-broad' && assessment.priceScore === null) reasonCodes = ['INCONCLUSIVE_PRICE'];
      else if (!candidateTickers.has(position.ticker)) {
        const parameters = moneyParameters(input);
        const one = purchaseCost([{ ticker: position.ticker, currency: position.currency, quantity: 1,
          priceCents: quote.priceCents, ceilingCents: assessment.priceLimitCents }], parameters.costs,
        parameters.fx, parameters.reserve);
        reasonCodes = markedValue(input, position.currency, quote.priceCents, 1) > asset.capacityCents ? ['UNIT_EXCEEDS_CAPACITY'] :
          one.reservedTotalCents > classBudget ? ['UNIT_EXCEEDS_CLASS_BUDGET'] : ['CONDITIONAL_LIMIT'];
      } else if (!selectedTickers.has(position.ticker)) reasonCodes = ['GLOBAL_LINE_LIMIT'];
      else reasonCodes = ['NO_FEASIBLE_WHOLE_UNIT_AFTER_REVALIDATION'];
      return { ticker: position.ticker, status: 'excluded' as const,
        reasonCodes: [...new Set(reasonCodes)].sort(compareText) };
    });
  return freeze({ budget: portfolioBefore.budget, classAllocations, unassignedCents, lines,
    principalCents: totals.principalCents, reserveCents: totals.reserveCents, feesCents: totals.feesCents,
    reservedTotalCents: totals.reservedTotalCents, conditionalDebitCents,
    unallocatedCents: totalBudget - totals.reservedTotalCents, assetDecisions, portfolioBefore, portfolioAfter });
}
