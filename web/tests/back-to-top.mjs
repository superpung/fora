// Exercise shared back-to-top behavior on real routes and their existing controls.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4232';
const out = process.env.BACK_TO_TOP_AUDIT_DIR || '/tmp/fora-shared-backtotop';
const server = process.env.AUDIT_BASE_URL ? null : spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4232', '--strictPort'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
try {
  await mkdir(out, { recursive: true });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch();
  for (const [name, width, height, colorScheme] of [
    ['desktop', 1280, 900, 'light'], ['mobile', 390, 844, 'light'],
    ['desktop-dark', 1280, 900, 'dark'], ['mobile-dark', 320, 568, 'dark'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme, locale: 'zh-CN' });
    await context.addInitScript(() => {
      localStorage.setItem('fora-ai.enabled', '1');
      localStorage.setItem('chinasoft2026:followed.forums', JSON.stringify(['R1', 'R2', 'R3']));
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (server) await page.route('**/api/session', r => r.fulfill({ json: { enabled: true, user: null, statistics: null } }));
    const back = page.getByRole('button', { name: '回到顶部', exact: true });
    const settle = async () => {
      await page.waitForTimeout(300);
      await page.evaluate(() => document.getAnimations().forEach(a => { if (Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish(); }));
    };
    const check = async (label, blockers = '') => {
      await settle();
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await back.waitFor({ state: 'detached' });
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      if (max <= 600 && ['organizations', 'now'].includes(label)) {
        await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await settle();
        assert.equal(await back.count(), 0, label + ' stays unobtrusive on short content');
        await page.screenshot({ path: `${out}/${name}-${label}.png` }); return;
      }
      assert(max > 600, label + ' exercises a real long page');
      await page.evaluate(max => scrollTo({ top: Math.max(650, max / 2), behavior: 'instant' }), max);
      await back.waitFor(); await settle();
      assert.equal(await back.count(), 1);
      assert(await back.evaluate(el => { const r = el.getBoundingClientRect(); return r.width === 44 && r.height === 44 && r.right <= innerWidth && r.bottom <= innerHeight; }));
      if (blockers) assert(await page.locator(blockers).evaluateAll(els => {
        const b = document.querySelector('.backtotop').getBoundingClientRect();
        return els.every(el => { const r = el.getBoundingClientRect(); return r.right + 8 <= b.left || r.left >= b.right + 8 || r.bottom + 8 <= b.top || r.top >= b.bottom + 8; });
      }), label + ' leaves existing actions/index accessible');
      await page.screenshot({ path: `${out}/${name}-${label}.png` });
      await back.click(); await page.waitForFunction(() => scrollY === 0); await back.waitFor({ state: 'detached' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    };
    for (const [label, path, ready, blockers] of [
      ['home', '/chinasoft2026', '.frow', ''],
      ['forum', '/chinasoft2026/forum/R2', '.fd__title', ''],
      ['speakers', '/chinasoft2026/speakers', '.spcard', '.spindex__l'],
      ['committee', '/chinasoft2026/committee', '.member', ''],
      ['organizations', '/ccfchip2026/organizations', '.sponsorcard', ''],
    ]) { await page.goto(base + path); await page.locator(ready).first().waitFor(); await check(label, blockers); }
    await page.goto(base + '/chinasoft2026/plan'); await page.locator('.planform__input').fill('软件安全');
    await page.locator('.planform__go').click(); await page.locator('.planpick').first().waitFor();
    await page.locator('.planbar button').first().click(); await page.locator('.planbar__done').first().waitFor();
    await check('planner', '.planbar > *');
    await page.goto(base + '/chinasoft2026/topics'); await page.locator('.tmap__node').first().click(); await page.locator('.tmaptalk').first().waitFor(); await check('topics');
    await page.goto(base + '/chinasoft2026/schedule?v=mine-day#2026-11-06'); await page.locator('.talkrow--agenda').first().waitFor(); await check('myday');
    await page.getByRole('tab', { name: '看板', exact: true }).click(); await settle();
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await settle();
    assert.equal(await back.count(), 0, 'switching My Day to the board removes its control');
    await page.getByRole('tab', { name: '一天', exact: true }).click(); await page.locator('.talkrow--agenda').first().waitFor();
    await page.evaluate(() => scrollTo({ top: 700, behavior: 'instant' })); await back.waitFor();
    for (const path of ['/chinasoft2026/schedule?v=all', '/chinasoft2026/schedule/?v=mine-board', '/']) {
      await page.goto(base + path); await page.locator(path === '/' ? '.hubcard' : '.daytabs').first().waitFor();
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await settle();
      assert.equal(await back.count(), 0, path + ' excludes back-to-top');
    }
    await page.goto(base + '/chinasoft2026/speakers?q=' + encodeURIComponent('魏峻'));
    await page.waitForFunction(() => document.querySelectorAll('.spcard').length === 1);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await settle();
    assert.equal(await back.count(), 0, 'short filtered list hides back-to-top');
    await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+08:00'));
    await page.goto(base + '/chinasoft2026/now'); await page.locator('.nowcard').first().waitFor(); await check('now');
    assert.deepEqual(errors, []); await context.close();
    console.log(`PASS ${name}: all shared long routes, short content, timeline exclusion, progress control and existing actions`);
  }
} finally { await browser?.close(); server?.kill(); }
