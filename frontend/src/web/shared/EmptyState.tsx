import type { ReactNode } from 'react';
import './EmptyState.css';

export function EmptyState({ children, compact = false }: { readonly children: ReactNode; readonly compact?: boolean }) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      <span className="empty-state__line" aria-hidden="true" />
      <strong>Aguardando simulação</strong>
      <span>{children}</span>
    </div>
  );
}
