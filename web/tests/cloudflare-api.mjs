// Exercise the actual Worker and SQLite bindings without touching an account.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Miniflare, createFetchMock } from 'miniflare';

const origin = 'https://fora.test';
const fetchMock = createFetchMock();
fetchMock.disableNetConnect();
fetchMock.get('https://github.com').intercept({ path: '/login/oauth/access_token', method: 'POST' })
  .reply(200, { access_token: 'github-token-never-stored' });
fetchMock.get('https://api.github.com').intercept({ path: '/user', method: 'GET' })
  .reply(200, { id: 3, login: 'carol', name: 'Carol', avatar_url: 'https://avatars.test/carol' });
const mf = new Miniflare({ modules: true, scriptPath: new URL('../../cloudflare/worker.mjs', import.meta.url).pathname,
  modulesRoot: new URL('../../cloudflare/', import.meta.url).pathname,
  fetchMock,
  compatibilityDate: '2026-07-30', d1Databases: { DB: 'fora-test' },
  r2Buckets: ['DATA'],
  bindings: { PUBLIC_ORIGIN: origin, PUBLISH_TOKEN: 'test-publisher', GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret' } });
try {
  const { DB } = await mf.getBindings();
  const migration = await readFile(new URL('../../cloudflare/migrations/0001.sql', import.meta.url), 'utf8');
  for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await DB.prepare(sql).run();
  const token = 'a'.repeat(64), digest = createHash('sha256').update(token).digest('hex');
  await DB.batch([
    DB.prepare('INSERT INTO users (id, github_id, login) VALUES (?, ?, ?)').bind('alice', '1', 'alice'),
    DB.prepare('INSERT INTO users (id, github_id, login) VALUES (?, ?, ?)').bind('bob', '2', 'bob'),
    DB.prepare('INSERT INTO sync_state (user_id) VALUES (?)').bind('alice'),
    DB.prepare('INSERT INTO sync_state (user_id) VALUES (?)').bind('bob'),
    DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(digest, 'alice', Math.floor(Date.now() / 1000) + 3600),
  ]);
  await DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind('expired', 'alice', 0).run();
  const auth = { Cookie: `__Host-fora-session=${token}`, Origin: origin, 'Content-Type': 'application/json' };
  const get = path => mf.dispatchFetch(origin + path, { headers: auth, redirect: 'manual' });
  const put = (revision, follows, headers = auth) => mf.dispatchFetch(origin + '/api/sync', { method: 'PUT', headers,
    body: JSON.stringify({ revision, bundle: { app: 'fora', version: 1, follows, prefs: {} } }) });
  assert.equal((await mf.dispatchFetch(origin + '/api/sync')).status, 401);
  const session = await (await get('/api/session')).json();
  assert.equal(session.user.id, 'alice');
  assert.equal(session.enabled, true);
  const login = await get('/api/auth/login');
  const location = new URL(login.headers.get('Location'));
  assert.equal(location.searchParams.get('scope'), 'read:user');
  assert.equal(location.searchParams.get('redirect_uri'), origin + '/');
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
  const state = location.searchParams.get('state');
  const callback = await mf.dispatchFetch(origin + '/?code=valid&state=' + state, {
    redirect: 'manual', headers: { Cookie: login.headers.get('Set-Cookie').split(';')[0] },
  });
  assert.equal(callback.status, 302);
  assert.equal(await DB.prepare("SELECT token_hash FROM sessions WHERE token_hash = 'expired'").first(), null);
  assert(await DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ?').bind(digest).first());
  const cookies = callback.headers.getSetCookie();
  const sessionCookie = cookies.find(value => value.startsWith('__Host-fora-session=')).split(';')[0];
  assert(cookies.some(value => value.includes('__Host-fora-oauth=') && value.includes('Max-Age=0')));
  const carol = await (await mf.dispatchFetch(origin + '/api/session', { headers: { Cookie: sessionCookie } })).json();
  assert.equal(carol.user.login, 'carol');
  const sessions = await DB.prepare('SELECT token_hash FROM sessions WHERE user_id = ?').bind(carol.user.id).all();
  assert.equal(sessions.results[0].token_hash, createHash('sha256').update(sessionCookie.split('=')[1]).digest('hex'));
  assert.equal((await mf.dispatchFetch('https://preview.test/api/auth/login', { redirect: 'manual' })).status, 403);
  assert.equal((await (await mf.dispatchFetch('https://preview.test/api/session')).json()).enabled, false);
  const expired = `${Date.now() - 700000}.${'b'.repeat(64)}`;
  assert.equal((await mf.dispatchFetch(origin + '/?code=x&state=' + expired, {
    headers: { Cookie: '__Host-fora-oauth=' + expired }, redirect: 'manual',
  })).status, 400);
  assert.equal((await get('/?code=x&state=forged')).status, 400);
  assert.equal((await put(0, [], { ...auth, Origin: 'https://evil.test' })).status, 403);
  assert.equal((await put(0, ['not-json'])).status, 400);
  assert.equal((await mf.dispatchFetch(origin + '/api/sync', { method: 'PUT', headers: auth, body: 'null' })).status, 400);
  const a = JSON.stringify(['conf2026', 'talks', 'R1#0']);
  const b = JSON.stringify(['conf2026', 'talks', 'R1#1']);
  const first = await put(0, [a]);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).revision, 1);
  assert.equal((await put(0, [b])).status, 409);
  const concurrent = await Promise.all([put(1, [a,b]), put(1, [])]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200,409]);
  assert.equal((await (await get('/api/sync')).json()).revision, 2);
  const other = await DB.prepare('SELECT revision, bundle FROM sync_state WHERE user_id = ?').bind('bob').first();
  assert.equal(other.revision, 0);
  assert.deepEqual(JSON.parse(other.bundle).follows, []);
  assert.equal((await put(2, Array(2000).fill('x'.repeat(1024)))).status, 413);
  const oversized = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(' '.repeat(262145))); controller.close();
  } });
  assert.equal((await mf.dispatchFetch(origin + '/api/sync', {
    method: 'PUT', headers: auth, body: oversized, duplex: 'half',
  })).status, 413);
  const logout = await mf.dispatchFetch(origin + '/api/auth/logout', { method: 'POST', headers: auth });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await get('/api/sync')).status, 401);
  assert.equal((await mf.dispatchFetch(origin + '/api/publish/catalog')).status, 401);
  const publisher = { Authorization: 'Bearer test-publisher', 'Content-Type': 'application/json' };
  const upload = async (kind, key, body) => {
    const sha256 = createHash('sha256').update(body).digest('hex');
    const response = await mf.dispatchFetch(`${origin}/api/publish/${kind}/${key}`, { method: 'PUT', body,
      headers: { ...publisher, 'X-Content-SHA256': sha256, 'Content-Length': String(Buffer.byteLength(body)) } });
    assert.equal(response.status, 200, await response.text());
    return sha256;
  };
  const dataset = JSON.stringify({ id: 'demo' });
  const datasetHash = createHash('sha256').update(dataset).digest('hex');
  await upload('objects', `conferences/demo/${datasetHash}.json`, dataset);
  const manifest = JSON.stringify({ schema_version: 1, conferences: [
    { id: 'demo', sha256: datasetHash, path: `conferences/demo/${datasetHash}.json` },
  ] });
  const manifestHash = createHash('sha256').update(manifest).digest('hex');
  await upload('objects', `releases/${manifestHash}.json`, manifest);
  const promote = expected_etag => mf.dispatchFetch(origin + '/api/publish/promote', {
    method: 'POST', headers: publisher, body: JSON.stringify({ manifest_hash: manifestHash, expected_etag }),
  });
  assert.equal((await promote(null)).status, 200);
  assert.equal((await promote(null)).status, 409);
  const catalog = await (await mf.dispatchFetch(origin + '/api/publish/catalog', { headers: publisher })).json();
  assert.equal(catalog.catalog.conferences[0].sha256, datasetHash);
  assert.equal((await mf.dispatchFetch(origin + '/api/publish/checks', { headers: publisher })).status, 404);
  assert.equal((await mf.dispatchFetch(origin + '/api/publish/archives/old', { headers: publisher })).status, 404);
  console.log('PASS Worker authentication, origin checks, validation, isolation, atomic concurrent writes and logout');
  console.log('PASS Publisher authorization, immutable checksummed objects and atomic catalog promotion');
} finally { await mf.dispose(); }
