// Build independently deployable, immutable JSON objects and a small catalog.
import { interestIndex } from '../../cloudflare/heat-model.mjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = new URL('../../', import.meta.url);
const output = resolve(process.env.DATA_OUTPUT_DIR || new URL('../public/data', import.meta.url).pathname);
const manifest = JSON.parse(await readFile(new URL('web/src/data/manifest.json', root), 'utf8'));
const conferences = [];
await mkdir(output, { recursive: true });
for (const meta of manifest) {
  const bytes = await readFile(new URL(`data/${meta.id}.json`, root));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const path = `conferences/${meta.id}/${sha256}.json`;
  await mkdir(resolve(output, `conferences/${meta.id}`), { recursive: true });
  await writeFile(resolve(output, path), bytes);
  conferences.push({ ...meta, path, sha256, interest: interestIndex(JSON.parse(bytes)) });
}
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ schema_version: 1, conferences }));
await cp(new URL('../public/portraits', import.meta.url), resolve(output, 'portraits'), { recursive: true });
console.log(`Prepared ${conferences.length} independent conference objects in ${output}`);
