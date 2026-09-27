import type { ContributionViewModel } from '../../../presenter';
import './AllocationImpact.css';

export function AllocationImpact({ view }: { readonly view: ContributionViewModel | undefined }) {
  return <section className="impact-card panel">
    <h2>O que muda com o aporte</h2><p>Alocação por classe · atual → após compras simuladas</p>
    {view?.classes.map(item => <div className="impact-item" key={item.id}>
      <div><strong>{item.name}</strong><span>{item.beforeLabel} → {item.afterLabel} · meta {item.targetLabel}</span></div>
      <div className="impact-track" aria-hidden="true"><span className={`class-color--${item.id}`} style={{ width: `${item.after / 100}%` }} />
        <i style={{ left: `${item.target / 100}%` }} /></div>
    </div>)}
    {!view && <p>O impacto aparecerá depois da análise.</p>}
    <p className="impact-note">Custos e reserva de preço consomem caixa. Saldo não alocado: {view?.cash ?? '—'}.</p>
  </section>;
}
