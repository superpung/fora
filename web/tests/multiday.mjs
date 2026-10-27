// Verify canonical report links across a forum's separate calendar dates.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4219';
const output = process.env.MULTIDAY_AUDIT_DIR || '/tmp/chinasoft2026-multiday';
await mkdir(output, { recursive: true });
const server = process.env.AUDIT_BASE_URL ? null : spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4219', '--strictPort'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
try {
  if (server) for (let i = 0; ; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for Vite. */ }
    if (i >= 100) throw Error('Vite did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const errors = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ locale: 'zh-CN', timezoneId: 'America/Los_Angeles',
      viewport: { width: mobile ? 390 : 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('chinasoft2026:followed.talks', JSON.stringify(['R2#10'])));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-07T15:30:00+08:00'));
    const go = async (path, selector) => {
      await page.goto(base + '/chinasoft2026' + path, { waitUntil: 'domcontentloaded' });
      await page.locator(selector).first().waitFor();
    };
    const shot = async (name, target) => {
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      // Fixed browser clocks and native animation clocks advance separately.
      await page.evaluate(() => document.getAnimations().forEach(animation => {
        if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish();
      }));
      await page.waitForTimeout(100);
      assert(await target.evaluate(element => {
        for (let node = element; node; node = node.parentElement) {
          if (Number(getComputedStyle(node).opacity) < 0.99) return false;
        }
        return true;
      }), name + ': target must be painted');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ': overflow');
      await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-${name}.png` });
    };
    await go('/forum/R2#talk-11', '#talk-11');
    assert.equal(await page.locator('[data-date="2026-11-06"] [id^="talk-"]').count(), 10);
    assert.equal(await page.locator('[data-date="2026-11-07"] [id^="talk-"]').count(), 6);
    assert((await page.locator('#talk-11').getAttribute('class')).includes('now'));
    assert(!(await page.locator('#talk-9').getAttribute('class')).includes('now'));
    await shot('R2-second-day', page.locator('#talk-11'));
    await go('', '.frow');
    await page.locator('.daypill').first().click();
    await page.waitForFunction(() => document.querySelectorAll('.frow a[href="/chinasoft2026/forum/R2"]').length === 2);
    const rows = page.locator('.frow').filter({ has: page.locator('a[href="/chinasoft2026/forum/R2"]') });
    assert.equal(await rows.count(), 2);
    // Following one second-day report must not surface a first-day copy.
    const mine = page.locator('button').filter({ hasText: '我的关注' });
    await mine.click();
    await page.locator('a.ftalk__link[href="/chinasoft2026/forum/R2#talk-11"]').waitFor();
    assert.equal(await page.locator('.frow').count(), 1);
    assert.equal(await page.locator('a.ftalk__link[href="/chinasoft2026/forum/R2#talk-1"]').count(), 0);
    await shot('home-followed', page.locator('a.ftalk__link[href="/chinasoft2026/forum/R2#talk-11"]'));
    await go('/schedule?v=all', '.daytab');
    for (const [tab, count, first, absent] of [[1, 10, 1, 11], [2, 6, 11, 1]]) {
      await page.locator('.daytab').nth(tab).click();
      const column = page.locator('.tgrid__col').filter({ has: page.locator('.tgrid__chead[href="/chinasoft2026/forum/R2"]') });
      await page.waitForFunction(count => {
        const column = [...document.querySelectorAll('.tgrid__col')].find(el => el.querySelector('.tgrid__chead[href="/chinasoft2026/forum/R2"]'));
        return column?.querySelectorAll('.tgrid__talk').length === count;
      }, count);
      assert.equal(await column.locator('.tgrid__talk').count(), count);
      if (mobile) {
        const card = column.locator('.tgrid__talk[role="button"]').first();
        await card.click();
        assert.equal(await card.locator('.tgrid__tenter').getAttribute('href'), `/chinasoft2026/forum/R2#talk-${first}`);
        await card.scrollIntoViewIfNeeded();
      } else {
        assert.equal(await page.locator(`.tgrid__talk[href="/chinasoft2026/forum/R2#talk-${absent}"]`).count(), 0);
        await column.locator('.tgrid__talk').first().scrollIntoViewIfNeeded();
      }
      await shot(`schedule-day-${tab}`, column.locator('.tgrid__talk').first());
    }
    await go('/now', '.nowcard');
    const card = page.locator('.nowcard').filter({ hasText: '软件工程智能体创新论坛' });
    assert((await card.innerText()).includes('iCode的设计理念'));
    assert(!(await card.innerText()).includes('真实世界中的 Agentic Skills'));
    await card.scrollIntoViewIfNeeded(); await shot('now-second-day', card);
    await go('/schedule?v=mine-day', '.daytab');
    await page.locator('.daytab').nth(2).click();
    await page.locator('.talkrow a[href="/chinasoft2026/forum/R2#talk-11"]').waitFor();
    await shot('followed-second-day', page.locator('.talkrow a[href="/chinasoft2026/forum/R2#talk-11"]'));
    await context.close();
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'}: multi-day detail, stable anchors/follows, daily timelines and live report`);
  }
  assert.deepEqual(errors, []);
} finally { await browser?.close(); server?.kill(); }
