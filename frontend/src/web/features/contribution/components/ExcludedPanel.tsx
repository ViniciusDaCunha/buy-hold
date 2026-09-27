import type { SimulationResult } from '../../../../../../backend/src/domain/result';
import { EmptyState } from '../../../shared/EmptyState';
import { SectionPanel } from '../../../shared/SectionPanel';
import { ReasonList } from './ReasonList';
import './ExcludedPanel.css';

export function ExcludedPanel({ result, ticker, onSelect }: {
  readonly result: SimulationResult | null;
  readonly ticker: string | null;
  readonly onSelect: (ticker: string) => void;
}) {
  return <SectionPanel id="excluded-title" title="Ativos não selecionados" eyebrow="Motivos de exclusão">
    {!result ? <EmptyState>Bloqueios e limitações aparecerão aqui com seus respectivos motivos.</EmptyState> :
      result.excludedAssets.length === 0 ? <p className="panel__footer">Nenhum ativo excluído nesta simulação.</p> :
      <ul className="excluded-list">{result.excludedAssets.map(row => <li key={row.ticker}>
        <button type="button" className="text-button" aria-pressed={ticker === row.ticker} onClick={() => onSelect(row.ticker)}>{row.ticker}</button>
        <ReasonList rows={row.explanations} />
      </li>)}</ul>}
  </SectionPanel>;
}
