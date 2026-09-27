import type { ViewProposal } from '../../../uiTypes';
import { PageHeading } from '../../../shared/PageHeading';
import { WeightsPanel } from '../../contribution/components/WeightsPanel';
import './StrategyPage.css';

export function StrategyPage({ proposal }: { readonly proposal: ViewProposal | null }) {
  const result = proposal?.result ?? null;
  return <section className="subpage strategy-page">
    <PageHeading variant="subpage" eyebrow="A regra vem antes da decisão" title="Minha estratégia."
      description={`Metas e limites da política fictícia validada · versão ${proposal?.view.policyVersion ?? '—'}.`} />
    <div className="strategy-grid">{proposal?.view.classes.map(item => <article className="panel" key={item.id}>
      <span>{item.name}</span><strong>{item.targetLabel}</strong><p>Meta configurada para a classe.</p>
    </article>)}</div>
    <section className="panel subpage-panel"><h2>Como a proposta é calculada</h2>
      <p>O motor avalia qualidade, confiança, preço, teto, déficits e capacidade antes de propor unidades inteiras.</p>
      <p>Limite individual: {proposal ? `${proposal.input.input.policy.limits.individualBps / 100}%` : '—'} · Limite de ETF: {proposal ? `${proposal.input.input.policy.limits.etfBps / 100}%` : '—'}.</p>
      <p>SCHD é valorado na carteira; compras permanecem bloqueadas enquanto seu perfil não tiver suporte.</p>
    </section>
    {result && <WeightsPanel result={result} />}
  </section>;
}
