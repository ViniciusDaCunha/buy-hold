import type { SimulationResult } from '../../../../../../backend/src/domain/result';
import { EmptyState } from '../../../shared/EmptyState';
import { SectionPanel } from '../../../shared/SectionPanel';
import { formatBps, formatBrl } from '../../../format';
import './WeightsPanel.css';

const kindLabel = { asset: 'Ativo', class: 'Classe', cash: 'Caixa', sector: 'Setor', group: 'Grupo' };

export function WeightsPanel({ result }: { readonly result: SimulationResult | null }) {
  const before = result?.allocationsBefore ?? [];
  const rows = (kinds: readonly string[]) => before.filter(row => kinds.includes(row.kind)).map(row => {
    const after = result?.allocationsAfter.find(candidate => candidate.kind === row.kind && candidate.id === row.id);
    const target = result?.allocationsTarget.find(candidate => candidate.kind === row.kind && candidate.id === row.id);
    return <tr key={`${row.kind}/${row.id}`}>
      <th scope="row">{row.kind === 'cash' ? 'Caixa' : row.id}<small>{kindLabel[row.kind]}</small></th>
      <td>{formatBps(row.weightBps)}</td><td>{after ? formatBps(after.weightBps) : '—'}</td>
      <td>{target ? formatBps(target.weightBps) : '—'}</td><td>{row.limitBps === null ? '—' : formatBps(row.limitBps)}</td>
    </tr>;
  });
  return <SectionPanel id="weights-title" title="Pesos da carteira" eyebrow="Antes, após compras simuladas e alvo" className="weights-panel">
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
  </SectionPanel>;
}
