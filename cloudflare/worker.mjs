// Fora owns only its bound database, buckets, assets and explicit routes.
import { publish } from './publish.mjs';
const SESSION_COOKIE = '__Host-fora-session';
const STATE_COOKIE = '__Host-fora-oauth';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const json = (value, status = 200) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
const cookieValue = (request, name) => (request.headers.get('Cookie') || '').split(';')
  .map(value => value.trim()).find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
  .map(n => n.toString(16).padStart(2, '0')).join('');

async function session(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return env.DB.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`)
    .bind(await hash(token), Math.floor(Date.now() / 1000)).first();
}
const publicUser = user => user ? { id: user.id, login: user.login, name: user.name, avatarUrl: user.avatar_url } : null;

function checkedBundle(value) {
  if (value?.app !== 'fora' || value.version !== 1 || !Array.isArray(value.follows) ||
    !value.prefs || Array.isArray(value.prefs) || typeof value.prefs !== 'object') fail(400, 'Invalid sync bundle');
  if (value.follows.length > 10000 || value.follows.some(item => {
    if (typeof item !== 'string' || item.length > 1024) return true;
    try { const triple = JSON.parse(item); return !Array.isArray(triple) || triple.length !== 3 ||
      triple.some(part => typeof part !== 'string' || part.length > 512) ||
      !/^[a-z0-9-]+$/.test(triple[0]) || !['forums', 'speakers', 'talks'].includes(triple[1]); }
    catch { return true; }
  })) fail(400, 'Invalid follows');
  const prefs = Object.entries(value.prefs);
  if (prefs.length > 32 || prefs.some(([key, val]) => key.length > 100 || typeof val !== 'string' || val.length > 1000)) {
    fail(400, 'Invalid preferences');
  }
  return { app: 'fora', version: 1, follows: [...new Set(value.follows)].sort(), prefs: Object.fromEntries(prefs) };
}

async function login(request, env) {
  if (new URL(request.url).origin !== env.PUBLIC_ORIGIN) fail(403, 'Login is only available on the public origin');
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) fail(503, 'Login is not configured');
  const state = `${Date.now()}.${random()}`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: env.PUBLIC_ORIGIN + '/',
    scope: 'read:user', state }).toString();
  return new Response(null, { status: 302, headers: { Location: url.href,
    'Set-Cookie': cookie(STATE_COOKIE, state, 600), 'Cache-Control': 'no-store' } });
}

async function callback(request, env) {
  if (new URL(request.url).origin !== env.PUBLIC_ORIGIN) fail(403, 'OAuth origin rejected');
  const url = new URL(request.url), state = url.searchParams.get('state');
  const stored = cookieValue(request, STATE_COOKIE);
  if (!state || state !== stored || !/^\d+\.[a-f0-9]{64}$/.test(state) ||
    Date.now() - Number(state.split('.')[0]) > 600000 || Number(state.split('.')[0]) > Date.now()) fail(400, 'Invalid OAuth state');
  const code = url.searchParams.get('code');
  if (!code || code.length > 512) fail(400, 'Invalid OAuth code');
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET,
      code, redirect_uri: env.PUBLIC_ORIGIN + '/' }), signal: AbortSignal.timeout(15000),
  });
  if (!tokenResponse.ok) fail(502, 'GitHub authentication failed');
  const token = await tokenResponse.json();
  if (!token.access_token) fail(401, 'GitHub authentication rejected');
  const response = await fetch('https://api.github.com/user', { headers: {
    Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Fora',
  }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) fail(502, 'GitHub identity lookup failed');
  const identity = await response.json();
  if (!Number.isSafeInteger(identity.id) || typeof identity.login !== 'string') fail(502, 'Invalid GitHub identity');
  const user = await env.DB.prepare(`INSERT INTO users (id, github_id, login, name, avatar_url) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(github_id) DO UPDATE SET login=excluded.login, name=excluded.name, avatar_url=excluded.avatar_url RETURNING *`)
    .bind(crypto.randomUUID(), String(identity.id), identity.login, identity.name ?? null, identity.avatar_url ?? null).first();
  const sessionToken = random();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO sync_state (user_id) VALUES (?)').bind(user.id),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(await hash(sessionToken), user.id, Math.floor(Date.now() / 1000) + SESSION_SECONDS),
  ]);
  const headers = new Headers({ Location: env.PUBLIC_ORIGIN + '/', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, sessionToken, SESSION_SECONDS));
  headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0));
  return new Response(null, { status: 302, headers });
}

async function api(request, env, url) {
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== env.PUBLIC_ORIGIN) {
    fail(403, 'Origin rejected');
  }
  if (url.pathname === '/api/auth/login' && request.method === 'GET') return login(request, env);
  if (url.pathname === '/api/session' && request.method === 'GET') {
    return json({ enabled: url.origin === env.PUBLIC_ORIGIN && Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      user: publicUser(await session(request, env)) });
  }
  const user = await session(request, env);
  if (!user) fail(401, 'Sign in required');
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hash(cookieValue(request, SESSION_COOKIE))).run();
    const response = json({ ok: true }); response.headers.set('Set-Cookie', cookie(SESSION_COOKIE, '', 0)); return response;
  }
  if (url.pathname === '/api/sync' && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT revision, bundle, updated_at FROM sync_state WHERE user_id = ?').bind(user.id).first();
    return json({ revision: row.revision, bundle: JSON.parse(row.bundle), updated_at: row.updated_at });
  }
  if (url.pathname === '/api/sync' && request.method === 'PUT') {
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'JSON required');
    if (Number(request.headers.get('Content-Length') || 0) > 262144) fail(413, 'Sync bundle too large');
    const reader = request.body?.getReader();
    const chunks = []; let length = 0;
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 262144) { await reader.cancel(); fail(413, 'Sync bundle too large'); }
        chunks.push(value);
      }
    }
    const raw = await new Blob(chunks).text();
    let body; try { body = JSON.parse(raw); } catch { fail(400, 'Invalid JSON'); }
    if (!Number.isSafeInteger(body?.revision) || body.revision < 0) fail(400, 'Invalid revision');
    const bundle = checkedBundle(body.bundle), updated = new Date().toISOString();
    const row = await env.DB.prepare(`UPDATE sync_state SET bundle = ?, revision = revision + 1, updated_at = ?
      WHERE user_id = ? AND revision = ? RETURNING revision`).bind(JSON.stringify(bundle), updated, user.id, body.revision).first();
    if (!row) fail(409, 'Sync revision changed');
    return json({ revision: row.revision, bundle, updated_at: updated });
  }
  fail(404, 'Unknown API endpoint');
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/publish/')) return await publish(request, env, url);
      if (url.pathname.startsWith('/api/')) return await api(request, env, url);
      if (url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('state'))) return await callback(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      if (!error.status) console.error('Request failed', error.name, error.message);
      return json({ error: error.status ? error.message : 'Service unavailable' }, error.status ?? 503);
    }
  },
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)).run();
    if (!env.MAINTENANCE_TOKEN) throw Error('Maintenance dispatch token is not configured');
    const response = await fetch('https://api.github.com/repos/superpung/fora/actions/workflows/data-maintenance.yml/dispatches', {
      method: 'POST', headers: { Authorization: `Bearer ${env.MAINTENANCE_TOKEN}`, 'User-Agent': 'Fora',
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (!response.ok) throw Error(`Maintenance dispatch failed: ${response.status}`);
  },
};
