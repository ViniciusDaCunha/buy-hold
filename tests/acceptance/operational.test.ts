// @vitest-environment node
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { runCli } from '../../backend/src/cli/cli';

it('S24: falha real de publicação não anuncia exportação concluída nem vaza erro interno', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'simulador-s24-'));
  const destination = join(directory, 'ausente', 'proposta.json');
  const stdout: string[] = []; const stderr: string[] = [];
  const status = await runCli(['--aporte', '500', '--cenario', 'S24', '--exportar', destination], {
    stdout: text => stdout.push(text), stderr: text => stderr.push(text),
  });
  expect(status).toBe(1);
  expect(stdout.join('')).not.toContain('JSON exportado');
  const diagnostic = JSON.parse(stderr.join(''));
  expect(diagnostic).toMatchObject({ kind: 'operational', errorCode: 'OPERATION_FAILED',
    etapa: 'exportacao', scenarioId: 'S24', schemaVersion: '1.0', policyVersion: '1.0',
    decisionId: expect.stringMatching(/^sha256:[0-9a-f]{64}$/) });
  expect(stderr.join('')).not.toMatch(/ENOENT|at runCli|stack|marketSnapshot|portfolio|\/tmp\/simulador-s24-/);
});
