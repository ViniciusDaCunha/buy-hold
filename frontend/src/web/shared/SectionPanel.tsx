import type { ReactNode } from 'react';
import './SectionPanel.css';

interface SectionPanelProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly eyebrow?: string;
  readonly id: string;
  readonly title: string;
}

export function SectionPanel({ children, className = '', eyebrow, id, title }: SectionPanelProps) {
  return (
    <section className={`panel ${className}`.trim()} aria-labelledby={id}>
      <header className="panel__header">
        <div>
          {eyebrow === undefined ? null : <p className="eyebrow">{eyebrow}</p>}
          <h2 id={id}>{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}
