import { allocateContribution } from '../domain/allocation';
import type { ValidatedInput } from '../domain/input';
import type { ExactRatio, PortfolioAnalysis } from '../domain/portfolio';
import { evaluateQuality, type QualityEvidence } from '../domain/quality';
import { type Allocation, type Evidence, type ReasonExplanation, type SimulationResult } from '../domain/result';
import { units } from '../domain/validation';
import { evaluateValuationAndEligibility, type ValuationEvidence } from '../domain/valuation';

export interface SimulationDependencies {
  readonly createDecisionId: (canonicalPayload: string) => string | Promise<string>;
}

const ENGINE_VERSION = '1.0';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const normalized = value.map(canonicalValue);
    if (normalized.every(item => typeof item === 'string')) return [...normalized].sort((left, right) => compareText(String(left), String(right)));
    if (normalized.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) {
      return [...normalized].sort((left, right) => {
        const leftRow = left as Record<string, unknown>;
        const rightRow = right as Record<string, unknown>;
        const stable = (row: Record<string, unknown>) => ['ticker', 'id', 'ruleId'].map(key => String(row[key] ?? '')).join('/');
        return compareText(stable(leftRow), stable(rightRow)) ||
          compareText(JSON.stringify(leftRow), JSON.stringify(rightRow));
      });
    }
    return normalized;
  }
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(source).sort(compareText).map(key => [key, canonicalValue(source[key])]));
}

export function canonicalDecisionPayload(validated: ValidatedInput): string {
  return JSON.stringify(canonicalValue({ engineVersion: ENGINE_VERSION, snapshot: validated.snapshot }));
}

function outputUnit(unit: string): typeof units[number] {
  const matched = units.find(candidate => candidate === unit);
  if (!matched) throw new Error(`Unidade interna sem contrato de saída: ${unit}.`);
  return matched;
}

function qualityEvidence(evidence: QualityEvidence): Evidence {
  const applicability = evidence.applicability === 'unsupported' ? 'not-applicable' as const :
    !evidence.coverage ? 'missing' as const : !evidence.fresh ? 'stale' as const :
      !evidence.consistent || !evidence.traceable ? 'invalid' as const : 'applicable' as const;
  return { ruleId: evidence.ruleId, observedValue: evidence.observedValue, unit: outputUnit(evidence.unit),
    anchors: evidence.anchors, score: evidence.score, applicability, source: evidence.source,
    period: evidence.period, reasonCode: evidence.reasonCode };
}

function valuationEvidence(evidence: ValuationEvidence): Evidence {
  return { ruleId: evidence.ruleId, observedValue: evidence.observedValue, unit: outputUnit(evidence.unit),
    anchors: evidence.anchors, score: evidence.score, applicability: evidence.applicability,
    source: evidence.source, period: evidence.period, reasonCode: evidence.reasonCode };
}

interface ExplanationContext {
  readonly ticker: string;
  readonly quantity?: number | undefined;
  readonly priceCents?: bigint | undefined;
  readonly priceLimitCents?: bigint | null | undefined;
  readonly reservedTotalCents?: bigint | undefined;
}

function explanation(code: string, context: ExplanationContext): ReasonExplanation {
  const values: Record<string, readonly [string, string]> = {
    PURCHASE_ELIGIBLE: [`${context.ticker} cumpriu os critérios de elegibilidade para compra.`, 'Reavaliar se qualidade, confiança, preço ou algum bloqueio mudar.'],
    PRIORITY_SELECTED: [`${context.ticker} ficou entre as parcelas monetárias prioritárias da carteira.`, 'Recalcular quando déficits, notas ou o orçamento mudarem.'],
    INTEGER_QUANTITY: [`A proposta usa ${context.quantity ?? 0} unidade(s) inteira(s), limitada(s) pelo conjunto de orçamento, capacidade e risco.`, 'Uma unidade adicional só entra se couber em todos os limites na próxima simulação.'],
    COSTS_RESERVED: [`O débito reservado de ${context.ticker} é ${context.reservedTotalCents ?? 0n} centavos, com reserva e custos incluídos.`, 'Recalcular se preço, câmbio, teto ou custos mudarem.'],
    UNIT_EXCEEDS_CAPACITY: [`Uma unidade de ${context.ticker} excede a capacidade monetária disponível.`, 'Reavaliar após mudança de preço, patrimônio, alvo ou folga de concentração.'],
    UNIT_EXCEEDS_CLASS_BUDGET: [`Uma unidade de ${context.ticker} não cabe na reserva de sua classe.`, 'Reavaliar quando o aporte ou os déficits de classe mudarem.'],
    GLOBAL_LINE_LIMIT: [`${context.ticker} ficou fora do limite global de linhas pela parcela preliminar.`, 'Recalcular quando prioridades, custos, déficits ou o limite de linhas mudarem.'],
    UNSUPPORTED_PURCHASE_PROFILE: [`${context.ticker} é valorado, mas seu perfil não possui regra de compra suportada.`, 'Implementar e versionar o perfil antes de permitir qualquer compra.'],
    PRICE_ABOVE_CEILING: [`O preço de ${context.ticker} (${context.priceCents ?? 0n}) excede o teto (${context.priceLimitCents ?? 0n}) em centavos.`, 'Reavaliar com nova cotação ou valuation fornecido e versionado.'],
    MISSING_CRITICAL_SOLVENCY_DATA: [`Falta evidência crítica de solvência para ${context.ticker}.`, 'Fornecer evidência válida, atual e rastreável antes de novo aporte.'],
    CONDITIONAL_NEW_POSITION: [`${context.ticker} é condicional e não pode inaugurar posição.`, 'Uma entrada nova exige elegibilidade plena sob a política vigente.'],
    CONDITIONAL_LIMIT: [`A unidade de ${context.ticker} ultrapassaria o limite coletivo condicional.`, 'Reavaliar com outro orçamento ou após mudança válida do estado de elegibilidade.'],
    NO_CAPACITY: [`${context.ticker} não possui capacidade adicional verificada.`, 'Reavaliar após mudança de déficit ou folgas de concentração.'],
    NO_DEFICIT: [`${context.ticker} não possui déficit até a meta configurada.`, 'Reavaliar quando patrimônio, preço ou meta versionada mudar.'],
    NO_CLASS_BUDGET: [`A classe de ${context.ticker} não recebeu orçamento por não ter déficit.`, 'Reavaliar quando o déficit da classe mudar.'],
    NO_FEASIBLE_WHOLE_UNIT_AFTER_REVALIDATION: [`Nenhuma unidade de ${context.ticker} permaneceu viável após revalidar custos e limites.`, 'Recalcular com preços, custos, orçamento e exposições atualizados.'],
    UNKNOWN_EXPOSURE: [`A exposição econômica de ${context.ticker} não está completamente verificada.`, 'Completar o look-through antes de afirmar folga de concentração.'],
    UNRESOLVED_CONTINUITY_RISK: [`${context.ticker} possui risco de continuidade não resolvido.`, 'Exigir evidência posterior que resolva o evento antes de aportar.'],
    ETF_EXECUTION_REVIEW: [`A execução simulada de ${context.ticker} requer revisão.`, 'Validar prêmio, spread e mercado subjacente antes de aportar.'],
    ETF_QUALITY_BELOW_75: [`A qualidade de ${context.ticker} não atende ao mínimo de 75 para compra de ETF amplo.`, 'Reavaliar quando a qualidade atingir 75, preservando os requisitos de confiança e execução.'],
    STALE_VALUATION: [`O valuation de ${context.ticker} está vencido.`, 'Fornecer valuation atualizado e rastreável.'],
    STALE_QUALITY_DATA: [`Há evidência de qualidade vencida para ${context.ticker}.`, 'Atualizar a evidência antes de reavaliar elegibilidade.'],
    INSUFFICIENT_CONFIDENCE: [`A confiança da avaliação de ${context.ticker} é insuficiente.`, 'Aumentar cobertura, atualidade, rastreabilidade ou consistência das evidências.'],
    INSUFFICIENT_COVERAGE: [`A cobertura de evidências de ${context.ticker} é insuficiente.`, 'Fornecer os dados aplicáveis ausentes antes de reavaliar.'],
  };
  const [message, reviewTrigger] = values[code] ?? [
    `O critério ${code} foi registrado para ${context.ticker} pelas evidências da simulação.`,
    `Reavaliar quando a evidência associada a ${code} mudar em um novo snapshot.`,
  ];
  return { code, message, reviewTrigger };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function ratio(numerator: bigint, denominator = 1n): ExactRatio {
  const gcd = (left: bigint, right: bigint): bigint => {
    let a = left < 0n ? -left : left; let b = right < 0n ? -right : right;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
  };
  if (denominator === 0n) return { numerator: 0n, denominator: 1n };
  const common = gcd(numerator, denominator);
  return { numerator: numerator / common, denominator: denominator / common };
}

function bps(weight: ExactRatio): number {
  return Number(weight.numerator * 10000n / weight.denominator);
}

function directAllocation(id: string, kind: 'asset' | 'class' | 'cash', valueCents: bigint,
  weight: ExactRatio, limitBps: number | null, reportedBps = bps(weight)): Allocation {
  return { id, kind, value: ratio(valueCents), valueCents, weight, weightBps: reportedBps, limitBps };
}

function allocations(analysis: PortfolioAnalysis, phase: 'before' | 'after'): Allocation[] {
  const wealth = phase === 'before' ? analysis.totals.wealthBeforeCents : analysis.totals.wealthAfterCents;
  const rows: Allocation[] = [
    ...analysis.assets.map(row => directAllocation(row.ticker, 'asset', phase === 'before' ? row.currentCents : row.afterCents,
      phase === 'before' ? row.weightBefore : row.weightAfter, row.limitBps)),
    ...analysis.classes.map(row => directAllocation(row.id, 'class', phase === 'before' ? row.beforeCents : row.afterCents,
      phase === 'before' ? row.weightBefore : row.weightAfter, null)),
    directAllocation('cash', 'cash', phase === 'before' ? analysis.cash.beforeCents : analysis.cash.afterCents,
      phase === 'before' ? analysis.cash.weightBefore : analysis.cash.weightAfter, null),
    ...analysis.exposures.map(row => {
      const weight = phase === 'before' ? ratio(row.value.numerator, row.value.denominator * wealth) : row.weight;
      return { id: row.id, kind: row.kind, value: row.value, valueCents: row.value.denominator === 1n ? row.value.numerator : null,
        weight, weightBps: bps(weight), limitBps: row.limitBps };
    }),
  ];
  return rows.sort((left, right) => compareText(`${left.kind}/${left.id}`, `${right.kind}/${right.id}`));
}

function targetAllocations(analysis: PortfolioAnalysis, input: ValidatedInput['input']): Allocation[] {
  const wealth = analysis.totals.postContributionCents;
  return [
    ...analysis.assets.map(row => directAllocation(row.ticker, 'asset', row.targetCents,
      ratio(row.targetCents, wealth), row.limitBps, row.targetBps)),
    ...analysis.classes.map(row => directAllocation(row.id, 'class', row.targetCents,
      ratio(row.targetCents, wealth), null, input.policy.classes.find(candidate => candidate.id === row.id)!.targetBps)),
    directAllocation('cash', 'cash', analysis.cash.targetCents,
      ratio(analysis.cash.targetCents, wealth), null, input.policy.cashTargetBps),
  ].sort((left, right) => compareText(`${left.kind}/${left.id}`, `${right.kind}/${right.id}`));
}

function deepFreeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
}

export async function simulateContribution(validated: ValidatedInput,
  dependencies: SimulationDependencies): Promise<SimulationResult> {
  const input = validated.input;
  const quality = evaluateQuality(input).map(evaluation => {
    // Ausência pontuável segue cobertura/confiança; invalidade e vencimento
    // preservados pelo parser bloqueiam o ativo antes da elegibilidade.
    const blockingIssues = validated.issues.filter(issue => issue.ticker === evaluation.ticker &&
      issue.code !== 'MISSING_DATA');
    if (blockingIssues.length === 0) return evaluation;
    return { ...evaluation, sufficientForPurchase: false,
      reasonCodes: uniqueSorted([...evaluation.reasonCodes, ...blockingIssues.map(issue => issue.code)]) };
  });
  const assessments = evaluateValuationAndEligibility(input, quality);
  const allocation = allocateContribution(input, { assessments });
  const decisionId = await dependencies.createDecisionId(canonicalDecisionPayload(validated));
  if (!/^[A-Za-z0-9:._-]{1,128}$/.test(decisionId)) throw new Error('Gerador retornou decisionId fora do contrato.');

  const decisions = new Map(allocation.assetDecisions.map(row => [row.ticker, row]));
  const lineByTicker = new Map(allocation.lines.map(row => [row.ticker, row]));
  const evaluations = input.portfolio.positions.map(position => {
    const qualityRow = quality.find(row => row.ticker === position.ticker)!;
    const assessment = assessments.find(row => row.ticker === position.ticker)!;
    const line = lineByTicker.get(position.ticker);
    const reasonCodes = uniqueSorted([...qualityRow.reasonCodes, ...assessment.reasonCodes,
      ...(decisions.get(position.ticker)?.reasonCodes ?? []),
      ...validated.issues.filter(issue => issue.ticker === position.ticker).map(issue => issue.code)]);
    const context = { ticker: position.ticker, quantity: line?.quantity,
      priceCents: input.marketSnapshot.quotes.find(row => row.ticker === position.ticker)?.priceCents,
      priceLimitCents: assessment.priceLimitCents, reservedTotalCents: line?.reservedTotalCents };
    const evidence = [...qualityRow.evidences.map(qualityEvidence), ...assessment.evidences.map(valuationEvidence)]
      .sort((left, right) => compareText(`${left.ruleId}/${left.reasonCode}`, `${right.ruleId}/${right.reasonCode}`));
    return { ticker: position.ticker, currency: position.currency, classId: position.classId, profileId: position.profileId, evidence,
      qualityScore: qualityRow.qualityScore, confidenceScore: qualityRow.confidenceScore,
      fundamentalScore: assessment.fundamentalScore, multipleScore: assessment.multipleScore,
      priceScore: assessment.priceScore, safetyMarginBps: assessment.safetyMarginBps,
      priceLimitCents: assessment.priceLimitCents, priceLabel: assessment.priceLabel,
      valuationStatus: assessment.valuationStatus, valuationLabel: assessment.valuationLabel,
      executionStatus: assessment.executionStatus,
      eligibilityState: assessment.eligibilityState, purchaseEligible: assessment.purchaseEligible,
      conditionalRestrictions: assessment.conditionalRestrictions, purchasedQuantity: line?.quantity ?? 0,
      reasonCodes, explanations: reasonCodes.map(code => explanation(code, context)) };
  }).sort((left, right) => compareText(left.ticker, right.ticker));

  const purchases = allocation.lines.map(line => {
    const reasonCodes = decisions.get(line.ticker)!.reasonCodes;
    const context = { ticker: line.ticker, quantity: line.quantity, priceCents: line.priceCents,
      priceLimitCents: line.priceLimitCents, reservedTotalCents: line.reservedTotalCents };
    return { ticker: line.ticker, currency: line.currency, quantity: line.quantity,
      priceSnapshot: line.priceCents, priceLimit: line.priceLimitCents,
      conversion: line.currency === 'USD' ? input.fx!.rate : '1', principal: line.principalCents,
      reserve: line.reserveCents, fees: line.feesCents, reservedTotal: line.reservedTotalCents,
      reasonCodes, explanations: reasonCodes.map(code => explanation(code, context)) };
  }).sort((left, right) => compareText(left.ticker, right.ticker));

  const excludedAssets = allocation.assetDecisions.filter(row => row.status === 'excluded').map(row => {
    const assessment = assessments.find(candidate => candidate.ticker === row.ticker)!;
    const position = input.portfolio.positions.find(candidate => candidate.ticker === row.ticker)!;
    const reasonCodes = uniqueSorted([...row.reasonCodes, ...assessment.reasonCodes,
      ...validated.issues.filter(issue => issue.ticker === row.ticker).map(issue => issue.code)]);
    const context = { ticker: row.ticker,
      priceCents: input.marketSnapshot.quotes.find(candidate => candidate.ticker === row.ticker)?.priceCents,
      priceLimitCents: assessment.priceLimitCents };
    return { ticker: position.ticker, reasonCodes, explanations: reasonCodes.map(code => explanation(code, context)) };
  }).sort((left, right) => compareText(left.ticker, right.ticker));

  const warnings = ['FICTIONAL_DATA', 'INCOME_ESTIMATE_UNAVAILABLE', 'SIMULATION_ONLY'];
  if (allocation.unallocatedCents > 0n) warnings.push('UNALLOCATED_BALANCE');
  if (purchases.length === 0) warnings.push('NO_PURCHASES');
  if (allocation.portfolioAfter.assets.some(row => !row.exposureVerified)) warnings.push('UNKNOWN_EXPOSURE');
  const result: SimulationResult = { schemaVersion: '1.0', simulation: true, decisionId,
    snapshots: [validated.snapshot], evaluations, purchases, excludedAssets,
    allocationsBefore: allocations(allocation.portfolioBefore, 'before'),
    allocationsAfter: allocations(allocation.portfolioAfter, 'after'),
    allocationsTarget: targetAllocations(allocation.portfolioBefore, input),
    principalCents: allocation.principalCents, reserveCents: allocation.reserveCents,
    feesCents: allocation.feesCents, unallocatedCents: allocation.unallocatedCents,
    warnings: warnings.sort(compareText) };
  deepFreeze(result);
  return result;
}
