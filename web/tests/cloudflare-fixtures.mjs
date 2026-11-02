import { readFile, readdir } from 'node:fs/promises';

export async function migrate(DB) {
  const directory = new URL('../../cloudflare/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    let sql = (await readFile(new URL(name, directory), 'utf8')).replace(/^--.*$/gm, '').trim();
    while (sql) {
      const end = sql.startsWith('CREATE TRIGGER') ? sql.indexOf('END;') + 4 : sql.indexOf(';') + 1;
      if (!end) throw Error('Unterminated migration statement');
      await DB.prepare(sql.slice(0, end)).run();
      sql = sql.slice(end).trim();
    }
  }
}
