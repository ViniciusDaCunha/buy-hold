import type { ValidatedInput } from '../../../backend/src/domain/input';
import type { SimulationResult } from '../../../backend/src/domain/result';
import { formatBps, formatBrl, formatPrice } from './format';

const classNames: Record<string, string> = { stocks: 'Ações Brasil', fiis: 'Fundos imobiliários', etfs: 'Exterior e ETFs' };
export const className = (id: string) => classNames[id] ?? id;

export interface ContributionViewModel {
  readonly status: 'ready' | 'empty' | 'partial' | 'concentration';
  readonly title: string;
  readonly description: string;
  readonly amount: string;
  readonly purchasesAmount: string;
  readonly fees: string;
  readonly cash: string;
  readonly portfolioValue: string;
  readonly analysisDate: string;
  readonly policyVersion: string;
  readonly fixtureVersion: string;
  readonly noEligibleAssets: boolean;
  readonly purchaseRows: readonly { ticker: string; quantity: number; price: string; total: string; reason: string }[];
  readonly holdings: readonly { ticker: string; className: string; quantity: number; value: string; weight: string }[];
  readonly classes: readonly { id: string; name: string; before: number; after: number; target: number; beforeLabel: string; afterLabel: string; targetLabel: string }[];
}

export function presentContribution(result: SimulationResult, input: ValidatedInput): ContributionViewModel {
  const noEligibleAssets = result.purchases.length === 0 && result.evaluations.every(row => !row.purchaseEligible);
  const partial = result.evaluations.some(row => row.evidence.some(evidence =>
    evidence.applicability === 'missing' || evidence.applicability === 'invalid' || evidence.applicability === 'stale'));
  // O estado destacado indica que o excesso efetivamente bloqueou uma compra.
  // Posições acima do limite podem existir no snapshot normal sem impedir outras propostas.
  const concentrated = result.excludedAssets.some(row => row.reasonCodes.some(code =>
    code === 'CURRENT_LIMIT_EXCEEDED' || code === 'CURRENT_EXPOSURE_LIMIT_EXCEEDED'));
  const status = result.purchases.length === 0 ? 'empty' : partial ? 'partial' : concentrated ? 'concentration' : 'ready';
  const title = status === 'empty' ? (noEligibleAssets ? 'Nenhum ativo elegível neste cenário.' : 'Nenhuma compra viável neste cenário.') :
    status === 'partial' ? 'Há compras possíveis, com dados parciais.' :
      status === 'concentration' ? 'Aporte possível, com concentração excessiva.' :
        `Distribua seu aporte em ${result.purchases.length} ${result.purchases.length === 1 ? 'ativo' : 'ativos'}.`;
  const description = status === 'empty' ? 'O orçamento permanece em caixa. Consulte os motivos de cada ativo.' :
    status === 'partial' ? 'Parte dos ativos tem evidências ausentes, inválidas ou vencidas. A proposta considera apenas os candidatos permitidos pelo motor.' :
      status === 'concentration' ? 'Uma exposição já ultrapassa o limite configurado. A proposta respeita os bloqueios e não sugere vendas.' :
        'Ativos selecionados entre candidatos habilitados, respeitando preço, orçamento e concentração.';
  const before = result.allocationsBefore;
  const portfolioCents = before.filter(row => row.kind === 'class' || row.kind === 'cash')
    .reduce((total, row) => total + (row.valueCents ?? 0n), 0n);
  return {
    status, title, description, amount: formatBrl(input.input.aporteCents),
    purchasesAmount: formatBrl(result.principalCents + result.reserveCents), fees: formatBrl(result.feesCents),
    cash: formatBrl(result.unallocatedCents), portfolioValue: formatBrl(portfolioCents),
    analysisDate: input.input.analysisAsOf, policyVersion: input.input.policyVersion, fixtureVersion: input.input.fixtureVersion,
    noEligibleAssets,
    purchaseRows: result.purchases.map(row => ({ ticker: row.ticker, quantity: row.quantity,
      price: formatPrice(row.priceSnapshot, row.currency), total: formatBrl(row.reservedTotal),
      reason: (row.explanations.find(explanation => explanation.code === 'PRIORITY_SELECTED') ?? row.explanations[0])?.message ??
        'Consulte os motivos da avaliação.' })),
    holdings: input.input.portfolio.positions.map(position => {
      const allocation = before.find(row => row.kind === 'asset' && row.id === position.ticker);
      return { ticker: position.ticker, className: className(position.classId), quantity: position.quantity,
        value: allocation?.valueCents === null || allocation?.valueCents === undefined ? '—' : formatBrl(allocation.valueCents),
        weight: allocation ? formatBps(allocation.weightBps) : '—' };
    }),
    classes: input.input.policy.classes.map(policyClass => {
      const current = before.find(row => row.kind === 'class' && row.id === policyClass.id);
      const after = result.allocationsAfter.find(row => row.kind === 'class' && row.id === policyClass.id);
      const target = result.allocationsTarget.find(row => row.kind === 'class' && row.id === policyClass.id);
      return { id: policyClass.id, name: className(policyClass.id), before: current?.weightBps ?? 0,
        after: after?.weightBps ?? 0, target: target?.weightBps ?? policyClass.targetBps,
        beforeLabel: formatBps(current?.weightBps ?? 0), afterLabel: formatBps(after?.weightBps ?? 0),
        targetLabel: formatBps(target?.weightBps ?? policyClass.targetBps) };
    }),
  };
}

const warningMessages: Record<string, string> = {
  FICTIONAL_DATA: 'Todos os dados são fictícios.',
  INCOME_ESTIMATE_UNAVAILABLE: 'Estimativa de renda não disponível.',
  SIMULATION_ONLY: 'A proposta não executa compras.',
  UNALLOCATED_BALANCE: 'Parte do orçamento permanece em caixa.',
  NO_PURCHASES: 'Nenhuma compra foi proposta.',
  UNKNOWN_EXPOSURE: 'Há exposição econômica sem verificação completa.',
};

export function presentWarning(code: string): string {
  return warningMessages[code] ?? `Aviso do resultado: ${code}.`;
}
