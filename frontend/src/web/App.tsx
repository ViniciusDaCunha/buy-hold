import { simulateContribution } from '../../../backend/src/application/simulation';
import { useEffect, useRef, useState } from 'react';
import { buildScenario } from '../../../backend/fixtures/scenarios';
import { parseSimulationInput } from '../../../backend/src/domain/input';
import { parseBrl } from '../../../backend/src/domain/money';
import { createSha256DecisionId } from '../../../backend/src/adapters/decision-id';
import { diagnose } from '../../../backend/src/application/diagnostics';
import { serializeSimulationResult } from '../../../backend/src/adapters/result-json';
import { presentContribution } from './presenter';
import { AppShell } from './app/AppShell';
import { ContributionPage } from './features/contribution/pages/ContributionPage';
import { PortfolioPage } from './features/portfolio/pages/PortfolioPage';
import { StrategyPage } from './features/strategy/pages/StrategyPage';
import type { EvidenceTab, Page, ViewProposal, ViewState } from './uiTypes';


export function App({ simulate = simulateContribution }: { readonly simulate?: typeof simulateContribution }) {
  const [amount, setAmount] = useState('500,00');
  const [scenario, setScenario] = useState('S01');
  const [state, setState] = useState<ViewState>('initial');
  const [page, setPage] = useState<Page>('aporte');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<EvidenceTab>('reasons');
  const [proposal, setProposal] = useState<ViewProposal | null>(null);
  const [failure, setFailure] = useState<ReturnType<typeof diagnose> | null>(null);
  const [exportMessage, setExportMessage] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  function edit(value: string, field: 'amount' | 'scenario') {
    revision.current++;
    if (field === 'amount') setAmount(value); else setScenario(value);
    setFailure(null);
    setExportMessage('');
    setState(proposal ? 'stale' : 'initial');
  }
  async function analyze() {
    const current = ++revision.current;
    setFailure(null);
    setExportMessage('');
    setState('loading');
    let etapa = 'entrada';
    try {
      const cents = parseBrl(amount);
      etapa = 'fixture';
      const raw = buildScenario(scenario);
      raw.aporteCents = cents.toString();
      const validated = parseSimulationInput(raw);
      etapa = 'simulacao';
      const result = await simulate(validated, { createDecisionId: createSha256DecisionId });
      if (current !== revision.current) return;
      const view = presentContribution(result, validated);
      setProposal({ result, input: validated, view, amount: cents, scenario });
      setState(view.status);
    } catch (error) {
      if (current !== revision.current) return;
      const diagnostic = diagnose(error, { etapa, scenarioId: scenario, schemaVersion: '1.0', policyVersion: '1.0' });
      setFailure(diagnostic);
      setState(etapa === 'entrada' ? 'invalid' : 'error');
    }
  }
  const currentResult = (state === 'ready' || state === 'empty' || state === 'partial' || state === 'concentration') ? proposal?.result : undefined;
  function exportJson() {
    if (!currentResult || !proposal) return;
    setFailure(null);
    setExportMessage('');
    try {
      const blob = new Blob([serializeSimulationResult(currentResult)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `simulacao-${currentResult.decisionId.replace(':', '-')}.json`;
        link.click();
        setExportMessage('Download iniciado no navegador. Verifique o arquivo salvo para confirmar a gravação.');
      } finally {
        const revoke = URL.revokeObjectURL.bind(URL);
        window.setTimeout(() => revoke(url), 0);
      }
    } catch (error) {
      setFailure(diagnose(error, { etapa: 'download', scenarioId: proposal.scenario,
        schemaVersion: currentResult.schemaVersion, policyVersion: '1.0', decisionId: currentResult.decisionId }));
    }
  }
  function navigate(next: Page) {
    setPage(next);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  return <AppShell page={page} onPage={navigate}>
    {page === 'aporte' && <ContributionPage amount={amount} scenario={scenario} state={state} proposal={proposal} failure={failure}
      exportMessage={exportMessage} selectedTicker={selectedTicker} activeEvidenceTab={activeEvidenceTab}
      onPage={navigate} onAmount={value => edit(value, 'amount')} onScenario={value => edit(value, 'scenario')}
      onAnalyze={() => { void analyze(); }} onExport={exportJson} onSelect={setSelectedTicker} onEvidenceTab={setActiveEvidenceTab} />}
    {page === 'carteira' && <PortfolioPage proposal={proposal} />}
    {page === 'estrategia' && <StrategyPage proposal={proposal} />}
  </AppShell>;
}
