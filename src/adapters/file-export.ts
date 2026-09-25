import { randomUUID } from 'node:crypto';
import { link, open, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

/**
 * Publica no mesmo filesystem sem substituir um nome existente. O hard link
 * torna visível apenas o inode temporário já completo e falha atomicamente com
 * EEXIST quando outro publicador venceu a disputa.
 */
export async function publishJsonExclusive(destination: string, contents: string): Promise<void> {
  const directory = dirname(destination);
  const temporary = join(directory, `.${basename(destination)}.tmp-${process.pid}-${randomUUID()}`);
  let created = false;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    created = true;
    try {
      await handle.writeFile(contents, { encoding: 'utf8' });
      await handle.sync();
    } finally {
      await handle.close();
    }
    await link(temporary, destination);
  } finally {
    if (created) await unlink(temporary);
  }
}
