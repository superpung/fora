import { migrate } from './cloudflare-fixtures.mjs';
import worker from '../../cloudflare/worker.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Miniflare } from 'miniflare';
import { heatIndex, contribution, SNAPSHOT_SQL } from '../../cloudflare/heat.mjs';
import { aggregateInterest, buildHeatCatalog, interestIndex } from '../../cloudflare/heat-model.mjs';
const heatScore = weight => Math.round(100 * Math.log2(1 + weight));
const scoreInterest = raw => Object.fromEntries(Object.entries(raw).map(([id, entry]) => [id, {
  sha256: entry.sha256,
  forums: Object.fromEntries(Object.entries(entry.forums).map(([key, weight]) => [key, heatScore(weight)])),
  talks: Object.fromEntries(Object.entries(entry.talks).map(([key, weight]) => [key, heatScore(weight)])),
}]));
const calculateHeat = (catalog, bundles) => scoreInterest(aggregateInterest(buildHeatCatalog(catalog), bundles));
const talks = Array.from({ length: 10 }, (_, i) => ({ id: `F#${i}`, title: { zh: `Report ${i}` } }));
const data = { id: 'sample', forums: [{ code: 'F', talks }, { code: 'E', talks: [] }],
  days: [{ date: '2030-01-01', blocks: [{ kind: 'keynotes', talks: [{ id: 'KEYNOTE:2030-01-01#0' }] }] }] };
const entry = { id: 'sample', sha256: 'a'.repeat(64), interest: interestIndex(data) };
const bundle = (...keys) => ({ app: 'fora', version: 1, prefs: {}, follows: keys.map(([type, id]) => JSON.stringify(['sample', type, id])) });
const calc = (...users) => calculateHeat([entry], users).sample;
assert.equal(heatScore(0), 0);
const withOpening = interestIndex({ forums: [{ code: 'F', talks: [...talks, { id: 'F#99', type: 'opening' }] }] });
assert.deepEqual(withOpening.forums.F, talks.map(talk => talk.id), 'opening slots do not dilute report interest');
assert.deepEqual(scoreInterest(aggregateInterest(buildHeatCatalog([{ ...entry, interest: withOpening }]), [bundle(['talks', 'F#99'])])).sample.talks, {});
assert.equal(heatScore(1), 100);
assert.equal(heatScore(3), 200);
assert.deepEqual(calc().forums, {});
assert.equal(calc(bundle(['forums', 'F'])).forums.F, 200);
assert.equal(calc(bundle(['forums', 'F'])).talks['F#0'], heatScore(0.1));
assert.equal(calc(bundle(['talks', 'F#0'])).forums.F, 100);
assert.equal(calc(bundle(['talks', 'F#0'])).talks['F#0'], 200);
const all = bundle(['forums', 'F'], ...talks.map(t => ['talks', t.id]));
assert.equal(calc(all).forums.F, 200, 'one account cannot multiply its forum contribution');
assert.equal(calc(all).talks['F#0'], 200, 'direct and indirect contributions do not stack');
assert.equal(calc(bundle(['talks', 'F#0'], ['talks', 'F#0'])).talks['F#0'], 200);
assert.equal(calc({ ...all, follows: ['["sample", "talks", "F#0"]', '["sample","talks","F#0"]'] }).talks['F#0'], 200, 'JSON whitespace does not create extra follows');
assert.equal(calc(all, all).forums.F, heatScore(6), 'different accounts contribute separately');
assert.deepEqual(calc(bundle(['speakers', 'name:Alex'], ['talks', 'F#999'], ['forums', 'unknown'])).forums, {});
assert.deepEqual(calc(bundle(['talks', 'KEYNOTE:2030-01-01#0'])).forums, {});
assert.equal(calc(bundle(['talks', 'KEYNOTE:2030-01-01#0'])).talks['KEYNOTE:2030-01-01#0'], 200);
assert.equal(calc(bundle(['forums', 'E'])).forums.E, 200);
const shuffled = { ...entry, data: { ...data, forums: [{ ...data.forums[0], talks: [...talks].reverse(), sessions: [{ date: '2030-01-01' }, { date: '2030-01-02' }] }, data.forums[1]] } };
shuffled.interest = interestIndex(shuffled.data);
assert.deepEqual(calculateHeat([shuffled], [all]).sample, calc(all));
assert.deepEqual(calculateHeat([{ ...entry, id: 'other' }], [all]).other.forums, {});
const withdrawn = calc(bundle());
assert.deepEqual(withdrawn.forums, {});
for (let n = 1; n < 1000; n++) assert(heatScore(n) >= heatScore(n - 1));
console.log('PASS heat weights, deduplication, caps, indirect distribution, keynotes, invalid IDs, reorder and conference isolation');

const origin = 'https://fora.test';
const mf = new Miniflare({ modules: true, scriptPath: new URL('../../cloudflare/worker.mjs', import.meta.url).pathname,
  modulesRoot: new URL('../../cloudflare/', import.meta.url).pathname, compatibilityDate: '2026-07-30',
  d1Databases: { DB: 'heat-test' }, r2Buckets: ['DATA'], bindings: { PUBLIC_ORIGIN: origin } });
try {
  const { DB, DATA } = await mf.getBindings();
  await migrate(DB);
  const token = 'a'.repeat(64);
  await DB.batch([
    DB.prepare("INSERT INTO users (id, github_id, login) VALUES ('a', '1', 'alice')"),
    DB.prepare('INSERT INTO sync_state (user_id, bundle) VALUES (?, ?)').bind('a', JSON.stringify(all)),
    DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(createHash('sha256').update(token).digest('hex'), 'a', 9999999999),
  ]);
  await DATA.put('manifest.json', JSON.stringify({ conferences: [entry] }));
  await DATA.put('sample.json', JSON.stringify(data));
  const headers = { Cookie: '__Host-fora-session=' + token, Origin: origin, 'Content-Type': 'application/json' };
  const set = (enabled, revision, custom = headers) => mf.dispatchFetch(origin + '/api/statistics', { method: 'PUT', headers: custom, body: JSON.stringify({ enabled, revision }) });
  const get = async () => {
    for (let n = 0; n < 30; n++) {
      const response = await mf.dispatchFetch(origin + '/api/heat');
      if (!response.headers.has('Retry-After')) return response;
      if ((await DB.prepare('SELECT lease_until FROM heat_cache').first()).lease_until > Date.now()) return response;
    }
    throw Error('Heat reconciliation did not finish');
  };
  const expire = () => DB.prepare('UPDATE heat_cache SET expires_at = 0 WHERE id = 1').run();
  assert.deepEqual((await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics, { enabled: true, revision: 0 });
  let response = await get();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control'), /public, max-age=29\d/);
  const initial = await response.json();
  assert.equal(initial.conferences.sample.forums.F, 200);
  assert(!JSON.stringify(initial).includes('alice'));
  assert.deepEqual(await (await get()).json(), initial);
  assert.equal((await set(false, 0, { ...headers, Cookie: '' })).status, 401);
  assert.equal((await set(false, 0, { ...headers, Origin: 'https://elsewhere.test' })).status, 403);
  for (const invalid of [null, 'false', 1]) assert.equal((await set(invalid, 0)).status, 400);
  assert.equal((await set(false, -1)).status, 400);
  assert.equal((await mf.dispatchFetch(origin + '/api/statistics', { method: 'PUT', headers, body: ' '.repeat(1000) })).status, 413);
  assert.deepEqual(await (await set(false, 0)).json(), { enabled: false, revision: 1 });
  assert.equal((await set(true, 0)).status, 409, 'stale devices cannot silently re-enable statistics');
  await expire();
  assert.deepEqual((await (await get()).json()).conferences.sample.talks, {});
  assert.deepEqual(JSON.parse((await DB.prepare("SELECT bundle FROM sync_state WHERE user_id='a'").first()).bundle), all, 'withdrawal preserves follows');
  const sync = await mf.dispatchFetch(origin + '/api/sync', { method: 'PUT', headers,
    body: JSON.stringify({ revision: 0, bundle: { ...all, prefs: { 'statistics.enabled': 'true' } } }) });
  assert.equal(sync.status, 200);
  assert.equal((await sync.json()).statistics.enabled, false, 'ordinary sync cannot overwrite participation');
  assert.equal((await set(true, 1)).status, 200);
  await expire();
  assert.equal((await (await get()).json()).conferences.sample.forums.F, 200);
  const competing = await Promise.all([set(false, 2), set(true, 2)]);
  assert.deepEqual(competing.map(r => r.status).sort(), [200, 409]);
  await DB.prepare('UPDATE heat_cache SET expires_at = 0, lease_until = ? WHERE id = 1').bind(Date.now() + 60000).run();
  assert.equal((await get()).status, 503, 'a busy rebuild never serves an expired snapshot');
  await DB.prepare('UPDATE heat_cache SET lease_until = 0 WHERE id = 1').run();
  await DATA.put('manifest.json', JSON.stringify({ conferences: [{ ...entry, interest: null }] }));
  assert.equal((await get()).status, 503);
  assert.equal((await DB.prepare('SELECT lease_until FROM heat_cache').first()).lease_until, 0);
  await DATA.put('manifest.json', JSON.stringify({ conferences: [entry] }));
  assert.equal((await get()).status, 200, 'failed rebuild releases its lease');
  console.log('PASS statistics defaults, authorization, bounded requests, CAS, withdrawal, sync independence, cache expiry and lease recovery');

  let settings = (await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics;
  if (!settings.enabled) await set(true, settings.revision);
  const put = async value => {
    const row = await DB.prepare("SELECT revision FROM sync_state WHERE user_id='a'").first();
    return mf.dispatchFetch(origin + '/api/sync', { method: 'PUT', headers,
      body: JSON.stringify({ revision: row.revision, bundle: value }) });
  };
  const expected = async () => {
    const rows = await DB.prepare('SELECT bundle FROM sync_state JOIN users ON users.id=sync_state.user_id WHERE statistics_enabled=1').all();
    const index = await heatIndex({ DATA });
    return calculateHeat(index.catalog, rows.results.map(row => JSON.parse(row.bundle)));
  };
  for (const follows of [bundle(['talks', 'F#0']), bundle(['forums', 'F']), all, bundle(), all]) {
    assert.equal((await put(follows)).status, 200);
    await expire();
    assert.deepEqual((await (await get()).json()).conferences, await expected());
  }
  for (let n = 0; n < 3; n++) {
    settings = (await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics;
    const race = await Promise.all([set(!settings.enabled, settings.revision), put(bundle(['talks', 'F#1']))]);
    assert(race.every(r => [200, 409].includes(r.status)));
    await expire();
    assert.deepEqual((await (await get()).json()).conferences, await expected(), 'concurrent sync and consent keep aggregate totals consistent');
  }
  settings = (await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics;
  if (!settings.enabled) await set(true, settings.revision);
  await put(all);
  const oldIndex = (await DB.prepare("SELECT heat_index FROM sync_state WHERE user_id='a'").first()).heat_index;
  await DATA.put('manifest.json', JSON.stringify({ conferences: [{ ...entry, sha256: 'b'.repeat(64), interest: interestIndex(shuffled.data) }] }));
  await expire(); await get();
  assert.equal((await DB.prepare("SELECT heat_index FROM sync_state WHERE user_id='a'").first()).heat_index, oldIndex, 'text or ordering changes do not rebuild projections');
  const reduced = { ...entry, interest: { ...entry.interest, forums: { ...entry.interest.forums, F: ['F#1'] } } };
  await DATA.put('manifest.json', JSON.stringify({ conferences: [reduced] }));
  await expire();
  assert.deepEqual((await (await get()).json()).conferences, await expected(), 'identity changes reconcile contributions before exposing totals');
  settings = (await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics;
  await DATA.delete('manifest.json');
  assert.equal((await set(false, settings.revision)).status, 200, 'withdrawal does not depend on R2 availability');
  await DATA.put('manifest.json', JSON.stringify({ conferences: [entry] }));
  await expire(); await get();
  assert.equal((await DB.prepare('SELECT count(*) n FROM heat_scores').first()).n, 0, 'zero aggregate entries are removed');
  console.log('PASS incremental follow/import/delete deltas, concurrent consent/sync, source reindexing and withdrawal during a data outage');

  settings = (await (await mf.dispatchFetch(origin + '/api/session', { headers })).json()).statistics;
  if (!settings.enabled) await set(true, settings.revision);
  await DB.batch([
    DB.prepare("INSERT INTO users(id,github_id,login) VALUES('b','2','bob')"),
    DB.prepare("INSERT INTO sync_state(user_id) VALUES('b')"),
    DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
      .bind(createHash('sha256').update('b'.repeat(64)).digest('hex'), 'b', 9999999999),
  ]);
  const otherHeaders = { ...headers, Cookie: '__Host-fora-session=' + 'b'.repeat(64) };
  const together = await Promise.all([
    put(bundle(['talks', 'F#0'])),
    mf.dispatchFetch(origin + '/api/sync', { method: 'PUT', headers: otherHeaders,
      body: JSON.stringify({ revision: 0, bundle: bundle(['talks', 'F#0']) }) }),
  ]);
  assert(together.every(response => response.status === 200));
  await expire();
  assert.equal((await (await get()).json()).conferences.sample.talks['F#0'], heatScore(6), 'concurrent accounts cannot lose a shared score update');
  const remove = await Promise.all([put(bundle()), set(false, 0, otherHeaders)]);
  assert(remove.every(response => response.status === 200));
  await expire();
  assert.deepEqual((await (await get()).json()).conferences, await expected());
  console.log('PASS concurrent updates from distinct accounts and independent withdrawal');

  const index = await heatIndex({ DATA }), projection = contribution(index, all, true);
  for (const count of [100, 500, 1000]) {
    await DB.prepare("DELETE FROM users WHERE id != 'a'").run();
    await DB.prepare(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < ?)
      INSERT INTO users (id, github_id, login) SELECT 'load-'||x, 'load-'||x, 'load-'||x FROM n`).bind(count).run();
    await DB.prepare("INSERT INTO sync_state(user_id,bundle,heat_contribution,heat_index) SELECT id,?,?,? FROM users WHERE id!='a'")
      .bind(JSON.stringify(all), projection, index.hash).run();
    const selected = await DB.prepare('SELECT target, weight FROM heat_scores').all();
    const snapshotCost = await DB.prepare(SNAPSHOT_SQL).bind(JSON.stringify(index.catalog.map(({ id, sha256 }) => ({ id, sha256 }))), new Date().toISOString()).all();
    assert.equal(selected.results.length, 11);
    const dirty = await DB.prepare('SELECT user_id FROM sync_state WHERE heat_index < ? OR heat_index > ? LIMIT 1').bind(index.hash, index.hash).all();
    assert.equal(dirty.results.length, 0);
    assert(dirty.meta.rows_read < 10, 'checking index freshness must not scan every account');
    const guard = await DB.prepare('SELECT NOT EXISTS (SELECT 1 FROM sync_state WHERE heat_index < ?1 OR heat_index > ?1) fresh')
      .bind(index.hash).all();
    assert.equal(guard.results[0].fresh, 1);
    assert(guard.meta.rows_read < 10, 'the atomic publication guard must use the index rather than scan every account');
    await expire();
    const snapshot = await get(); assert.equal(snapshot.status, 200);
    assert.equal((await snapshot.json()).conferences.sample.talks['F#0'], heatScore(count * 3));
    const delta = await DB.prepare("UPDATE sync_state SET heat_contribution=? WHERE user_id='load-1'")
      .bind(contribution(index, bundle(['forums', 'F'], ['talks', 'F#1']), true)).run();
    const unchanged = await DB.prepare("UPDATE sync_state SET heat_contribution=heat_contribution WHERE user_id='load-1'").run();
    assert(unchanged.meta.rows_written < delta.meta.rows_written, 'unchanged projections do not rewrite totals');
    console.log('BUDGET ' + JSON.stringify({ accounts: count, aggregate_rows: snapshotCost.meta.rows_read,
      freshness_check_rows: dirty.meta.rows_read, publication_guard_rows: guard.meta.rows_read, follow_update_reads: delta.meta.rows_read, follow_update_writes: delta.meta.rows_written,
      unchanged_projection_writes: unchanged.meta.rows_written }));
  }

} finally { await mf.dispose(); }

// Interleave a real sync request with an identity publication and snapshot rebuild.
// Only the D1 call boundaries are controlled; SQL, triggers and R2 remain real.
const publication = new Miniflare({ modules: true,
  script: 'export default { fetch() { return new Response("ok"); } }',
  d1Databases: { DB: 'heat-publication-race' }, r2Buckets: ['DATA'] });
let releaseSync;
try {
  const { DB, DATA } = await publication.getBindings();
  await migrate(DB);
  const token = 'c'.repeat(64);
  await DB.batch([
    DB.prepare("INSERT INTO users(id,github_id,login) VALUES('a','1','alice')"),
    DB.prepare("INSERT INTO sync_state(user_id) VALUES('a')"),
    DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,'a',9999999999)")
      .bind(createHash('sha256').update(token).digest('hex')),
  ]);
  await DATA.put('manifest.json', JSON.stringify({ conferences: [entry] }));
  let notifyPaused, inject = false, pendingSync;
  const paused = new Promise(resolve => { notifyPaused = resolve; });
  const resume = new Promise(resolve => { releaseSync = resolve; });
  const wrappedDB = {
    prepare(sql) {
      let statement = DB.prepare(sql);
      const wrap = () => ({
        bind(...args) { statement = statement.bind(...args); return wrap(); },
        async first(...args) {
          if (sql.startsWith('UPDATE sync_state SET bundle')) { notifyPaused(); await resume; }
          const result = await statement.first(...args);
          if (inject && sql.includes('WHERE s.heat_index <') && result === null) {
            inject = false;
            releaseSync();
            assert.equal((await pendingSync).status, 200);
          }
          return result;
        },
        run: (...args) => statement.run(...args),
      });
      return wrap();
    },
  };
  const env = { DB: wrappedDB, DATA, PUBLIC_ORIGIN: origin };
  const request = (path, init) => worker.fetch(new Request(origin + path, init), env);
  pendingSync = request('/api/sync', { method: 'PUT',
    headers: { Cookie: '__Host-fora-session=' + token, Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ revision: 0, bundle: bundle(['talks', 'F#0']) }),
  });
  await paused;
  const next = { ...entry, sha256: 'b'.repeat(64), interest: { forums: { F: ['F#1'] }, keynotes: [] } };
  await DATA.put('manifest.json', JSON.stringify({ conferences: [next] }));
  assert.equal((await request('/api/heat')).status, 503, 'reconcile the initial vector against the new index');
  inject = true;
  const rejected = await request('/api/heat');
  assert.equal(rejected.status, 503, 'an old-index write after the freshness check must prevent snapshot publication');
  assert.equal(rejected.headers.get('Retry-After'), '1');
  const cache = await DB.prepare('SELECT payload, expires_at, lease_until FROM heat_cache').first();
  assert.equal(cache.expires_at, 0, 'rejected publication must not extend the cache');
  assert.equal(cache.lease_until, 0, 'rejected publication releases its lease immediately');
  const saved = await DB.prepare("SELECT revision, bundle FROM sync_state WHERE user_id='a'").first();
  assert.equal(saved.revision, 1);
  assert.deepEqual(JSON.parse(saved.bundle).follows, bundle(['talks', 'F#0']).follows, 'the accepted sync itself is preserved');
  assert.equal((await request('/api/heat')).status, 503, 'retry reconciles the late old-index vector');
  const recovered = await request('/api/heat');
  assert.equal(recovered.status, 200);
  const snapshot = await recovered.json();
  assert.deepEqual(snapshot.conferences.sample, { sha256: next.sha256, forums: {}, talks: {} });
  assert.deepEqual(await (await request('/api/heat')).json(), snapshot, 'only the corrected snapshot is cached');
  console.log('PASS publication racing an in-flight sync cannot cache old-index scores under a new dataset hash');
} finally {
  releaseSync?.();
  await publication.dispose();
}
