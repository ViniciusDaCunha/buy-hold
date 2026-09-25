import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/web/App';

describe('App', () => {
  it('identifica a fundação como uma simulação sem compras reais', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Simulador de aportes' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Aviso de simulação')).toHaveTextContent(
      'não executa nem registra compras',
    );
  });

  it('oferece controles nativos rotulados sem anunciar análise ainda inexistente', () => {
    render(<App />);

    expect(screen.getByRole('textbox', { name: 'Valor do aporte' })).toHaveAttribute(
      'aria-describedby',
      'contribution-hint',
    );
    expect(screen.getByRole('combobox', { name: 'Cenário fictício' })).toHaveValue('S01');
    expect(screen.getByRole('button', { name: 'Usar aporte de R$ 500' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Usar aporte de R$ 1.000' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Analisar aporte' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Aguardando análise');
  });

  it('estrutura resumo, proposta, evidências, exclusões e pesos sem inventar resultado', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 2, name: 'Resumo da simulação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Proposta de compras' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Evidências por ativo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ativos não selecionados' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pesos da carteira' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Compras simuladas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ativo' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Detalhe da evidência' })).toHaveTextContent(
      'Selecione um ativo após analisar',
    );
    expect(screen.getAllByText('Aguardando simulação').length).toBeGreaterThan(0);
    expect(screen.queryByText(/compra confirmada/i)).not.toBeInTheDocument();
  });
});
