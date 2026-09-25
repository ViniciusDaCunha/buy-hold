// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildScenario } from '../../fixtures/scenarios';
import { createSha256DecisionId } from '../../src/adapters/decision-id';
import { serializeSimulationResult } from '../../src/adapters/result-json';
import { simulateContribution } from '../../src/application/simulation';
import { formatSimulation, parseCliArgs, runCli } from '../../src/cli/cli';
import { InputError } from '../../src/domain/errors';
import { parseSimulationInput } from '../../src/domain/input';

describe('argumentos da CLI', () => {
  it('recebe aporte, cenário, data, destino e formato JSON explicitamente', () => {
    expect(parseCliArgs(['--aporte', '1.000,00', '--cenario', 'S02', '--data', '2026-09-14',
      '--exportar', 'proposta.json', '--json'])).toEqual({
      aporte: '1.000,00', scenarioId: 'S02', analysisAsOf: '2026-09-14',
      exportPath: 'proposta.json', json: true,
    });
  });

  it.each([
    [[], 'MISSING_ARGUMENT'],
    [['--aporte', '0'], 'APORTE_RANGE'],
    [['--aporte', '10.00'], 'INVALID_APORTE'],
    [['--aporte', '500', '--cenario', 'S99'], 'UNKNOWN_SCENARIO'],
    [['--aporte', '500', '--desconhecido'], 'UNKNOWN_ARGUMENT'],
  ])('rejeita entrada inválida sem gerar proposta: %j', async (args, code) => {
    const output: string[] = [];
    const status = await runCli(args, { stdout: text => output.push(`out:${text}`), stderr: text => output.push(`err:${text}`) });
    expect(status).toBe(1);
    expect(output.join('\n')).toContain(`"errorCode":"${code}"`);
    expect(output.join('\n')).not.toContain('decisionId');
  });
});

describe('saída da CLI e JSON', () => {
  it('mostra simulação, tabela, custos, saldo e motivos em português', async () => {
    const result = await simulateContribution(parseSimulationInput(buildScenario('S01')),
      { createDecisionId: createSha256DecisionId });
    const text = formatSimulation(result);
    expect(text).toContain('SIMULAÇÃO — dados fictícios; nenhuma compra é executada ou registrada.');
    expect(text).toMatch(/Ticker\s+Qtd\s+Preço simulado\s+Teto\s+Custos\s+Total reservado/);
    expect(text).toContain('ABEV3');
    expect(text).toContain('Custos: R$ 0,00');
    expect(text).toContain('Saldo não alocado: R$ 274,59');
    expect(text).toContain('Motivos:');
    expect(text).toContain('cumpriu os critérios de elegibilidade');
  });

  it('serializa o resultado completo e faz round trip com bigint decimal', async () => {
    const result = await simulateContribution(parseSimulationInput(buildScenario('S02')),
      { createDecisionId: createSha256DecisionId });
    const json = serializeSimulationResult(result);
    const decoded = JSON.parse(json) as Record<string, unknown>;
    expect(decoded).toMatchObject({ simulation: true, decisionId: result.decisionId,
      principalCents: result.principalCents.toString(), feesCents: result.feesCents.toString(),
      unallocatedCents: result.unallocatedCents.toString() });
    expect(decoded.snapshots).toEqual(result.snapshots);
    expect(decoded.evaluations).toHaveLength(result.evaluations.length);
  });

  it('trata cenário calculado sem compras como sucesso', async () => {
    const stdout: string[] = []; const stderr: string[] = [];
    const status = await runCli(['--aporte', '500', '--cenario', 'S04'], {
      stdout: text => stdout.push(text), stderr: text => stderr.push(text),
    });
    expect(status).toBe(0);
    expect(stdout.join('\n')).toContain('Nenhuma compra proposta.');
    expect(stderr).toEqual([]);
  });

  it('mantém erros de validação estruturados e não expõe stack', async () => {
    expect(() => parseCliArgs(['--aporte', '500', '--data', '2026-02-30'])).toThrow(InputError);
    const stderr: string[] = [];
    const status = await runCli(['--aporte', '500', '--data', '2026-02-30'], {
      stdout: () => undefined, stderr: text => stderr.push(text),
    });
    expect(status).toBe(1);
    expect(stderr.join('\n')).toContain('"etapa":"argumentos"');
    expect(stderr.join('\n')).not.toMatch(/stack|at runCli|portfolio/);
  });
});
