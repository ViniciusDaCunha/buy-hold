import type { ViewProposal } from '../../../uiTypes';
import { AllocationImpact } from './AllocationImpact';
import { PolicyGuardrails } from './PolicyGuardrails';
import { PortfolioSnapshot } from './PortfolioSnapshot';
import './ContextColumn.css';

export function ContextColumn({ proposal, onPage }: {
  readonly proposal: ViewProposal | null;
  readonly onPage: (page: 'carteira' | 'estrategia') => void;
}) {
  return <aside className="context-column" aria-label="Contexto da simulação">
    <PortfolioSnapshot view={proposal?.view} onOpenPortfolio={() => onPage('carteira')} />
    <AllocationImpact view={proposal?.view} />
    <PolicyGuardrails onOpenStrategy={() => onPage('estrategia')} />
  </aside>;
}
