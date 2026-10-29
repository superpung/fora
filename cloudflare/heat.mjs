import { aggregateInterest, buildHeatCatalog, validInterest } from './heat-model.mjs';
const TTL_MS = 300000;
const fail = (status, message) => { throw Object.assign(Error(message), { status }); };
const busy = () => Response.json({ error: 'Heat is being refreshed' }, { status: 503,
  headers: { 'Cache-Control': 'no-store', 'Retry-After': '1' } });
export const statistics = user => ({ enabled: user.statistics_enabled === 1, revision: user.statistics_revision });

let verifiedIndex = null;
export async function heatIndex(env) {
  // Revalidate against R2 on every use. An unchanged ETag avoids repeatedly
  // parsing and hashing the same publication; failed reads never use old data.
  const object = await env.DATA.get('manifest.json', verifiedIndex ? { onlyIf: { etagDoesNotMatch: verifiedIndex.etag } } : undefined);
  if (!object) fail(503, 'Published conference data is unavailable');
  if (verifiedIndex && object.etag === verifiedIndex.etag) return verifiedIndex.value;
  const catalog = (await object.json()).conferences;
  if (!Array.isArray(catalog) || catalog.some(entry => !validInterest(entry.interest))) fail(503, 'Published interest index is unavailable');
  // Text and timetable edits do not invalidate account projections. Identity changes do.
  const identities = catalog.map(({ id, interest }) => ({ id,
    forums: Object.keys(interest.forums).sort().map(code => [code, [...interest.forums[code]].sort()]),
    keynotes: [...interest.keynotes].sort(),
  })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const bytes = new TextEncoder().encode(JSON.stringify(identities));
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
  const value = { catalog, hash, lookup: buildHeatCatalog(catalog) };
  if (object.etag) verifiedIndex = { etag: object.etag, value };
  return value;
}
export function contribution(index, bundle, enabled) {
  if (!enabled) return '{}';
  const raw = aggregateInterest(index.lookup, [bundle]);
  const flat = {};
  for (const [conf, entry] of Object.entries(raw)) for (const kind of ['forums', 'talks']) {
    for (const [id, weight] of Object.entries(entry[kind])) flat[JSON.stringify([conf, kind, id])] = weight;
  }
  return JSON.stringify(flat);
}
export async function setStatistics(body, env, user) {
  if (typeof body?.enabled !== 'boolean' || !Number.isSafeInteger(body.revision) || body.revision < 0) fail(400, 'Invalid statistics setting');
  const state = await env.DB.prepare('SELECT revision, bundle, heat_index FROM sync_state WHERE user_id = ?').bind(user.id).first();
  const index = body.enabled ? await heatIndex(env) : { hash: state.heat_index };
  const projection = body.enabled ? contribution(index, JSON.parse(state.bundle), true) : '{}';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE sync_state SET heat_contribution = ?, heat_index = ? WHERE user_id = ? AND revision = ?
      AND EXISTS(SELECT 1 FROM users WHERE id = ? AND statistics_revision = ?)`)
      .bind(projection, index.hash, user.id, state.revision, user.id, body.revision),
    env.DB.prepare(`UPDATE users SET statistics_enabled = ?, statistics_revision = statistics_revision + 1
      WHERE id = ? AND statistics_revision = ? AND EXISTS(SELECT 1 FROM sync_state WHERE user_id = ? AND revision = ?)
      RETURNING statistics_enabled, statistics_revision`)
      .bind(Number(body.enabled), user.id, body.revision, user.id, state.revision),
  ]);
  const row = results[1].results[0];
  if (!row) fail(409, 'Statistics setting changed');
  return Response.json(statistics(row), { headers: { 'Cache-Control': 'no-store' } });
}

// Normal follow/participation writes update totals through transactional D1 triggers.
// A structural publication change reconciles existing accounts on demand, one at
// a time. No periodic full-user scan, background task or partial ranking is used.
export async function heat(env) {
  const now = Date.now();
  const cached = await env.DB.prepare('SELECT payload, expires_at FROM heat_cache WHERE id = 1').first();
  if (cached.payload && cached.expires_at > now) return response(cached.payload, cached.expires_at);
  const lease = now + 60000;
  const acquired = await env.DB.prepare(`UPDATE heat_cache SET lease_until = ?
    WHERE id = 1 AND expires_at <= ? AND lease_until <= ? RETURNING id`).bind(lease, now, now).first();
  if (!acquired) return busy();
  try {
    const index = await heatIndex(env);
    const stale = await env.DB.prepare(`SELECT s.user_id, s.revision, s.bundle, u.statistics_enabled, u.statistics_revision
      FROM sync_state s JOIN users u ON u.id = s.user_id WHERE s.heat_index < ? OR s.heat_index > ? LIMIT 1`).bind(index.hash, index.hash).first();
    if (stale) {
      await env.DB.prepare(`UPDATE sync_state SET heat_contribution = ?, heat_index = ? WHERE user_id = ? AND revision = ?
        AND EXISTS(SELECT 1 FROM users WHERE id = ? AND statistics_revision = ?)`)
        .bind(contribution(index, JSON.parse(stale.bundle), stale.statistics_enabled === 1), index.hash,
          stale.user_id, stale.revision, stale.user_id, stale.statistics_revision).run();
      return busy();
    }
    // D1 formats the aggregate directly: serializing thousands of rows in the
    // Worker exceeded the free CPU budget even after removing account scans.
    const { payload } = await env.DB.prepare(SNAPSHOT_SQL).bind(
      JSON.stringify(index.catalog.map(({ id, sha256 }) => ({ id, sha256 }))), new Date(now).toISOString()).first();
    const expires = now + TTL_MS;
    const updated = await env.DB.prepare('UPDATE heat_cache SET payload = ?, expires_at = ? WHERE id = 1 AND lease_until = ? RETURNING id')
      .bind(payload, expires, lease).first();
    return updated ? response(payload, expires) : busy();
  } finally {
    await env.DB.prepare('UPDATE heat_cache SET lease_until = 0 WHERE id = 1 AND lease_until = ?').bind(lease).run();
  }
}
function response(payload, expires) {
  return new Response(payload, { headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': `public, max-age=${Math.max(0, Math.floor((expires - Date.now()) / 1000))}` } });
}

export const SNAPSHOT_SQL = `WITH kinds AS MATERIALIZED (
  SELECT json_extract(target, '$[0]') conf, json_extract(target, '$[1]') kind,
    json_group_object(json_extract(target, '$[2]'), CAST(round(100 * log2(1 + weight)) AS INTEGER)) scores
  FROM heat_scores WHERE weight > 0 GROUP BY conf, kind
), catalog AS (
  SELECT json_extract(value, '$.id') id, json_extract(value, '$.sha256') sha256 FROM json_each(?1)
)
SELECT json_object('generated_at', ?2, 'conferences', json_group_object(c.id,
  json_object('sha256', c.sha256, 'forums', json(COALESCE(f.scores, '{}')),
    'talks', json(COALESCE(t.scores, '{}'))))) payload
FROM catalog c LEFT JOIN kinds f ON f.conf=c.id AND f.kind='forums'
LEFT JOIN kinds t ON t.conf=c.id AND t.kind='talks'`;
