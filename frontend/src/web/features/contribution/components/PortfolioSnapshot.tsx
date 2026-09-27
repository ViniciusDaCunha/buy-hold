import type { ContributionViewModel } from '../../../presenter';
import './PortfolioSnapshot.css';

export function PortfolioSnapshot({ view, onOpenPortfolio }: {
  readonly view: ContributionViewModel | undefined;
  readonly onOpenPortfolio: () => void;
}) {
  return <section className="portfolio-card panel">
    <div className="context-head"><h2>De onde você parte</h2><span>{view?.holdings.length ?? '—'} ativos</span></div>
    <p>Patrimônio simulado</p><strong className="portfolio-value">{view?.portfolioValue ?? '—'}</strong>
    <p>Snapshot de {view?.analysisDate ?? 'data-base da análise'}</p>
    <div className="portfolio-stack" aria-hidden="true">{view?.classes.map(item =>
      <span key={item.id} className={`class-color--${item.id}`} style={{ width: `${item.before / 100}%` }} />)}</div>
    {view?.classes.map(item => <div className="allocation-row" key={item.id}>
      <span><i className={`class-key class-color--${item.id}`} />{item.name}</span><strong>{item.beforeLabel}</strong>
    </div>)}
    <button type="button" className="context-link" onClick={onOpenPortfolio}>Examinar carteira →</button>
  </section>;
}
