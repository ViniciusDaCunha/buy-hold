import type { Evaluation, SimulationResult } from '../../../../../../backend/src/domain/result';
import { EmptyState } from '../../../shared/EmptyState';
import { formatBps, formatPrice, formatScore } from '../../../format';
import { ReasonList } from './ReasonList';
import './EvidencePanel.css';

const eligibility: Record<Evaluation['eligibilityState'], string> = {
  full: 'Apto', conditional: 'Apto com restrições', hold: 'Aguardar', watch: 'Em observação', 'review-exit': 'Revisar posição',
};
const applicability = { applicable: 'Aplicável', 'not-applicable': 'Não aplicável', missing: 'Ausente', invalid: 'Inválida', stale: 'Vencida' };

export function EvidencePanel({ result, ticker, onSelect, headingId = 'evidence-title', regionLabel = 'Detalhe da evidência', showPicker = true }: {
  readonly result: SimulationResult | null;
  readonly ticker: string | null;
  readonly onSelect: (ticker: string) => void;
  readonly headingId?: string;
  readonly regionLabel?: string;
  readonly showPicker?: boolean;
}) {
  const evaluation = result?.evaluations.find(row => row.ticker === ticker);
  return <section className="detail-panel" aria-label={regionLabel}>
    <header className="panel__header"><div><p className="eyebrow">Leitura da regra</p><h2 id={headingId}>Evidências por ativo</h2></div></header>
    {!result ? <EmptyState>Selecione um ativo após analisar para consultar métricas, faixas, nota e confiança.</EmptyState> : <>
      {showPicker && <div className="asset-picker" aria-label="Selecionar ativo">
        {result.evaluations.map(row => <button className="asset-picker__button" type="button" key={row.ticker}
          aria-pressed={row.ticker === ticker} onClick={() => onSelect(row.ticker)}>{row.ticker}</button>)}
      </div>}
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
          <div><dt>Teto de compra</dt><dd>{evaluation.priceLimitCents === null ? 'Não definido' : formatPrice(evaluation.priceLimitCents, evaluation.currency)}</dd></div>
        </dl>
        <h4>Motivos e próximos critérios</h4><ReasonList rows={evaluation.explanations} />
        <h4>Métricas e faixas</h4>
        <div className="evidence-list">{evaluation.evidence.map((row, index) =>
          <details key={`${row.ruleId}/${row.reasonCode}/${index}`}>
            <summary><span>{row.ruleId}</span><strong>{row.observedValue === null ? 'Ausente' : `${row.observedValue} ${row.unit}`} · {formatScore(row.score)}</strong></summary>
            <dl><div><dt>Faixas</dt><dd>{row.anchors.length ? row.anchors.join(' · ') : 'Não definidas'}</dd></div>
              <div><dt>Situação</dt><dd>{applicability[row.applicability]}</dd></div><div><dt>Critério</dt><dd>{row.reasonCode}</dd></div>
              <div><dt>Origem</dt><dd>{row.source ?? 'Não informada'}</dd></div>
              <div><dt>Período</dt><dd>{row.period ? `${row.period.start} a ${row.period.end}` : 'Não informado'}</dd></div>
            </dl>
          </details>)}</div>
      </div>}
    </>}
  </section>;
}
