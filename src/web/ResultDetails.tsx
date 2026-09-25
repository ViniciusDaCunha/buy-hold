import type { Evaluation, ReasonExplanation, SimulationResult } from '../domain/result';
import { EmptyState, Panel } from './components';
import { formatBps, formatBrl, formatPrice, formatScore } from './format';

const eligibility: Record<Evaluation['eligibilityState'], string> = {
  full: 'Apto', conditional: 'Apto com restrições', hold: 'Aguardar', watch: 'Em observação', 'review-exit': 'Revisar posição',
};
const applicability = {
  applicable: 'Aplicável', 'not-applicable': 'Não aplicável', missing: 'Ausente', invalid: 'Inválida', stale: 'Vencida',
};

function Reasons({ rows }: { readonly rows: readonly ReasonExplanation[] }) {
  return rows.length ? <ul className="reason-list">{rows.map(row =>
    <li key={row.code}><strong>{row.message}</strong><span>{row.reviewTrigger}</span></li>)}</ul> :
    <p className="muted">Nenhum motivo adicional registrado.</p>;
}

export function EvidencePanel({ result, ticker, onSelect }: {
  readonly result: SimulationResult | null;
  readonly ticker: string | null;
  readonly onSelect: (ticker: string) => void;
}) {
  const evaluation = result?.evaluations.find(row => row.ticker === ticker);
  return <section className="panel detail-panel" aria-label="Detalhe da evidência">
    <header className="panel__header"><div><p className="eyebrow">Leitura da regra</p><h2 id="evidence-title">Evidências por ativo</h2></div></header>
    {!result ? <EmptyState>Selecione um ativo após analisar para consultar métricas, faixas, nota e confiança.</EmptyState> : <>
      <div className="asset-picker" aria-label="Selecionar ativo">
        {result.evaluations.map(row => <button className="asset-picker__button" type="button" key={row.ticker}
          aria-pressed={row.ticker === ticker} onClick={() => onSelect(row.ticker)}>{row.ticker}</button>)}
      </div>
      {evaluation && <div className="detail-body">
        <h3>{evaluation.ticker} · {evaluation.purchasedQuantity > 0 ? `${evaluation.purchasedQuantity} unidade(s) proposta(s)` : 'sem compra proposta'}</h3>
        <p className="muted">{eligibility[evaluation.eligibilityState]} · {evaluation.valuationLabel}</p>
        <dl className="metric-grid">
          <div><dt>Qualidade</dt><dd>{formatScore(evaluation.qualityScore)}</dd></div>
          <div><dt>Confiança</dt><dd>{formatScore(evaluation.confidenceScore)}</dd></div>
          <div><dt>Fundamentos</dt><dd>{formatScore(evaluation.fundamentalScore)}</dd></div>
          <div><dt>Múltiplos</dt><dd>{formatScore(evaluation.multipleScore)}</dd></div>
          <div><dt>Preço</dt><dd>{formatScore(evaluation.priceScore)}</dd></div>
          <div><dt>Margem de segurança</dt><dd>{evaluation.safetyMarginBps === null ? 'Não calculada' : formatBps(evaluation.safetyMarginBps)}</dd></div>
          <div><dt>Teto de compra</dt><dd>{evaluation.priceLimitCents === null ? 'Não definido' :
            formatPrice(evaluation.priceLimitCents, evaluation.currency)}</dd></div>
        </dl>
        <h4>Motivos e próximos critérios</h4>
        <Reasons rows={evaluation.explanations} />
        <h4>Métricas e faixas</h4>
        <div className="evidence-list">{evaluation.evidence.map((row, index) =>
          <details key={`${row.ruleId}/${row.reasonCode}/${index}`}>
            <summary><span>{row.ruleId}</span><strong>{row.observedValue === null ? 'Ausente' : `${row.observedValue} ${row.unit}`} · {formatScore(row.score)}</strong></summary>
            <dl>
              <div><dt>Faixas</dt><dd>{row.anchors.length ? row.anchors.join(' · ') : 'Não definidas'}</dd></div>
              <div><dt>Situação</dt><dd>{applicability[row.applicability]}</dd></div>
              <div><dt>Critério</dt><dd>{row.reasonCode}</dd></div>
              <div><dt>Origem</dt><dd>{row.source ?? 'Não informada'}</dd></div>
              <div><dt>Período</dt><dd>{row.period ? `${row.period.start} a ${row.period.end}` : 'Não informado'}</dd></div>
            </dl>
          </details>)}</div>
      </div>}
    </>}
  </section>;
}

export function ExcludedPanel({ result, ticker, onSelect }: {
  readonly result: SimulationResult | null;
  readonly ticker: string | null;
  readonly onSelect: (ticker: string) => void;
}) {
  return <Panel id="excluded-title" title="Ativos não selecionados" eyebrow="Motivos de exclusão">
    {!result ? <EmptyState>Bloqueios e limitações aparecerão aqui com seus respectivos motivos.</EmptyState> :
      result.excludedAssets.length === 0 ? <p className="panel__footer">Nenhum ativo excluído nesta simulação.</p> :
      <ul className="excluded-list">{result.excludedAssets.map(row => <li key={row.ticker}>
        <button type="button" className="text-button" aria-pressed={ticker === row.ticker} onClick={() => onSelect(row.ticker)}>{row.ticker}</button>
        <Reasons rows={row.explanations} />
      </li>)}</ul>}
  </Panel>;
}

const kindLabel = { asset: 'Ativo', class: 'Classe', cash: 'Caixa', sector: 'Setor', group: 'Grupo' };
export function WeightsPanel({ result }: { readonly result: SimulationResult | null }) {
  const before = result?.allocationsBefore ?? [];
  const rows = (kinds: readonly string[]) => before.filter(row => kinds.includes(row.kind)).map(row => {
    const after = result?.allocationsAfter.find(candidate => candidate.kind === row.kind && candidate.id === row.id);
    const target = result?.allocationsTarget.find(candidate => candidate.kind === row.kind && candidate.id === row.id);
    return <tr key={`${row.kind}/${row.id}`}>
      <th scope="row">{row.kind === 'cash' ? 'Caixa' : row.id}<small>{kindLabel[row.kind]}</small></th>
      <td>{formatBps(row.weightBps)}</td><td>{after ? formatBps(after.weightBps) : '—'}</td>
      <td>{target ? formatBps(target.weightBps) : '—'}</td>
      <td>{row.limitBps === null ? '—' : formatBps(row.limitBps)}</td>
    </tr>;
  });
  return <Panel id="weights-title" title="Pesos da carteira" eyebrow="Antes, após compras simuladas e alvo">
    {!result ? <EmptyState>Os pesos serão calculados sobre o snapshot validado da carteira.</EmptyState> : <>
      <div className="table-scroll"><table aria-label="Pesos da carteira">
        <thead><tr><th scope="col">Exposição</th><th scope="col">Antes</th><th scope="col">Após compras simuladas</th><th scope="col">Alvo</th><th scope="col">Limite</th></tr></thead>
        <tbody>{rows(['asset', 'class', 'cash'])}</tbody>
      </table></div>
      <details className="exposure-details"><summary>Exposições por setor e grupo</summary>
        <div className="table-scroll"><table aria-label="Exposições por setor e grupo">
          <thead><tr><th scope="col">Exposição</th><th scope="col">Antes</th><th scope="col">Após compras simuladas</th><th scope="col">Alvo</th><th scope="col">Limite</th></tr></thead>
          <tbody>{rows(['sector', 'group'])}</tbody>
        </table></div>
      </details>
      <p className="panel__footer">Pesos calculados com preços do snapshot, sem evolução histórica. Custos e reserva de preço consomem caixa; o patrimônio após o aporte desconta custos estimados. Saldo não alocado: {formatBrl(result.unallocatedCents)}. Percentuais exibidos com duas casas.</p>
    </>}
  </Panel>;
}
