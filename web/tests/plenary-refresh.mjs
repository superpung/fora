// Audit real plenary source records through shared rows, follows, clocks and exports.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4237';
const out = process.env.PLENARY_AUDIT_DIR || '/tmp/fora-plenary-refresh';
const data = JSON.parse(await readFile(new URL('../../data/chinasoft2026.json', import.meta.url)));
const server = process.env.AUDIT_BASE_URL ? null : spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4237', '--strictPort'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
try {
  await mkdir(out, { recursive: true });
  if (server) for (let n = 0; ; n++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    assert(n < 100); await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch();
  for (const [width, colorScheme] of [[1280, 'light'], [390, 'light'], [1280, 'dark'], [390, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'zh-CN', colorScheme });
    if (process.env.AUDIT_DATA_REVISION) await context.addInitScript(value => sessionStorage.setItem('fora.data-preview', value), process.env.AUDIT_DATA_REVISION);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (server) await page.route('**/api/session', r => r.fulfill({ json: { enabled: false, user: null } }));
    let controlledClock = false;
    const shot = async name => {
      if (controlledClock) await page.clock.runFor(1200);
      await page.waitForTimeout(700);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${out}/${width}-${colorScheme}-${name}.png` });
    };
    await page.goto(base + '/chinasoft2026/schedule?v=all#2026-11-07');
    const panel = page.locator('.talkrow').filter({ has: page.locator('.talkrow__title', { hasText: '院士高峰论坛' }) });
    await panel.waitFor(); await panel.scrollIntoViewIfNeeded();
    for (const name of ['孙家广', '林惠民', '梅宏', '吕建', '王怀民', '王成山']) assert((await panel.innerText()).includes(name));
    assert((await panel.innerText()).includes('三层大会议厅'));
    assert.equal(await panel.locator('.talkrow__fact svg').count(), 2);
    await shot('panel');
    await panel.getByRole('button', { name: '收藏该报告', exact: true }).click();
    assert((await page.evaluate(() => JSON.parse(localStorage.getItem('chinasoft2026:followed.talks')))).includes('KEYNOTE:2026-11-07#2'));
    await page.goto(base + '/chinasoft2026/schedule?v=mine-day#2026-11-07');
    await page.locator('.talkrow--agenda').waitFor();
    assert.equal(await page.locator('.talkrow--agenda').count(), 1);
    assert((await page.locator('.talkrow--agenda').innerText()).includes('王成山'));
    await shot('myday');
    await page.goto(base + '/chinasoft2026/schedule?v=all#2026-11-08');
    const nasac = page.locator('.block').filter({ has: page.getByRole('heading', { name: 'NASAC青年软件创新论坛', exact: true }) });
    await nasac.waitFor(); assert.equal(await nasac.locator('.talkrow').count(), 6);
    await nasac.scrollIntoViewIfNeeded(); await shot('nasac');
    await page.goto(base + '/chinasoft2026/speakers?q=Carlo');
    await page.waitForFunction(() => document.querySelectorAll('.spcard').length === 1);
    assert.equal(await page.locator('.spcard__name').innerText(), 'Carlo Ghezzi');
    await page.locator('.spcard img').evaluate(img => img.decode());
    await page.locator('.spcard__main').click();
    assert((await page.locator('.sptalk').innerText()).includes('13:30'));
    await shot('speaker');
    await page.goto(base + '/chinasoft2026/forum/C5');
    await page.getByRole('heading', { name: '论坛组织', exact: true }).waitFor();
    assert.equal(await page.locator('.fd__people .person').count(), 16);
    await page.getByRole('heading', { name: '论坛组织', exact: true }).scrollIntoViewIfNeeded(); await shot('organizers');
    await page.clock.install({ time: new Date('2026-11-08T14:02:00+08:00') });
    controlledClock = true;
    await page.goto(base + '/chinasoft2026/now');
    const live = page.locator('.nowcard__talk').filter({ hasText: '苏亭' });
    await live.waitFor(); await live.scrollIntoViewIfNeeded(); await shot('live');
    await page.goto(base + '/ccfchip2026/schedule?v=all#2026-07-18');
    await page.locator('.talkrow--agenda').first().waitFor();
    await page.locator('.talkrow--agenda').first().scrollIntoViewIfNeeded(); await shot('existing-keynotes');
    if (server && width === 1280 && colorScheme === 'light') {
      const result = await page.evaluate(async raw => {
        const [{ buildConferenceViews }, { collectFollowedItems, toICS }, { buildLiveView }, { clockAt }] = await Promise.all([
          import('/src/lib/data.ts'), import('/src/lib/export.ts'), import('/src/lib/live.ts'), import('/src/lib/conference-time.ts')]);
        const views = buildConferenceViews(raw);
        const items = collectFollowedItems({ forums: new Set(), speakers: new Set(), talks: new Set(views.keynoteEntries.map(e => e.id)) }, views);
        const now = buildLiveView(views, clockAt(Date.parse('2026-11-08T14:02:00+08:00'), 'Asia/Shanghai'));
        return { ids: items.map(i => i.followId), ics: toICS(items, '2026-11-02T00:00:00Z', views), now: now.nowRooms };
      }, data);
      assert.equal(new Set(result.ids).size, 10);
      assert.equal((result.ics.match(/BEGIN:VEVENT/g) || []).length, 10);
      assert(result.ics.includes('20261108T060000Z'));
      assert(JSON.stringify(result.now).includes('苏亭'));
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width} ${colorScheme}: panel roster, NASAC rows, stable follows, My Day, portrait and organizer roles`);
  }
} finally { await browser?.close(); server?.kill('SIGTERM'); }
