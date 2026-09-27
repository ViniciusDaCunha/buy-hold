import type { SimulationResult } from '../../../../../../backend/src/domain/result';
import type { EvidenceTab, ViewProposal } from '../../../uiTypes';
import { formatBrl } from '../../../format';
import { presentWarning } from '../../../presenter';
import { EvidencePanel } from './EvidencePanel';
import { ExcludedPanel } from './ExcludedPanel';
import './EvidenceTabs.css';

export function EvidenceTabs({ result, proposal, selectedTicker, activeTab, onSelect, onOpenAsset, onTabChange }: {
  readonly result: SimulationResult | null;
  readonly proposal: ViewProposal | null;
  readonly selectedTicker: string | null;
  readonly activeTab: EvidenceTab;
  readonly onSelect: (ticker: string) => void;
  readonly onOpenAsset: (ticker: string) => void;
  readonly onTabChange: (tab: EvidenceTab) => void;
}) {
  return <section className="panel evidence-tabs" aria-label="Detalhes da proposta">
    <div className="tab-list" role="tablist" aria-label="Detalhes da proposta">
      {([['reasons', 'Por trás da escolha'], ['excluded', `Sem aporte (${result?.excludedAssets.length ?? 0})`], ['data', 'Dados e premissas']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={activeTab === id} aria-controls={`panel-${id}`} tabIndex={activeTab === id ? 0 : -1}
          onClick={() => onTabChange(id)} onKeyDown={event => {
            const ids: EvidenceTab[] = ['reasons', 'excluded', 'data']; const index = ids.indexOf(id);
            const next = event.key === 'ArrowRight' ? ids[(index + 1) % 3] : event.key === 'ArrowLeft' ? ids[(index + 2) % 3] : null;
            if (next) { event.preventDefault(); onTabChange(next); document.getElementById(`tab-${next}`)?.focus(); }
          }}>{label}</button>)}
    </div>
    <div id="panel-reasons" role="tabpanel" aria-labelledby="tab-reasons" hidden={activeTab !== 'reasons'}>
      <EvidencePanel result={result} ticker={selectedTicker} onSelect={onSelect} />
    </div>
    <div id="panel-excluded" role="tabpanel" aria-labelledby="tab-excluded" hidden={activeTab !== 'excluded'}>
      <ExcludedPanel result={result} ticker={selectedTicker} onSelect={onOpenAsset} />
    </div>
    <div id="panel-data" role="tabpanel" aria-labelledby="tab-data" hidden={activeTab !== 'data'} className="premises-panel">
      <h2>Uma proposta que você pode conferir</h2>
      <p>Data-base: {proposal?.view.analysisDate ?? '—'}. Fontes e períodos aparecem no detalhe do ativo.</p>
      <dl><div><dt>Política</dt><dd>v{proposal?.view.policyVersion ?? '—'}</dd></div>
        <div><dt>Fixture</dt><dd>{proposal?.view.fixtureVersion ?? '—'}</dd></div>
        <div><dt>Snapshot</dt><dd>{result?.snapshots.length ?? 0} entrada(s) preservada(s) no JSON</dd></div>
        <div><dt>Reserva de preço</dt><dd>{result ? formatBrl(result.reserveCents) : '—'}</dd></div>
      </dl>
      {result?.warnings.length ? <ul>{result.warnings.map(code => <li key={code}>{presentWarning(code)}</li>)}</ul> : null}
    </div>
  </section>;
}
