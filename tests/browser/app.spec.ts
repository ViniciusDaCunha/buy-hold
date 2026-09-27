import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { runCli } from '../../backend/src/cli/cli';

test('abre a aplicação local e informa que os dados são fictícios', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Seu próximo aporte.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Aviso de simulação')).toContainText(
    'Dados fictícios',
  );
  await page.getByRole('button', { name: 'Simular aporte' }).click();
  await expect(page.getByRole('status')).toContainText('Proposta pronta');
  await expect(page.getByText('R$ 274,59', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Usar aporte de R$ 1.000' }).click();
  await expect(page.getByRole('status')).toContainText('desatualizado');
  await page.getByRole('button', { name: 'Simular aporte' }).click();
  await expect(page.getByText('R$ 368,64', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Distribua seu aporte em 5 ativos/ })).toBeVisible();
});

for (const width of [360, 768, 1280]) {
  test(`proposta legível a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByLabel('Valor do aporte').focus();
    await expect(page.getByLabel('Valor do aporte')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText('Proposta pronta');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`proposal-${width}.png`), fullPage: true });
  });
}

test('detalha exclusão e baixa apenas a proposta atual', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simular aporte' }).click();
  await expect(page.getByRole('status')).toContainText('Proposta pronta');
  await page.getByRole('tab', { name: /Sem aporte/ }).click();
  const excluded = page.getByRole('region', { name: 'Ativos não selecionados' });
  await excluded.getByRole('button', { name: 'SCHD' }).click();
  await expect(page.getByRole('region', { name: 'Evidências do ativo' }))
    .toContainText('perfil não possui regra de compra suportada');
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^simulacao-sha256-[0-9a-f]{64}\.json$/);
  const data = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(data).toMatchObject({ simulation: true, schemaVersion: '1.0', principalCents: '22500',
    unallocatedCents: '27459' });
  expect(data.purchases.map((row: { ticker: string; quantity: number }) => [row.ticker, row.quantity]))
    .toEqual([['ABEV3', 1], ['BBSE3', 1], ['IVVB11', 2]]);
  await expect(page.locator('#export-hint')).toContainText('Download iniciado');
  await page.getByLabel('Valor do aporte').fill('1.000,00');
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeDisabled();
});

test('CLI e navegador produzem o mesmo documento financeiro nos cenários web', async ({ page }) => {
  await page.goto('/');
  const externalRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/')) externalRequests.push(request.url());
  });
  for (const [scenario, amount] of [
    ['S01', '500,00'], ['S01', '1.000,00'], ['S05', '500,00'], ['S06', '500,00'], ['S08', '500,00'],
  ] as const) {
    await page.getByLabel('Cenário fictício').selectOption(scenario);
    await page.getByLabel('Valor do aporte').fill(amount);
    await page.getByRole('button', { name: 'Simular aporte' }).click();
    await expect(page.getByRole('status')).toContainText(/Proposta pronta|Sem compras/);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON' }).click();
    const browserDocument = JSON.parse(await readFile(await (await downloadPromise).path(), 'utf8'));
    const stdout: string[] = []; const stderr: string[] = [];
    const status = await runCli(['--aporte', amount, '--cenario', scenario, '--json'], {
      stdout: text => stdout.push(text), stderr: text => stderr.push(text),
    });
    expect(status, scenario).toBe(0);
    expect(stderr, scenario).toEqual([]);
    expect(browserDocument, `${scenario} ${amount}`).toEqual(JSON.parse(stdout.join('')));
  }
  expect(externalRequests).toEqual([]);
});

test('teclado valida, abre evidência e impede download desatualizado', async ({ page }) => {
  await page.goto('/');
  const amount = page.getByLabel('Valor do aporte');
  await amount.fill('0');
  await amount.press('Enter');
  await expect(page.getByRole('alert')).toContainText('APORTE_RANGE');
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeDisabled();
  await amount.fill('500,00');
  await amount.press('Enter');
  await expect(page.getByRole('status')).toContainText('Proposta pronta');
  const detail = page.getByRole('region', { name: 'Detalhe da evidência' });
  const ticker = detail.getByRole('button', { name: 'IVVB11' });
  await ticker.focus();
  await page.keyboard.press('Enter');
  await expect(detail.getByRole('heading', { name: /IVVB11/ })).toBeVisible();
  const disclosure = detail.locator('details').first();
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure.getByText('Faixas')).toBeVisible();
  await amount.fill('1.000,00');
  await expect(page.getByRole('status')).toContainText('desatualizado');
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeDisabled();
});

test('navegação móvel, abas e detalhe modal funcionam por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await nav.getByRole('button', { name: 'Minha carteira' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Minha carteira.' })).toBeVisible();
  await nav.getByRole('button', { name: 'Próximo aporte' }).click();
  await page.getByRole('button', { name: 'Simular aporte' }).click();
  await expect(page.getByRole('status')).toContainText('Proposta pronta');
  const reasons = page.getByRole('tab', { name: 'Por trás da escolha' });
  await reasons.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Sem aporte/ })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(reasons).toHaveAttribute('aria-selected', 'true');
  const purchase = page.getByRole('table', { name: 'Compras simuladas' }).getByRole('button', { name: /IVVB11/ });
  await purchase.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Detalhe do ativo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Detalhe do ativo' })).toBeHidden();
  await expect(purchase).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await nav.getByRole('button', { name: 'Minha estratégia' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Minha estratégia.' })).toBeInViewport();
});

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
  test(`V3 Premium visual ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Usar aporte de R$ 1.000' }).click();
    await page.getByRole('button', { name: 'Simular aporte' }).click();
    await expect(page.getByRole('status')).toContainText('Proposta pronta');
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width === 390) {
      const nav = page.getByRole('navigation', { name: 'Navegação principal' });
      expect(await nav.evaluate(element => getComputedStyle(element).position)).toBe('fixed');
      await expect(nav.getByRole('button', { name: 'Minha carteira' })).toBeVisible();
    }
    await expect(page).toHaveScreenshot(`v3-premium-${viewport.width}x${viewport.height}.png`, { animations: 'disabled' });
  });
}
