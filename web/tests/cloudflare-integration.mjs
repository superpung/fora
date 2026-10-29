// Run the actual application, Worker, cookie sessions and D1 together.
// Only GitHub's external authorization and identity responses are simulated.
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { Miniflare, createFetchMock } from 'miniflare';
import { chromium } from 'playwright';

const origin = 'http://localhost:4228';
const screenshots = '/tmp/fora-auth-sync-integration';
const assets = await mkdtemp(join(tmpdir(), 'fora-integration-assets-'));
// Local fixtures are intentionally excluded from production uploads, but belong in this isolated test.
await cp(new URL('../dist', import.meta.url), assets, { recursive: true, filter: path => basename(path) !== '.assetsignore' });
const fetchMock = createFetchMock();
fetchMock.disableNetConnect();
let githubUser = { id: 11, login: 'alice', name: 'Alice', avatar_url: null };
fetchMock.get('https://github.com').intercept({ path: '/login/oauth/access_token', method: 'POST' })
  .reply(200, { access_token: 'test-only-github-token' }).persist();
fetchMock.get('https://api.github.com').intercept({ path: '/user', method: 'GET' })
  .reply(() => ({ statusCode: 200, data: JSON.stringify(githubUser) })).persist();
const mf = new Miniflare({ modules: true, scriptPath: new URL('../../cloudflare/worker.mjs', import.meta.url).pathname,
  modulesRoot: new URL('../../cloudflare/', import.meta.url).pathname, port: 4228, host: '127.0.0.1',
  compatibilityDate: '2026-07-30', fetchMock, d1Databases: { DB: 'integration' }, r2Buckets: ['DATA'],
  bindings: { PUBLIC_ORIGIN: origin, GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret' },
  assets: { directory: assets, binding: 'ASSETS',
    routerConfig: { invoke_user_worker_ahead_of_assets: true, has_user_worker: true },
    assetConfig: { not_found_handling: 'single-page-application' } },
});
let browser;
try {
  await mf.ready;
  const { DB } = await mf.getBindings();
  const migration = await readFile(new URL('../../cloudflare/migrations/0001.sql', import.meta.url), 'utf8');
  for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await DB.prepare(sql).run();
  const state = async login => {
    const row = await DB.prepare('SELECT revision, bundle FROM sync_state JOIN users ON users.id = sync_state.user_id WHERE login = ?').bind(login).first();
    return row && { revision: row.revision, bundle: JSON.parse(row.bundle) };
  };
  async function until(check) {
    for (let n = 0; n < 150; n++) {
      if (await check()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error('Integration state did not converge');
  }
  const errors = [];
  browser = await chromium.launch();
  async function device(mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, locale: 'zh-CN' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route(origin + '/api/auth/login', async route => {
      const response = await route.fetch({ maxRedirects: 0 });
      assert.equal(response.status(), 302);
      const authorization = new URL(response.headers().location);
      assert.equal(authorization.origin, 'https://github.com');
      assert.equal(authorization.searchParams.get('scope'), 'read:user');
      // Preserve the Worker's actual state cookie; simulate only GitHub's redirect back.
      const state = authorization.searchParams.get('state');
      await route.fulfill({ response, headers: { ...response.headers(),
        location: origin + '/?code=test-code&state=' + state } });
    });
    await page.goto(origin + '/chinasoft2026/forum/R1', { waitUntil: 'domcontentloaded' });
    await page.locator('.followbtn').waitFor();
    return { page, context };
  }
  async function menu(page) {
    if (await page.locator('.acct-btn').getAttribute('aria-expanded') !== 'true') await page.locator('.acct-btn').click();
  }
  async function login(page) {
    await menu(page);
    await page.getByRole('button', { name: '用 GitHub 登录', exact: true }).click();
    await page.waitForURL(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.goto(origin + '/chinasoft2026/forum/R1', { waitUntil: 'domcontentloaded' });
    await page.locator('.followbtn').waitFor();
    await menu(page);
    await page.locator('.acct-name').waitFor();
  }
  const refresh = page => page.evaluate(() => window.dispatchEvent(new Event('online')));
  const saved = page => page.locator('.followbtn').evaluate(el => el.classList.contains('is-on'));
  const a = await device(), b = await device(true);
  await a.page.locator('.followbtn').click();
  await login(a.page);
  await until(async () => (await state('alice'))?.bundle.follows.includes('["chinasoft2026","forums","R1"]'));
  const cookie = (await a.context.cookies()).find(c => c.name === '__Host-fora-session');
  assert(cookie?.httpOnly && cookie.secure && cookie.sameSite === 'Lax');
  assert(!(await a.page.evaluate(() => document.cookie)).includes('__Host-fora-session'));
  await login(b.page);
  await until(() => saved(b.page));
  console.log('PASS real application login, protected cookie, D1 write and second-device follow pull');

  await b.context.setOffline(true);
  await b.page.keyboard.press('Escape');
  await b.page.locator('.followbtn').click();
  await new Promise(resolve => setTimeout(resolve, 2300));
  assert.equal(await saved(b.page), false);
  await b.context.setOffline(false); await refresh(b.page);
  await until(async () => (await state('alice')).bundle.follows.length === 0);
  await refresh(a.page); await until(async () => !await saved(a.page));
  console.log('PASS offline deletion is retained and propagated without resurrection');

  // Current speaker keys must survive backup, sync and unfollow without expanding namesakes.
  for (const device of [a, b]) {
    await device.page.goto(origin + '/chinasoft2026/speakers?q=李佳', { waitUntil: 'domcontentloaded' });
    await device.page.locator('.spcard').first().waitFor();
  }
  const speaker = (page, affiliation) => page.locator('.spcard')
    .filter({ has: page.locator('.spcard__name', { hasText: /^李佳$/ }) })
    .filter({ has: page.locator('.spcard__aff', { hasText: affiliation }) }).locator('.star');
  const speakerSaved = (page, affiliation) => speaker(page, affiliation).getAttribute('aria-pressed');
  await speaker(a.page, '清华大学').click();
  await until(async () => (await state('alice')).bundle.follows.includes('["chinasoft2026","speakers","P4:李佳"]'));
  await refresh(b.page);
  await until(async () => await speakerSaved(b.page, '清华大学') === 'true');
  assert.equal(await speakerSaved(b.page, '武汉大学'), 'false');
  await b.page.reload({ waitUntil: 'domcontentloaded' });
  await until(async () => await speakerSaved(b.page, '清华大学') === 'true');
  await menu(b.page);
  await b.page.getByRole('button', { name: '导出', exact: true }).click();
  const downloadReady = b.page.waitForEvent('download');
  await b.page.getByRole('button', { name: /备份.*\.json/ }).click();
  const backup = await readFile(await (await downloadReady).path());
  assert.deepEqual(JSON.parse(backup).follows.speakers, ['P4:李佳']);
  await speaker(b.page, '清华大学').click();
  await until(async () => (await state('alice')).bundle.follows.length === 0);
  await refresh(a.page);
  await until(async () => await speakerSaved(a.page, '清华大学') === 'false');
  await a.page.locator('input[type="file"]').setInputFiles({ name: 'follows.json', mimeType: 'application/json', buffer: backup });
  await until(async () => (await state('alice')).bundle.follows.includes('["chinasoft2026","speakers","P4:李佳"]'));
  await refresh(b.page);
  await until(async () => await speakerSaved(b.page, '清华大学') === 'true');
  assert.equal(await speakerSaved(b.page, '武汉大学'), 'false');
  await speaker(b.page, '清华大学').click();
  await until(async () => (await state('alice')).bundle.follows.length === 0);
  await refresh(a.page);
  await until(async () => await speakerSaved(a.page, '清华大学') === 'false');
  for (const device of [a, b]) {
    await device.page.goto(origin + '/chinasoft2026/forum/R1', { waitUntil: 'domcontentloaded' });
    await device.page.locator('.followbtn').waitFor();
  }
  console.log('PASS current speaker identity survives two-device sync, reload and JSON backup/import without selecting its namesake');

  // Seed competing saved preferences; notification delivery has its own clock suite.
  await b.context.setOffline(true);
  await b.page.evaluate(() => localStorage.setItem('fora-reminders.lead', '30'));
  await a.page.evaluate(() => localStorage.setItem('fora-reminders.lead', '15'));
  await a.page.reload({ waitUntil: 'domcontentloaded' });
  await until(async () => (await state('alice')).bundle.prefs['fora-reminders.lead'] === '15');
  await b.context.setOffline(false);
  await b.page.reload({ waitUntil: 'domcontentloaded' });
  await menu(a.page); await menu(b.page);
  await b.page.locator('.acct-conflict').waitFor();
  assert.equal((await state('alice')).bundle.prefs['fora-reminders.lead'], '15');
  await mkdir(screenshots, { recursive: true });
  await b.page.screenshot({ path: screenshots + '/mobile-preference-conflict.png' });
  await b.page.getByRole('button', { name: '用云端', exact: true }).click();
  await until(async () => await b.page.evaluate(() => localStorage.getItem('fora-reminders.lead')) === '15');
  await b.page.locator('.acct-conflict').waitFor({ state: 'hidden' });
  console.log('PASS actual preference conflict UI and explicit cloud resolution');

  await a.page.getByRole('button', { name: '退出登录', exact: true }).click();
  await a.page.getByRole('alertdialog').getByRole('button', { name: '退出登录', exact: true }).click();
  await menu(a.page);
  await a.page.getByRole('button', { name: '用 GitHub 登录', exact: true }).waitFor();
  assert.equal(await a.page.evaluate(async () => (await fetch('/api/sync')).status), 401);
  assert.equal(await b.page.evaluate(async () => (await fetch('/api/sync')).status), 200);
  githubUser = { id: 22, login: 'bob', name: 'Bob', avatar_url: null };
  await login(a.page);
  await a.page.locator('.acct-conflict').waitFor();
  assert.equal((await state('bob')).revision, 0, 'account switch must not upload previous account data');
  await a.page.getByRole('button', { name: '用云端', exact: true }).click();
  await a.page.locator('.acct-conflict').waitFor({ state: 'hidden' });
  assert.deepEqual((await state('bob')).bundle.follows, []);
  await a.page.locator('.acct-row').filter({ hasText: '已同步' }).waitFor();
  await a.page.screenshot({ path: screenshots + '/desktop-account-switch.png' });
  await DB.prepare('UPDATE sessions SET expires_at = 0 WHERE user_id = (SELECT id FROM users WHERE login = ?)').bind('bob').run();
  await refresh(a.page);
  await a.page.getByRole('button', { name: '用 GitHub 登录', exact: true }).waitFor();
  assert.equal(await a.page.evaluate(async () => (await fetch('/api/sync')).status), 401);
  assert.deepEqual(errors, []);
  console.log('PASS logout isolation, account switch protection and expired-session sign-out');
} finally {
  await browser?.close(); await mf.dispose(); await rm(assets, { recursive: true, force: true });
}
