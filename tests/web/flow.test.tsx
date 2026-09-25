import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from '../../src/web/App';
import { simulateContribution } from '../../src/application/simulation';
import type { SimulationResult } from '../../src/domain/result';
import { InputError } from '../../src/domain/errors';

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Analisar aporte' }));
const amount = (value: string) => fireEvent.change(screen.getByLabelText('Valor do aporte'), { target: { value } });

it('valida aporte, usa atalhos e recalcula 500/1000 no motor real', async () => {
  render(<App />);
  amount('0'); submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('APORTE_RANGE');
  fireEvent.click(screen.getByLabelText('Usar aporte de R$ 500')); submit();
  await screen.findByText('R$ 274,59');
  expect(screen.getByRole('status')).toHaveTextContent('Proposta pronta');
  expect(within(screen.getByRole('table', { name: 'Compras simuladas' })).getByRole('button', { name: 'ABEV3' })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Usar aporte de R$ 1.000'));
  expect(screen.getByRole('status')).toHaveTextContent('desatualizado');
  expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeDisabled();
  submit();
  await screen.findByText('R$ 368,64');
  expect(screen.getByText('Carteira somente leitura')).toBeInTheDocument();
});

it('seleciona cenário e explica sucesso sem compras', async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S05' } });
  submit();
  await screen.findByText('Nenhuma compra proposta.');
  expect(screen.getByRole('status')).toHaveTextContent('Sem compras');
});

it('edição durante cálculo invalida também uma falha antiga', async () => {
  let rejectOld: (error: Error) => void = () => undefined;
  render(<App simulate={() => new Promise((_resolve, reject) => { rejectOld = reject; })} />);
  submit();
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S06' } });
  await act(async () => { rejectOld(new Error('falha antiga')); });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Aguardando análise');
});

it('aceita dados incompletos locais sem bloquear os demais ativos', async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S06' } });
  submit();
  await screen.findByText('R$ 274,59');
  expect(screen.getByRole('status')).toHaveTextContent('Proposta pronta');
});

it.each([new Error('SEGREDO stack carteira'), new InputError('MISSING_PRICE', 'quotes', 'Cotação ausente.')])(
  'mostra diagnóstico seguro e permite tentar novamente', async error => {
    render(<App simulate={async () => { throw error; }} />);
    submit();
    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('SEGREDO');
    expect(alert).toHaveTextContent('simulacao');
    expect(screen.getByRole('button', { name: 'Analisar aporte' })).toBeEnabled();
  },
);

it('ignora conclusão antiga depois de editar e resolver nova execução primeiro', async () => {
  const pending: { resolve: (result: SimulationResult) => void; result: Promise<SimulationResult> }[] = [];
  render(<App simulate={(input, dependencies) => new Promise(resolve => {
    pending.push({ resolve, result: simulateContribution(input, dependencies) });
  })} />);
  submit();
  expect(screen.getByRole('status')).toHaveTextContent('Analisando');
  amount('1.000,00'); submit();
  await act(async () => { pending[1]!.resolve(await pending[1]!.result); });
  expect(screen.getByText('R$ 368,64')).toBeInTheDocument();
  await act(async () => { pending[0]!.resolve(await pending[0]!.result); });
  expect(screen.getByText('R$ 368,64')).toBeInTheDocument();
  expect(screen.queryByText('R$ 274,59')).not.toBeInTheDocument();
});
