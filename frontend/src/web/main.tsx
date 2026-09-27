import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './style/tokens.css';
import './style/global.css';

const rootElement = document.querySelector<HTMLElement>('#root');

if (rootElement === null) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
