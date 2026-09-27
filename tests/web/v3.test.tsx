import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../../frontend/src/web/App';

async function analyze() {
  fireEvent.click(screen.getByRole('button', { name: /simular aporte|analisar aporte/i }));
  await screen.findByText('R$ 274,59');
}

it('navega entre aporte, carteira e estratégia sem alterar a proposta', async () => {
  render(<App />);
  await analyze();
  expect(screen.getByRole('heading', { name: 'Distribua seu aporte em 3 ativos.' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Proposta pronta');
  fireEvent.click(screen.getByRole('tab', { name: /Sem aporte/ }));
  const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Minha carteira' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Minha carteira.' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Posições atuais' })).toHaveTextContent('SCHD');
  fireEvent.click(within(navigation).getByRole('button', { name: 'Minha estratégia' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Minha estratégia.' })).toBeInTheDocument();
  fireEvent.click(within(navigation).getByRole('button', { name: 'Próximo aporte' }));
  expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeEnabled();
  expect(screen.getByRole('tab', { name: /Sem aporte/ })).toHaveAttribute('aria-selected', 'true');
});

it('mantém um único painel ativo com IDs acessíveis após uma análise', async () => {
  render(<App />);
  await analyze();
  expect(document.querySelectorAll('#weights-title')).toHaveLength(1);
});

it('mostra dados parciais e concentração derivados da avaliação real', async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S06' } });
  fireEvent.click(screen.getByRole('button', { name: /simular aporte|analisar aporte/i }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('dados parciais'));
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S08' } });
  fireEvent.click(screen.getByRole('button', { name: /simular aporte|analisar aporte/i }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('concentração excessiva'));
});

it('distingue falta de elegibilidade de uma compra inviável pelo lote', async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S05' } });
  fireEvent.click(screen.getByRole('button', { name: 'Simular aporte' }));
  expect(await screen.findByRole('heading', { name: 'Nenhum ativo elegível neste cenário.' })).toBeInTheDocument();
  expect(screen.getByText('Sem ativos elegíveis')).toBeInTheDocument();
});

it('sinaliza carregamento e erro global sem apresentar valores inventados', async () => {
  let rejectPending: (error: Error) => void = () => undefined;
  render(<App simulate={() => new Promise((_resolve, reject) => { rejectPending = reject; })} />);
  expect(screen.getAllByText('Aguardando análise').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Simular aporte' }));
  expect(screen.getByText('Analisando')).toBeInTheDocument();
  await act(async () => { rejectPending(new Error('detalhes internos')); });
  expect(screen.getByText('Erro global')).toBeInTheDocument();
  expect(screen.getByRole('alert')).not.toHaveTextContent('detalhes internos');
  expect(screen.getByText('Compras e reserva').parentElement).toHaveTextContent('—');
});
