import { useRef, useState } from 'react';
import { PageHeading } from '../../../shared/PageHeading';
import { SimulationStatus } from '../../../shared/SimulationStatus';
import type { EvidenceTab, Failure, Page, ViewProposal, ViewState } from '../../../uiTypes';
import { AssetDetailDialog } from '../components/AssetDetailDialog';
import { ContextColumn } from '../components/ContextColumn';
import { ContributionForm } from '../components/ContributionForm';
import { DecisionCard } from '../components/DecisionCard';
import { EvidenceTabs } from '../components/EvidenceTabs';
import { WeightsPanel } from '../components/WeightsPanel';
import './ContributionPage.css';

const messages: Record<ViewState, string> = {
  initial: 'Aguardando análise', invalid: 'Entrada inválida', loading: 'Analisando aporte…', ready: 'Proposta pronta',
  empty: 'Sem compras — saldo preservado', partial: 'Proposta pronta · dados parciais',
  concentration: 'Proposta pronta · concentração excessiva', stale: 'Resultado desatualizado — analise novamente.',
  error: 'Não foi possível analisar o aporte',
};

function isCurrent(state: ViewState) {
  return ['ready', 'empty', 'partial', 'concentration'].includes(state);
}

export function ContributionPage({ amount, scenario, state, proposal, failure, exportMessage, selectedTicker, activeEvidenceTab,
  onPage, onAmount, onScenario, onAnalyze, onExport, onSelect, onEvidenceTab }: {
  readonly amount: string;
  readonly scenario: string;
  readonly state: ViewState;
  readonly proposal: ViewProposal | null;
  readonly failure: Failure | null;
  readonly exportMessage: string;
  readonly selectedTicker: string | null;
  readonly activeEvidenceTab: EvidenceTab;
  readonly onPage: (page: Page) => void;
  readonly onAmount: (value: string) => void;
  readonly onScenario: (value: string) => void;
  readonly onAnalyze: () => void;
  readonly onExport: () => void;
  readonly onSelect: (ticker: string) => void;
  readonly onEvidenceTab: (tab: EvidenceTab) => void;
}) {
  const [dialogTicker, setDialogTicker] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const result = proposal?.result ?? null;
  const selected = result?.evaluations.some(row => row.ticker === selectedTicker) ? selectedTicker :
    (result?.purchases[0]?.ticker ?? result?.evaluations[0]?.ticker ?? null);

  function openAsset(ticker: string) {
    opener.current = document.activeElement as HTMLElement;
    onSelect(ticker);
    setDialogTicker(ticker);
  }

  function closeAsset() {
    setDialogTicker(null);
    opener.current?.focus();
  }

  return <>
    <section className="contribution-page">
      <PageHeading eyebrow="Uma decisão por vez" title="Seu próximo aporte." description="Boas escolhas, construídas com constância."
        badge={proposal?.view.analysisDate ?? 'Simulação local'} />
      <div className="workspace-layout">
        <div className="workspace-main">
          <ContributionForm amount={amount} scenario={scenario} busy={state === 'loading'} invalid={state === 'invalid'}
            onAmount={onAmount} onScenario={onScenario} onSubmit={onAnalyze} />
          <SimulationStatus message={messages[state]} />
          {failure && <div role="alert" id="simulation-error" className="notice"><strong>{failure.message}</strong>
            <span>{failure.errorCode} · {failure.etapa} · {failure.scenarioId} · schema {failure.schemaVersion} · política {failure.policyVersion}{failure.decisionId && <> · decisão {failure.decisionId}</>}</span>
          </div>}
          {proposal && !isCurrent(state) && <p className="notice">Resultado anterior desatualizado. Não corresponde à entrada atual.</p>}
          <DecisionCard proposal={proposal} state={state} onExport={onExport} onOpen={openAsset} exportMessage={exportMessage} />
          <EvidenceTabs result={result} proposal={proposal} selectedTicker={selected} activeTab={activeEvidenceTab}
            onSelect={onSelect} onOpenAsset={openAsset} onTabChange={onEvidenceTab} />
        </div>
        <ContextColumn proposal={proposal} onPage={onPage} />
      </div>
      <div className="weights-section"><WeightsPanel result={result} /></div>
    </section>
    <AssetDetailDialog ticker={dialogTicker} result={result} onClose={closeAsset} onSelect={setDialogTicker} />
  </>;
}
