import './PageHeading.css';

interface PageHeadingProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly badge?: string;
  readonly variant?: 'contribution' | 'subpage';
}

export function PageHeading({ eyebrow, title, description, badge, variant = 'contribution' }: PageHeadingProps) {
  return (
    <header className={`page-heading${variant === 'subpage' ? ' page-heading--subpage' : ''}`}>
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {badge === undefined ? null : <span className="badge">{badge}</span>}
    </header>
  );
}
