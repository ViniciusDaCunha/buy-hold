import type { ViewProposal, ViewState } from '../../../uiTypes';
import { formatBrl } from '../../../format';
import { PurchaseTable } from './PurchaseTable';
import './DecisionCard.css';

const isCurrent = (state: ViewState) => ['ready', 'empty', 'partial', 'concentration'].includes(state);

function stateBadge(state: ViewState, noEligibleAssets: boolean | undefined) {
  if (state === 'initial') return 'Aguardando análise';
  if (state === 'loading') return 'Analisando';
  if (state === 'stale') return 'Desatualizada';
  if (state === 'error') return 'Erro global';
  if (state === 'invalid') return 'Entrada inválida';
  if (state === 'empty') return noEligibleAssets ? 'Sem ativos elegíveis' : 'Sem compras';
  if (state === 'partial') return 'Dados parciais';
  if (state === 'concentration') return 'Concentração excessiva';
  return 'Proposta simulada';
}

export function DecisionCard({ proposal, state, onExport, onOpen, exportMessage }: {
  readonly proposal: ViewProposal | null;
  readonly state: ViewState;
  readonly onExport: () => void;
  readonly onOpen: (ticker: string) => void;
  readonly exportMessage: string;
}) {
  const view = proposal?.view;
  const result = proposal?.result ?? null;
  return (
    <section className="decision-card panel" aria-labelledby="purchases-title">
      <div className="decision-hero">
        <div className="decision-hero__top"><span className="eyebrow">Sua decisão de aporte</span><span className="badge">{stateBadge(state, view?.noEligibleAssets)}</span></div>
        <h2 id="purchases-title">{view?.title ?? (state === 'loading' ? 'Analisando seu aporte…' : 'Seu próximo passo começa aqui.')}</h2>
        <p>{view?.description ?? 'Defina um valor e simule para ver a proposta calculada pelo motor.'}</p>
      </div>
      <div className="decision-summary" aria-label="Resumo da simulação">
        <div><span>Compras e reserva</span><strong>{view?.purchasesAmount ?? '—'}</strong></div>
        <div><span>Custos estimados</span><strong>{view?.fees ?? '—'}</strong></div>
        <div><span>Manter em caixa</span><strong>{view?.cash ?? '—'}</strong></div>
      </div>
      <PurchaseTable result={result} view={view} onOpen={onOpen} />
      {!result && <p className="decision-empty">Analise um aporte para ver as compras possíveis.</p>}
      {result?.purchases.length === 0 && <p className="decision-empty"><strong>Nenhuma compra proposta.</strong> O valor permanece disponível. Consulte os motivos abaixo.</p>}
      {result && <p className="decision-breakdown">Principal: {formatBrl(result.principalCents)} · Reserva de preço: {formatBrl(result.reserveCents)} · Custos: {formatBrl(result.feesCents)} · Saldo: {formatBrl(result.unallocatedCents)}</p>}
      <div className="decision-footer"><p>Proposta para análise. Carteira somente leitura; nenhuma compra é executada.</p>
        <button className="button button--quiet" type="button" disabled={!isCurrent(state)} onClick={onExport} aria-describedby="export-hint">Exportar JSON</button>
      </div>
      <p id="export-hint" className="export-hint" aria-live="polite">{exportMessage || 'Baixa a proposta exibida; o navegador não confirma a gravação no disco.'}</p>
    </section>
  );
}
