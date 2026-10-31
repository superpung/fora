// Exercise the dedicated heat page, its opt-out, automatic updates and shared rows.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4230';
const server = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4230', '--strictPort'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
const catalog = JSON.parse(await readFile(new URL('../public/data/manifest.json', import.meta.url)));
const conference = catalog.conferences.find(c => c.id === 'chinasoft2026');
const source = JSON.parse(await readFile(new URL('../public/data/' + conference.path, import.meta.url)));
const largeScores = Object.fromEntries(source.forums.flatMap(f => f.talks ?? []).map(t => [t.id, 200]));
const session = route => route.fulfill({ json: { enabled: true, user: null, statistics: null } });
const until = async test => { for (let i = 0; i < 100; i++) { if (await test()) return; await new Promise(r => setTimeout(r, 50)); } throw Error('Condition did not settle'); };
let browser;
try {
  await until(async () => { try { return (await fetch(base)).ok; } catch { return false; } });
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 390, height: 844 } });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  let mode = 'ready', requests = 0;
  await page.route('**/api/session', session);
  await page.route('**/api/heat', route => {
    requests++;
    if (mode === 'unavailable') return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    return route.fulfill({ headers: { 'Cache-Control': 'public, max-age=300' }, json: {
      generated_at: new Date().toISOString(), conferences: { chinasoft2026: {
        sha256: mode === 'mismatch' ? 'f'.repeat(64) : conference.sha256,
        forums: mode === 'empty' ? {} : { R1: mode === 'invalid' ? '200 people' : 200, R2: 450, R3: 100 },
        talks: mode === 'empty' ? {} : mode === 'large' ? largeScores : { 'R1#1': 200 },
      } },
    } });
  });
  await page.goto(base + '/chinasoft2026/popular');
  await page.locator('.frow').nth(2).waitFor();
  assert.deepEqual(await page.locator('.frow__code').allTextContents(), ['R2', 'R1', 'R3']);
  assert.equal(await page.getByRole('button', { name: /刷新热度|热度算法|Scoring/ }).count(), 0);
  assert(!(await page.locator('main').innerText()).includes('加权'));
  assert(!(await page.locator('.ftable').innerText()).includes('·'));
  await page.getByRole('progressbar', { name: '下次更新' }).waitFor();
  assert((await page.locator('.heat-freshness').innerText()).includes('更新'));
  const ring = page.locator('.heat-countdown circle').last();
  const ringLength = async () => parseFloat(await ring.getAttribute('stroke-dasharray'));
  const firstLength = await ringLength(), firstCountdown = await page.locator('.heat-countdown__time').textContent();
  await page.waitForTimeout(1100); const secondLength = await ringLength();
  await page.waitForTimeout(1100); const thirdLength = await ringLength();
  assert(firstLength > secondLength && secondLength > thirdLength, 'the real five-minute arc moves continuously between clock renders');
  assert.notEqual(await page.locator('.heat-countdown__time').textContent(), firstCountdown, 'remaining time advances every second');
  assert(await page.locator('.heat-freshness').evaluate(el => el.getBoundingClientRect().left === el.parentElement.querySelector('h2').getBoundingClientRect().left), 'freshness belongs below the heading');
  const compactMetric = row => row.evaluate(el => {
    const score = el.querySelector('.heat-value'), star = el.querySelector('.star');
    const text = document.createRange(); text.selectNodeContents(score);
    const gap = text.getBoundingClientRect().left - star.getBoundingClientRect().right;
    return gap >= 0 && gap <= 10;
  });
  assert(await compactMetric(page.locator('.frow').first()), 'forum score text stays next to its star');
  const colors = await page.locator('.heat-value').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).color));
  assert.notEqual(colors[0], colors[2], 'heat strength has a visible color distinction');
  const rightEdge = locator => locator.evaluate(el => el.getBoundingClientRect().right);
  const forumEdge = await rightEdge(page.locator('.heat-value').first());
  const before = requests;
  await page.locator('.frow__body').nth(1).click();
  await page.locator('.followbtn').waitFor();
  assert.equal(await page.locator('.heat-value').count(), 0, 'forum details do not show heat');
  assert.equal(requests, before, 'forum details do not request heat');
  await page.goBack(); await page.locator('.frow').first().waitFor();
  assert.equal(requests, before, 'returning to heat reuses its valid snapshot');
  for (const state of ['mismatch', 'invalid', 'unavailable', 'empty', 'ready']) {
    mode = state; await page.reload();
    if (state === 'ready') await page.locator('.frow').nth(2).waitFor();
    else await page.getByText(state === 'empty' ? '暂无热度数据' : '热度暂不可用', { exact: true }).waitFor();
  }
  await page.getByRole('tab', { name: '报告', exact: true }).click();
  await page.locator('.talkrow--discovery').waitFor();
  assert(await compactMetric(page.locator('.talkrow--discovery')), 'report score text has no reserved empty column');
  assert.equal(await page.locator('.talkrow__speaker svg').count(), 3);
  assert(Math.abs(await rightEdge(page.locator('.heat-value')) - forumEdge) < 1, 'forum and report scores share the right edge');
  assert(await page.locator('.row-actions').evaluate(el => el.querySelector('.heat-value').getBoundingClientRect().left >= el.querySelector('.star').getBoundingClientRect().right));
  assert(await page.locator('.row-actions').evaluate(el => {
    const score = el.querySelector('.heat-value').getBoundingClientRect(), star = el.querySelector('.star').getBoundingClientRect();
    return Math.abs((score.top + score.bottom) / 2 - (star.top + star.bottom) / 2) < 1;
  }), 'the follow action and score share a vertical center');
  assert.equal(await page.locator('.talkrow__session .code-tag').textContent(), 'R1');
  assert((await page.locator('.talkrow__session').innerText()).startsWith('R1'));
  assert(!(await page.locator('.talkrow--discovery').innerText()).includes('·'));
  const facts = row => row.evaluate(el => ({ title: el.querySelector('.talkrow__title').firstChild.textContent,
    speaker: el.querySelector('strong').textContent, room: el.querySelector('.talkrow__room').textContent }));
  const popularFacts = await facts(page.locator('.talkrow--discovery'));
  await page.locator('.talkrow__star').click();
  const forum = source.forums.find(f => f.code === 'R1');
  const date = forum.talks.find(t => t.id === 'R1#1').day_date || forum.day_date;
  await page.goto(base + '/chinasoft2026/schedule?v=mine-day#' + date);
  await page.locator('.talkrow--agenda').waitFor();
  assert.deepEqual(await facts(page.locator('.talkrow--agenda')), popularFacts);
  assert.equal(await page.locator('.heat-value').count(), 0);
  assert(await page.locator('.talkrow--agenda').evaluate(el => el.querySelector('.talkrow__time').getBoundingClientRect().right <= el.querySelector('.talkrow__body').getBoundingClientRect().left), 'My Day retains its original separate time column');
  await page.goto(base + '/chinasoft2026/popular');
  await page.getByRole('tab', { name: '报告', exact: true }).click();
  await page.getByRole('tab', { name: '报告', exact: true }).press('ArrowLeft');
  assert.equal(await page.getByRole('tab', { name: '论坛', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: '论坛', exact: true }).press('ArrowRight');
  await page.locator('.talkrow__cover').click();
  await page.locator('#talk-2').waitFor(); assert(page.url().endsWith('#talk-2'));
  mode = 'large'; await page.goto(base + '/chinasoft2026/popular'); await page.reload();
  await page.getByRole('tab', { name: '报告', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.talkrow--discovery').length > 100);
  await page.locator('.talkrow--discovery').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.talkrow--discovery:last-child')).opacity) > 0.99, null, { timeout: 2000 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const count = requests;
  for (const path of ['/chinasoft2026', '/chinasoft2026/forum/R1', '/ccfchip2026']) {
    await page.goto(base + path); await page.locator('.frow, .followbtn').first().waitFor();
    if (path === '/ccfchip2026') await page.locator('.krail__toggle').first().click();
    if (path === '/chinasoft2026') await page.locator('.frow__caretbtn').first().click();
    assert.equal(await page.locator('.heat-value').count(), 0, path + ' has no heat display');
  }
  assert.equal(requests, count, 'existing content routes never read heat');
  await page.locator('.acct-btn').click();
  const toggle = page.getByRole('button', { name: '热度统计', exact: true });
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true'); assert(await toggle.isEnabled());
  await toggle.click(); assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('.nav__links a[href$="/popular"]').count(), 0);
  await page.goto(base + '/chinasoft2026/popular'); await until(() => page.url() === base + '/chinasoft2026');
  assert.equal(requests, count);
  await page.locator('.acct-btn').click(); await toggle.click(); await page.keyboard.press('Escape');
  assert.equal(await page.locator('.nav__links a[href$="/popular"]').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('PASS dedicated heat layout, score alignment/color, code badges, no explanatory copy, guest opt-out, durable links and unchanged My Day time column');

  // A separate clock context tests polling without altering native scroll/animation timing above.
  const timed = await browser.newContext({ locale: 'zh-CN' }); const clock = await timed.newPage();
  await clock.clock.install({ time: new Date('2026-10-31T00:00:00Z') });
  let reads = 0, fail = false;
  await clock.route('**/api/session', session);
  await clock.route('**/api/heat', async route => {
    reads++;
    if (fail) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    const generated_at = await clock.evaluate(() => new Date().toISOString());
    return route.fulfill({ headers: { 'Cache-Control': 'public, max-age=300' }, json: { generated_at,
      conferences: { chinasoft2026: { sha256: conference.sha256, forums: { R1: 200 }, talks: { 'R1#1': 200 } } } } });
  });
  await clock.goto(base + '/chinasoft2026/popular'); await clock.locator('.heat-value').first().waitFor();
  await clock.getByRole('progressbar').waitFor();
  // Development StrictMode may abort an initial read; each later cycle must add exactly one.
  const initialReads = reads; assert(initialReads >= 1 && initialReads <= 2);
  await clock.clock.fastForward(60_000);
  await until(async () => (await clock.locator('.heat-freshness').innerText()).includes('1 分钟前更新'));
  assert.equal(reads, initialReads + 0);
  await clock.clock.fastForward(240_100); await until(() => reads === initialReads + 1); await clock.locator('.heat-value').first().waitFor();
  const visibility = async hidden => clock.evaluate(hidden => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await visibility(true); await clock.clock.fastForward(900_000); assert.equal(reads, initialReads + 1);
  await visibility(false); await until(() => reads === initialReads + 2); await clock.locator('.heat-value').first().waitFor();
  fail = true; await clock.clock.fastForward(300_100); await clock.getByText('热度暂不可用', { exact: true }).waitFor();
  assert.equal(reads, initialReads + 3); fail = false;
  await clock.clock.fastForward(300_100); await until(() => reads === initialReads + 4); await clock.locator('.heat-value').first().waitFor();
  await timed.setOffline(true); await clock.getByText('热度暂不可用', { exact: true }).waitFor();
  await clock.clock.fastForward(900_000); assert.equal(reads, initialReads + 4);
  await timed.setOffline(false); await until(() => reads === initialReads + 5); await clock.locator('.heat-value').first().waitFor();
  await clock.locator('.acct-btn').click(); await clock.getByRole('button', { name: '热度统计', exact: true }).click();
  await until(() => clock.url() === base + '/chinasoft2026');
  await clock.clock.fastForward(900_000); assert.equal(reads, initialReads + 5, 'switching off cancels polling');
  await clock.getByRole('button', { name: '热度统计', exact: true }).click(); await clock.keyboard.press('Escape');
  await clock.locator('.nav__links a[href$="/popular"]').click(); await clock.locator('.heat-value').first().waitFor();
  const restartedReads = reads; assert(restartedReads >= initialReads + 6 && restartedReads <= initialReads + 7);
  await clock.locator('.nav__links a[href="/chinasoft2026"]').click();
  // Finish the route's exit animation before jumping fifteen minutes ahead.
  await clock.clock.runFor(600); await clock.locator('.dashhead').waitFor();
  await clock.clock.fastForward(900_000); assert.equal(reads, restartedReads, 'leaving the heat page cancels polling');
  await timed.close();
  console.log('PASS five-minute automatic refresh, source age/countdown, hidden/offline suspension, recovery, route cleanup and disabled polling');
} finally { await browser?.close(); server.kill('SIGTERM'); }
