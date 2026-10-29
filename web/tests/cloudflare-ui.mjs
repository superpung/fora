// Exercise the real providers in browser contexts representing separate devices.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4226';
const server = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4226', '--strictPort'],
  { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
const empty = () => ({ app: 'fora', version: 1, follows: [], prefs: {} });
let remote = { revision: 0, bundle: empty(), updated_at: '' }, writes = 0, race = false, offline = false;
const entry = id => JSON.stringify(['chinasoft2026', 'talks', id]);
const harness = `<!doctype html><div id="root"></div><script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
window.__vite_plugin_react_preamble_installed__=true;
const {SyncProvider}=await import('/src/lib/sync-provider.tsx');
const {useSync}=await import('/src/lib/sync-store.ts');
function Probe(){window.sync=useSync();return React.createElement('span',null,window.sync.status)}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(SyncProvider,null,React.createElement(Probe)));
</script>`;
try {
  for (let n = 0; ; n++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Await Vite readiness. */ }
    if (n > 100) throw Error('Vite did not start');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch();
  // Warm the actual application to let Vite optimize React dependencies.
  const warm = await browser.newPage(); await warm.goto(base, { waitUntil: 'networkidle' }); await warm.close();
  async function device() {
    const context = await browser.newContext(); const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => console.error('Browser error:', error.message));
    await page.route('**/sync-test', route => route.fulfill({ contentType: 'text/html', body: harness }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (offline) return route.abort('internetdisconnected');
      if (path === '/api/session') return route.fulfill({ json: { enabled: true, user: { id: 'alice', login: 'alice' } } });
      if (route.request().method() === 'PUT') {
        const value = route.request().postDataJSON();
        if (race) { race = false; remote.revision++; remote.bundle.follows.push(entry('R1#99')); }
        if (value.revision !== remote.revision) return route.fulfill({ status: 409, json: { error: 'Conflict' } });
        remote = { revision: remote.revision + 1, bundle: value.bundle, updated_at: new Date().toISOString() }; writes++;
      }
      return route.fulfill({ json: structuredClone(remote) });
    });
    await page.goto(base + '/sync-test');
    await page.waitForFunction(() => window.sync?.status === 'synced');
    return { page, context };
  }
  async function change(page, ids) {
    await page.evaluate(ids => {
      localStorage.setItem('chinasoft2026:followed.talks', JSON.stringify(ids)); window.sync.markLocalChange();
    }, ids);
  }
  async function sync(page) { await page.evaluate(() => window.sync.syncNow()); }
  const a = await device(), b = await device();
  await change(a.page, ['R1#0']); await sync(a.page); await sync(b.page);
  assert.deepEqual(await b.page.evaluate(() => JSON.parse(localStorage.getItem('chinasoft2026:followed.talks'))), ['R1#0']);
  await change(b.page, []); await sync(b.page); await sync(a.page);
  assert.deepEqual(remote.bundle.follows, [], 'a remote deletion must not be resurrected');
  race = true; await change(a.page, ['R1#1']); await sync(a.page);
  assert.deepEqual(remote.bundle.follows.sort(), [entry('R1#1'), entry('R1#99')].sort(), 'CAS retry preserves the competing edit');
  offline = true; await change(a.page, ['R1#2']); await sync(a.page);
  assert.equal(await a.page.evaluate(() => window.sync.status), 'error');
  offline = false; await sync(a.page);
  assert.deepEqual(remote.bundle.follows, [entry('R1#2')]);
  await sync(b.page);
  const before = writes; await sync(a.page); await sync(b.page);
  assert.equal(writes, before, 'unchanged polling does not write');
  await b.page.evaluate(() => localStorage.setItem('fora.sync-owner', 'bob'));
  await sync(b.page);
  assert.equal(await b.page.evaluate(() => window.sync.status), 'conflict');
  assert.equal(writes, before, 'another account requires an explicit choice');
  await a.context.close(); await b.context.close();
  console.log('PASS two-device sync, deletion, CAS retry, offline edits, unchanged polling and account isolation');

  const context = await browser.newContext(); const page = await context.newPage();
  await page.goto(base + '/chinasoft2026/schedule', { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor();
  await page.route('**/data/manifest.json', route => route.abort('internetdisconnected'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor();
  await page.unroute('**/data/manifest.json');
  await page.route('**/data/manifest.json', route => route.fulfill({ json: { schema_version: 999, conferences: [] } }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.match(await page.locator('[role=alert]').innerText(), /数据加载失败/);
  await context.close();
  const broken = await browser.newContext(); const corrupt = await broken.newPage();
  await corrupt.route('**/data/conferences/**', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await corrupt.goto(base + '/chinasoft2026/schedule', { waitUntil: 'domcontentloaded' });
  assert.match(await corrupt.locator('[role=alert]').innerText(), /数据加载失败/);
  await broken.close();
  console.log('PASS offline data cache, rejected incompatible catalog and rejected corrupt dataset');
} finally { await browser?.close(); server.kill('SIGTERM'); }
