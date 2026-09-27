import type { ReactNode } from 'react';
import type { Page } from '../uiTypes';
import { PrimaryNavigation } from '../shared/PrimaryNavigation';
import './AppShell.css';

const pageLabels: Record<Page, string> = {
  aporte: 'Próximo aporte',
  carteira: 'Minha carteira',
  estrategia: 'Minha estratégia',
};

export function AppShell({ page, onPage, children }: {
  readonly page: Page;
  readonly onPage: (page: Page) => void;
  readonly children: ReactNode;
}) {
  return <>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 26V14l7-5v17M11 26V5l7 4v17M18 26V15l6-4v15M3 27h22" /></svg></span><span>buy&amp;hold</span></div>
        <div className="workspace"><strong>Minha carteira pessoal</strong><span>Longo prazo · dados fictícios</span></div>
        <p className="nav-heading">Investir com intenção</p>
        <PrimaryNavigation page={page} onPage={onPage} />
        <div className="sidebar-bottom"><p>O tempo a favor<br />das suas escolhas.</p><span>Ambiente de demonstração</span></div>
      </aside>
      <div className="app-content">
        <header className="topbar"><span className="breadcrumb">Minha carteira / {pageLabels[page]}</span>
          <span className="demo-badge">Dados fictícios · nenhuma ordem é executada</span></header>
        <main id="main-content" className="main-content">
          <aside className="simulation-warning" aria-label="Aviso de simulação">Dados fictícios — simulação. Esta aplicação não executa nem registra compras e não constitui recomendação.</aside>
          {children}
          <footer className="site-footer">Dados fictícios e versionados · Execução local · Sem conexão com corretora</footer>
        </main>
      </div>
    </div>
  </>;
}
