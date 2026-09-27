import type { Page } from '../uiTypes';
import './PrimaryNavigation.css';

const navigation: { readonly id: Page; readonly label: string }[] = [
  { id: 'aporte', label: 'Próximo aporte' },
  { id: 'carteira', label: 'Minha carteira' },
  { id: 'estrategia', label: 'Minha estratégia' },
];

function navigationIcon(page: Page) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {page === 'aporte' && <path d="M5 17 17 5M7 5h10v10M5 22h16" />}
      {page === 'carteira' && <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M15 14h3" /></>}
      {page === 'estrategia' && <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />}
    </svg>
  );
}

export function PrimaryNavigation({ page, onPage }: { readonly page: Page; readonly onPage: (page: Page) => void }) {
  return (
    <nav className="primary-nav" aria-label="Navegação principal">
      {navigation.map(item => (
        <button key={item.id} type="button" className={page === item.id ? 'nav-item active' : 'nav-item'}
          aria-current={page === item.id ? 'page' : undefined} onClick={() => onPage(item.id)}>
          <span className="nav-icon">{navigationIcon(item.id)}</span><span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
