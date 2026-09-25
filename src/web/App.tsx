import { ContributionForm, EmptyPurchasesTable, Panel, SimulationStatus } from './components';
import { simulateContribution } from '../application/simulation';
import { useEffect, useRef, useState } from 'react';
import { buildScenario } from '../../fixtures/scenarios';
import { parseSimulationInput } from '../domain/input';
import { parseBrl } from '../domain/money';
import type { SimulationResult } from '../domain/result';
import { createSha256DecisionId } from '../adapters/decision-id';
import { diagnose } from '../application/diagnostics';
import { formatBrl } from './format';
import { formatPrice } from './format';
import { EvidencePanel, ExcludedPanel, WeightsPanel } from './ResultDetails';
import { serializeSimulationResult } from '../adapters/result-json';

export function App({ simulate = simulateContribution }: { readonly simulate?: typeof simulateContribution }) {
  const [amount, setAmount] = useState('500,00');
  const [scenario, setScenario] = useState('S01');
  const [state, setState] = useState<'initial' | 'invalid' | 'loading' | 'ready' | 'empty' | 'stale' | 'error'>('initial');
  const [proposal, setProposal] = useState<{ result: SimulationResult; amount: bigint; scenario: string } | null>(null);
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
      setProposal({ result, amount: cents, scenario });
      setState(result.purchases.length ? 'ready' : 'empty');
    } catch (error) {
      if (current !== revision.current) return;
      const diagnostic = diagnose(error, { etapa, scenarioId: scenario, schemaVersion: '1.0', policyVersion: '1.0' });
      setFailure(diagnostic);
      setState(etapa === 'entrada' ? 'invalid' : 'error');
    }
  }
  const messages = { initial: 'Aguardando análise', invalid: 'Entrada inválida', loading: 'Analisando aporte…',
    ready: 'Proposta pronta', empty: 'Sem compras — saldo preservado', stale: 'Resultado desatualizado — analise novamente.',
    error: 'Não foi possível analisar o aporte' };
  const result = proposal?.result;
  const currentResult = (state === 'ready' || state === 'empty') ? result : undefined;
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
  const activeTicker = result?.evaluations.some(row => row.ticker === selectedTicker) ? selectedTicker :
    (result?.purchases[0]?.ticker ?? result?.evaluations[0]?.ticker ?? null);
  const summaries = [
    ['Aporte analisado', proposal ? formatBrl(proposal.amount) : '—', proposal?.scenario ?? 'Entrada atual'],
    ['Compras propostas', result ? String(result.purchases.length) : '—', 'Até cinco ativos'],
    ['Custos estimados', result ? formatBrl(result.feesCents) : '—', 'Incluídos no orçamento'],
    ['Saldo não alocado', result ? formatBrl(result.unallocatedCents) : '—', 'Permanece em caixa'],
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="#main-content" aria-label="Simulador de aportes — início">
            <span className="brand__mark" aria-hidden="true">A</span>
            <span><strong>Simulador de aportes</strong><small>Motor determinístico</small></span>
          </a>
          <span className="version-label">Política v1.0 · Fixture synthetic-1.0</span>
        </div>
      </header>

      <main id="main-content" className="page-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Planejamento de carteira</p>
            <h1>Simulador de aportes</h1>
            <p className="hero__intro">Explore como um aporte poderia ser distribuído com regras explícitas, limites de risco e dados controlados.</p>
          </div>
          <span className="hero__mode">Ambiente local</span>
        </header>

        <aside className="simulation-warning" aria-label="Aviso de simulação">
          <strong>Dados fictícios — simulação</strong>
          <span>Esta aplicação somente propõe cenários; não executa nem registra compras e não constitui recomendação.</span>
        </aside>

        <ContributionForm amount={amount} scenario={scenario} busy={state === 'loading'}
          invalid={state === 'invalid'} onAmount={value => edit(value, 'amount')}
          onScenario={value => edit(value, 'scenario')} onSubmit={() => { void analyze(); }} />
        <SimulationStatus message={messages[state]} />
        {failure && <div role="alert" id="simulation-error" className="simulation-warning">
          <strong>{failure.message}</strong>
          <span>{failure.errorCode} · {failure.etapa} · {failure.scenarioId} · schema {failure.schemaVersion} · política {failure.policyVersion}
            {failure.decisionId && <> · decisão {failure.decisionId}</>}</span>
        </div>}
        {proposal && !['ready', 'empty'].includes(state) &&
          <p>Resultado anterior desatualizado. Não corresponde à entrada atual.</p>}
        <p>Carteira somente leitura</p>
        <button className="button button--quiet" type="button" disabled={!currentResult} onClick={exportJson}
          aria-describedby="export-hint">Exportar JSON</button>
        <p id="export-hint" className="field__hint" aria-live="polite">{exportMessage ||
          'Baixa a proposta exibida; o navegador não confirma a gravação no disco.'}</p>

        <section className="results" aria-label="Área de resultados">
          <Panel id="summary-title" title="Resumo da simulação" eyebrow="Visão geral" className="panel--summary">
            <div className="summary-grid">
              {summaries.map(([label, value, hint]) => (
                <article className="summary-card" key={label}>
                  <span>{label}</span><strong>{value}</strong><small>{hint}</small>
                </article>
              ))}
            </div>
          </Panel>

          <div className="results-grid">
            <Panel id="purchases-title" title="Proposta de compras" eyebrow="Unidades inteiras" className="panel--purchases">
              {result ? <div className="table-scroll">
                <table aria-label="Compras simuladas"><thead><tr><th scope="col">Ativo</th><th scope="col">Preço simulado</th><th scope="col">Teto</th><th scope="col">Quantidade</th><th scope="col">Custos</th><th scope="col">Total reservado BRL</th></tr></thead>
                  <tbody>{result.purchases.map(line => <tr key={line.ticker}>
                    <td><button type="button" className="text-button" aria-pressed={activeTicker === line.ticker}
                      onClick={() => setSelectedTicker(line.ticker)}>{line.ticker}</button></td>
                    <td>{formatPrice(line.priceSnapshot, line.currency)}</td><td>{formatPrice(line.priceLimit, line.currency)}</td>
                    <td>{line.quantity}</td><td>{formatBrl(line.fees)}</td><td>{formatBrl(line.reservedTotal)}</td>
                  </tr>)}</tbody></table>
                {result.purchases.length === 0 && <p>Nenhuma compra proposta.</p>}
                <p>Principal: {formatBrl(result.principalCents)} · Reserva de preço: {formatBrl(result.reserveCents)} · Custos: {formatBrl(result.feesCents)} · Saldo: {formatBrl(result.unallocatedCents)}</p>
              </div> : <EmptyPurchasesTable />}
              <footer className="panel__footer">O total reservado de cada compra inclui principal, reserva de preço e custos. Valores convertidos para BRL quando aplicável.</footer>
            </Panel>

            <EvidencePanel result={result ?? null} ticker={activeTicker} onSelect={setSelectedTicker} />
            <ExcludedPanel result={result ?? null} ticker={activeTicker} onSelect={setSelectedTicker} />
            <WeightsPanel result={result ?? null} />
          </div>
        </section>
      </main>

      <footer className="site-footer"><span>Execução local · sem conexão com corretora</span><span>Dados fictícios e versionados</span></footer>
    </>
  );
}
