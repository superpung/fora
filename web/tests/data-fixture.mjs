// Browser fixtures use the same catalog/checksum contract as real releases.
import { createHash } from 'node:crypto';
export async function installDataFixture(page, raw) {
  raw.extra = { ...raw.extra, identity_version: 1 };
  for (const forum of raw.forums ?? []) for (const [i, talk] of (forum.talks ?? []).entries()) talk.id = `${forum.code}#${i}`;
  for (const day of raw.days ?? []) {
    let i = 0;
    for (const block of day.blocks ?? []) if (block.kind === 'keynotes') {
      for (const talk of block.talks ?? []) talk.id = `KEYNOTE:${day.date}#${i++}`;
    }
  }
  const body = JSON.stringify(raw), sha256 = createHash('sha256').update(body).digest('hex');
  const path = `conferences/${raw.id}/${sha256}.json`;
  await page.route('**/data/manifest.json', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify({ schema_version: 1, conferences: [{ id: raw.id, name: raw.name,
      start_date: raw.start_date, end_date: raw.end_date, timezone: raw.timezone,
      forums: raw.forums?.length ?? 0, days: raw.days?.length ?? 0, keynotes: 0, path, sha256 }] }) }));
  await page.route(`**/data/${path}`, route => route.fulfill({ contentType: 'application/json', body }));
}
