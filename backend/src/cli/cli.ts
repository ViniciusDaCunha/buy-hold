import { buildScenario } from '../../fixtures/scenarios';
import { createSha256DecisionId } from '../adapters/decision-id';
import { publishJsonExclusive } from '../adapters/file-export';
import { serializeSimulationResult } from '../adapters/result-json';
import { diagnose } from '../application/diagnostics';
import { simulateContribution } from '../application/simulation';
import { invalid } from '../domain/errors';
import { parseSimulationInput } from '../domain/input';
import { parseBrl } from '../domain/money';
import type { SimulationResult } from '../domain/result';
import { civilDate } from '../domain/validation';

export interface CliOptions {
  readonly aporte: string;
  readonly scenarioId: string;
  readonly analysisAsOf?: string;
  readonly exportPath?: string;
  readonly json: boolean;
}

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

export function parseCliArgs(args: readonly string[]): CliOptions {
  let aporte: string | undefined;
  let scenarioId = 'S01';
  let analysisAsOf: string | undefined;
  let exportPath: string | undefined;
  let json = false;
  const valued = new Set(['--aporte', '--cenario', '--data', '--exportar']);
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === '--json') { json = true; continue; }
    if (!valued.has(argument)) invalid('UNKNOWN_ARGUMENT', `argv.${index}`, `Argumento desconhecido: ${argument}.`);
    const value = args[++index];
    if (value === undefined || value.startsWith('--')) invalid('MISSING_ARGUMENT', argument, `Falta valor para ${argument}.`);
    if (argument === '--aporte') aporte = value;
    else if (argument === '--cenario') scenarioId = value;
    else if (argument === '--data') analysisAsOf = value;
    else exportPath = value;
  }
  if (aporte === undefined) invalid('MISSING_ARGUMENT', '--aporte', 'Informe --aporte em reais, por exemplo 500 ou 1.000,00.');
  parseBrl(aporte);
  if (analysisAsOf !== undefined) civilDate(analysisAsOf, '--data');
  if (exportPath !== undefined && exportPath.trim().length === 0) invalid('INVALID_PATH', '--exportar', 'Informe um caminho de arquivo não vazio.');
  const result: CliOptions = { aporte, scenarioId, json };
  return { ...result, ...(analysisAsOf === undefined ? {} : { analysisAsOf }),
    ...(exportPath === undefined ? {} : { exportPath }) };
}

function brl(cents: bigint): string {
  const absolute = cents < 0n ? -cents : cents;
  const digits = absolute.toString().padStart(3, '0');
  const integer = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cents < 0n ? '-' : ''}R$ ${integer},${digits.slice(-2)}`;
}

function originalPrice(cents: bigint, currency: string): string {
  if (currency === 'BRL') return brl(cents);
  const digits = cents.toString().padStart(3, '0');
  return `USD ${digits.slice(0, -2)},${digits.slice(-2)}`;
}

function row(columns: readonly string[], widths: readonly number[]): string {
  return columns.map((column, index) => column.padEnd(widths[index] ?? 0)).join('  ').trimEnd();
}

export function formatSimulation(result: SimulationResult): string {
  const lines = [
    'SIMULAÇÃO — dados fictícios; nenhuma compra é executada ou registrada.',
    `Decisão: ${result.decisionId}`,
    '',
  ];
  if (result.purchases.length === 0) lines.push('Nenhuma compra proposta.');
  else {
    const widths = [10, 5, 16, 14, 12, 16];
    lines.push(row(['Ticker', 'Qtd', 'Preço simulado', 'Teto', 'Custos', 'Total reservado'], widths));
    for (const purchase of result.purchases) {
      lines.push(row([purchase.ticker, String(purchase.quantity), originalPrice(purchase.priceSnapshot, purchase.currency),
        originalPrice(purchase.priceLimit, purchase.currency), brl(purchase.fees), brl(purchase.reservedTotal)], widths));
    }
  }
  lines.push('', `Principal: ${brl(result.principalCents)}`, `Reserva de preço: ${brl(result.reserveCents)}`,
    `Custos: ${brl(result.feesCents)}`, `Saldo não alocado: ${brl(result.unallocatedCents)}`, '', 'Motivos:');
  const explained = result.purchases.length > 0 ? result.purchases : result.excludedAssets;
  for (const asset of explained) {
    lines.push(`- ${asset.ticker}: ${asset.explanations.map(item => item.message).join(' ')}`);
  }
  return `${lines.join('\n')}\n`;
}

export async function runCli(args: readonly string[], io: CliIo): Promise<number> {
  let etapa = 'argumentos';
  let scenarioId: string | null = null;
  let decisionId: string | undefined;
  try {
    const options = parseCliArgs(args);
    scenarioId = options.scenarioId;
    etapa = 'fixture';
    const raw = buildScenario(options.scenarioId);
    raw.aporteCents = parseBrl(options.aporte).toString();
    if (options.analysisAsOf !== undefined) raw.analysisAsOf = options.analysisAsOf;
    const validated = parseSimulationInput(raw);
    etapa = 'simulacao';
    const result = await simulateContribution(validated, { createDecisionId: createSha256DecisionId });
    decisionId = result.decisionId;
    const serialized = serializeSimulationResult(result);
    io.stdout(options.json ? serialized : formatSimulation(result));
    if (options.exportPath !== undefined) {
      etapa = 'exportacao';
      await publishJsonExclusive(options.exportPath, serialized);
      if (!options.json) io.stdout(`JSON exportado sem substituir arquivo existente: ${options.exportPath}\n`);
    }
    return 0;
  } catch (error) {
    const context = { etapa, scenarioId, schemaVersion: scenarioId === null ? null : '1.0',
      policyVersion: scenarioId === null ? null : '1.0', ...(decisionId === undefined ? {} : { decisionId }) };
    io.stderr(`${JSON.stringify(diagnose(error, context))}\n`);
    return 1;
  }
}
