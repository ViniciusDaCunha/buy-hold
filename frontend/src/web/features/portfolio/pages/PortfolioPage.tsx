import type { ViewProposal } from '../../../uiTypes';
import { PageHeading } from '../../../shared/PageHeading';
import { HoldingsTable } from '../components/HoldingsTable';
import './PortfolioPage.css';

export function PortfolioPage({ proposal }: { readonly proposal: ViewProposal | null }) {
  return <section className="subpage portfolio-page">
    <PageHeading variant="subpage" eyebrow="Contexto para decidir" title="Minha carteira."
      description="Posições de demonstração · somente leitura." />
    <section className="panel subpage-panel"><h2>Posições atuais</h2>
      <p>Data-base: {proposal?.view.analysisDate ?? 'aguardando análise'}</p>
      <HoldingsTable holdings={proposal?.view.holdings} />
      {!proposal && <p>Simule um aporte para consultar o snapshot validado da carteira.</p>}
    </section>
  </section>;
}
