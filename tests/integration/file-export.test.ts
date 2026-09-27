// @vitest-environment node
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishJsonExclusive } from '../../backend/src/adapters/file-export';
import { runCli } from '../../backend/src/cli/cli';

async function directory() {
  return mkdtemp(join(tmpdir(), 'simulador-t10-'));
}

describe('publicação JSON exclusiva no filesystem (S23)', () => {
  it('publica conteúdo completo e rejeita repetição sem alterar o arquivo anterior', async () => {
    const dir = await directory(); const destination = join(dir, 'proposta.json');
    await publishJsonExclusive(destination, '{"complete":true}\n');
    await expect(publishJsonExclusive(destination, '{"replacement":true}\n'))
      .rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(destination, 'utf8')).toBe('{"complete":true}\n');
    expect((await readdir(dir)).filter(name => name.includes('.tmp-'))).toEqual([]);
  });

  it('resolve duas publicações concorrentes com um vencedor e sem arquivo parcial', async () => {
    const dir = await directory(); const destination = join(dir, 'concorrente.json');
    const contents = ['{"writer":1,"payload":"' + 'a'.repeat(100_000) + '"}\n',
      '{"writer":2,"payload":"' + 'b'.repeat(100_000) + '"}\n'];
    const settled = await Promise.allSettled(contents.map(value => publishJsonExclusive(destination, value)));
    expect(settled.filter(item => item.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter(item => item.status === 'rejected')).toHaveLength(1);
    expect(contents).toContain(await readFile(destination, 'utf8'));
    expect((await readdir(dir)).filter(name => name.includes('.tmp-'))).toEqual([]);
  });

  it('preserva destino anterior, limpa temporário e a CLI não anuncia sucesso na falha', async () => {
    const dir = await directory(); const destination = join(dir, 'existente.json');
    await writeFile(destination, 'anterior', { flag: 'wx' });
    const stdout: string[] = []; const stderr: string[] = [];
    const status = await runCli(['--aporte', '500', '--cenario', 'S01', '--exportar', destination], {
      stdout: text => stdout.push(text), stderr: text => stderr.push(text),
    });
    expect(status).toBe(1);
    expect(await readFile(destination, 'utf8')).toBe('anterior');
    expect((await readdir(dir)).filter(name => name.includes('.tmp-'))).toEqual([]);
    expect(stdout.join('\n')).not.toContain('JSON exportado');
    expect(stderr.join('\n')).toContain('"etapa":"exportacao"');
    expect(stderr.join('\n')).toContain('"errorCode":"EXPORT_DESTINATION_EXISTS"');
    expect(stderr.join('\n')).toContain('Escolha outro caminho');
    expect(stderr.join('\n')).toContain('"decisionId":"sha256:');
  });
});
