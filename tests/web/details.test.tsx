import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../../src/web/App';
import { buildScenario } from '../../fixtures/scenarios';
import { parseSimulationInput } from '../../src/domain/input';
import { simulateContribution } from '../../src/application/simulation';
import { createSha256DecisionId } from '../../src/adapters/decision-id';

const analyze = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Analisar aporte' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Proposta pronta|Sem compras/));
};

it('mostra compra, evidências e motivos ao selecionar ativos', async () => {
  render(<App />);
  await analyze();
  const purchases = screen.getByRole('table', { name: 'Compras simuladas' });
  expect(within(purchases).getByRole('columnheader', { name: 'Preço simulado' })).toBeInTheDocument();
  expect(within(purchases).getByRole('columnheader', { name: 'Teto' })).toBeInTheDocument();
  expect(within(purchases).getByRole('columnheader', { name: 'Custos' })).toBeInTheDocument();
  fireEvent.click(within(purchases).getByRole('button', { name: /IVVB11/ }));
  const detail = screen.getByRole('region', { name: 'Detalhe da evidência' });
  expect(within(detail).getByRole('heading', { name: /IVVB11/ })).toBeInTheDocument();
  expect(detail).toHaveTextContent('Confiança');
  expect(detail).toHaveTextContent('Faixas');
  expect(detail).toHaveTextContent('não avaliado');
  const excluded = screen.getByRole('region', { name: /Ativos não selecionados/ });
  fireEvent.click(within(excluded).getByRole('button', { name: /SCHD/ }));
  expect(within(detail).getByRole('heading', { name: /SCHD/ })).toBeInTheDocument();
  expect(detail).toHaveTextContent('perfil não possui regra de compra suportada');
});

it('expõe ausências locais e pesos derivados do resultado, inclusive saldo e custos', async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('Cenário fictício'), { target: { value: 'S06' } });
  await analyze();
  const excluded = screen.getByRole('region', { name: /Ativos não selecionados/ });
  fireEvent.click(within(excluded).getByRole('button', { name: /ITUB4/ }));
  const detail = screen.getByRole('region', { name: 'Detalhe da evidência' });
  expect(detail).toHaveTextContent('Ausente');
  expect(detail).toHaveTextContent('Falta evidência crítica de solvência');
  const weights = screen.getByRole('table', { name: 'Pesos da carteira' });
  expect(within(weights).getByRole('columnheader', { name: 'Após compras simuladas' })).toBeInTheDocument();
  expect(within(weights).getByRole('row', { name: /Caixa/ })).toHaveTextContent('%');
  expect(screen.getByText(/Custos e reserva de preço consomem caixa/)).toBeInTheDocument();
});

it('renderiza fonte HTML fictícia como texto inerte', async () => {
  render(<App simulate={async () => simulateContribution(parseSimulationInput(buildScenario('S21')),
    { createDecisionId: createSha256DecisionId })} />);
  await analyze();
  fireEvent.click(within(screen.getByRole('region', { name: 'Detalhe da evidência' }))
    .getByRole('button', { name: 'ITUB4' }));
  const source = screen.getByText('<script>alert("fictício")</script>');
  const disclosure = source.closest('details')!;
  fireEvent.click(within(disclosure).getByText(/bank\./));
  expect(source).toBeVisible();
  expect(document.querySelectorAll('script').length).toBe(0);
});

it('inicia download do JSON completo da proposta atual e bloqueia resultado desatualizado', async () => {
  const create = vi.fn((blob: Blob) => { void blob; return 'blob:proposal'; });
  const revoke = vi.fn();
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toMatch(/^simulacao-sha256-[0-9a-f]{64}\.json$/);
    expect(this.href).toContain('blob:proposal');
  });
  try {
    render(<App />);
    await analyze();
    const exportButton = screen.getByRole('button', { name: 'Exportar JSON' });
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    expect(click).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0]![0];
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(JSON.parse(json)).toMatchObject({ simulation: true, schemaVersion: '1.0',
      decisionId: expect.stringMatching(/^sha256:/), purchases: expect.any(Array), snapshots: expect.any(Array) });
    fireEvent.change(screen.getByLabelText('Valor do aporte'), { target: { value: '1.000,00' } });
    expect(exportButton).toBeDisabled();
    fireEvent.click(exportButton);
    expect(click).toHaveBeenCalledOnce();
  } finally {
    click.mockRestore();
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
  }
});

it('identifica falha de download sem perder a proposta para nova tentativa', async () => {
  const previousCreate = URL.createObjectURL;
  URL.createObjectURL = vi.fn(() => { throw new Error('falha local privada'); });
  try {
    render(<App />);
    await analyze();
    const exportButton = screen.getByRole('button', { name: 'Exportar JSON' });
    fireEvent.click(exportButton);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('download');
    expect(alert).toHaveTextContent(/sha256:[0-9a-f]{64}/);
    expect(alert).not.toHaveTextContent('falha local privada');
    expect(exportButton).toBeEnabled();
  } finally {
    URL.createObjectURL = previousCreate;
  }
});
