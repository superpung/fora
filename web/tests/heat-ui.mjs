// Exercise public heat failure states and caching with the actual application.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4230';
const server = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4230', '--strictPort'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
const catalog = JSON.parse(await readFile(new URL('../public/data/manifest.json', import.meta.url)));
const conference = catalog.conferences.find(c => c.id === 'chinasoft2026');
const sha256 = conference.sha256;
const source = JSON.parse(await readFile(new URL('../public/data/' + conference.path, import.meta.url)));
const largeScores = Object.fromEntries(source.forums.flatMap(f => f.talks ?? []).map(t => [t.id, 200]));
let browser;
try {
  for (let n = 0; ; n++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Await Vite readiness. */ }
    if (n > 100) throw Error('Vite did not start');
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  let mode = 'ready', requests = 0;
  await page.route('**/api/session', route => route.fulfill({ json: { enabled: true, user: null, statistics: null } }));
  await page.route('**/api/heat', route => {
    requests++;
    if (mode === 'unavailable') return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    return route.fulfill({ headers: { 'Cache-Control': 'public, max-age=300' }, json: {
      generated_at: new Date().toISOString(), conferences: { chinasoft2026: {
        sha256: mode === 'mismatch' ? 'f'.repeat(64) : sha256,
        forums: mode === 'empty' ? {} : { R1: mode === 'invalid' ? '200 people' : 200, R2: 300, R3: 200 },
        talks: mode === 'empty' ? {} : mode === 'large' ? largeScores : { 'R1#1': 200 },
      } },
    } });
  });
  await page.goto(base + '/chinasoft2026/popular');
  await page.locator(':is(.ftable .frow, .talkrow--agenda)').nth(2).waitFor();
  assert.deepEqual(await page.locator('.frow__code').allTextContents(), ['R2', 'R1', 'R3']);
  await page.locator('.acct-btn').click();
  const toggle = page.getByRole('button', { name: /^参与统计/ });
  assert(await toggle.isDisabled(), 'signed-out readers can see the setting without contributing');
  await page.keyboard.press('Escape');
  const before = requests;
  await page.locator(':is(.frow__body, .talkrow__cover)').nth(1).click();
  await page.locator('.followbtn').waitFor();
  assert.equal(requests, before, 'route navigation reuses the unexpired aggregate');
  assert.equal(await page.locator('.fd__actions .heat-value').innerText(), '热度 200');
  await page.goBack();
  await page.getByRole('button', { name: '刷新热度', exact: true }).waitFor();
  for (const state of ['mismatch', 'invalid', 'unavailable', 'empty', 'ready']) {
    mode = state;
    await page.getByRole('button', { name: '刷新热度', exact: true }).click();
    if (state === 'ready') await page.locator(':is(.ftable .frow, .talkrow--agenda)').nth(2).waitFor();
    else await page.getByText(state === 'empty' ? '暂无热度数据' : '热度暂不可用', { exact: true }).waitFor();
  }
  await page.getByRole('tab', { name: '报告', exact: true }).click();
  await page.locator(':is(.ftable .frow, .talkrow--agenda)').first().waitFor();
  assert.equal(await page.locator('.talkrow__speaker svg').count(), 3);
  const facts = row => row.evaluate(el => {
    const title = el.querySelector('.talkrow__title'), style = getComputedStyle(title);
    return { title: title.firstChild.textContent, font: [style.fontSize, style.lineHeight],
      weight: style.fontWeight, running: el.classList.contains('talkrow--now'),
      speaker: el.querySelector('strong').textContent, room: el.querySelector('.talkrow__aff').textContent };
  });
  const { weight: popularWeight, running: popularRunning, ...popularFacts } = await facts(page.locator('.talkrow--agenda').first());
  assert.equal(popularRunning, false);
  await page.locator('.talkrow__star').click();
  const forum = source.forums.find(f => f.code === 'R1');
  const date = forum.talks.find(t => t.id === 'R1#1').day_date || forum.day_date;
  await page.goto(base + '/chinasoft2026/schedule?v=mine-day#' + date);
  await page.locator('.talkrow--agenda').waitFor();
  const { weight, running, ...dayFacts } = await facts(page.locator('.talkrow--agenda'));
  assert.deepEqual(dayFacts, popularFacts, 'Popular and My Day share report facts and typography');
  assert(running ? Number(weight) > Number(popularWeight) : weight === popularWeight,
    'only a currently running My Day report adds emphasis');
  assert.equal(await page.locator('.talkrow__speaker svg').count(), 3);
  await page.evaluate(() => localStorage.setItem('chinasoft2026:followed.talks', JSON.stringify(['R1#1', 'R1#3'])));
  await page.reload();
  await page.locator('.myday__linkrow').waitFor();
  assert(await page.locator('.myday__linkrow').evaluate(el => {
    const row = el.getBoundingClientRect(), panel = el.closest('.block').getBoundingClientRect();
    return row.left >= panel.left && row.right <= panel.right;
  }), 'My Day gap strips stay inside the shared flush panel');
  await page.goto(base + '/chinasoft2026/popular');
  await page.getByRole('tab', { name: '报告', exact: true }).click();
  await page.getByRole('tab', { name: '报告', exact: true }).press('ArrowLeft');
  assert.equal(await page.getByRole('tab', { name: '论坛', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: '论坛', exact: true }).press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: '报告', exact: true }).getAttribute('aria-selected'), 'true');

  await page.locator(':is(.frow__body, .talkrow__cover)').click();
  await page.locator('#talk-2').waitFor();
  assert(await page.locator('#talk-2 .talk__title').evaluate(el => {
    const title = el.getBoundingClientRect(), row = el.parentElement.getBoundingClientRect();
    return title.width >= row.width - 1;
  }), 'mobile report titles retain the full row width above actions');
  assert(page.url().endsWith('#talk-2'), 'report links retain durable anchors');
  await page.goBack();
  mode = 'large';
  await page.getByRole('button', { name: '刷新热度', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(':is(.ftable .frow, .talkrow--agenda)').length > 100);
  await page.locator(':is(.ftable .frow, .talkrow--agenda)').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(':is(.ftable .frow, .talkrow--agenda):last-child')).opacity) > 0.99, null, { timeout: 2000 });
  await page.locator(':is(.frow__body, .talkrow__cover)').last().click();
  await page.locator('.followbtn').waitFor();
  mode = 'unavailable';
  await page.reload();
  await page.locator('.fd__actions .heat-value').waitFor();
  await page.waitForFunction(() => document.querySelector('.fd__actions .heat-value')?.textContent.includes('—'));
  assert(await page.locator('.followbtn').isEnabled(), 'heat failures do not block following');
  mode = 'ready';
  await page.goto(base + '/chinasoft2026');
  await page.locator('.frow__caretbtn').first().click();
  const report = page.locator('.ftalk').filter({ has: page.locator('.heat-value') }).first();
  await report.locator('.heat-value').waitFor();
  const aligned = await report.evaluate(row => {
    const main = row.querySelector('.ftalk__main').getBoundingClientRect();
    const heat = row.querySelector('.heat-value').getBoundingClientRect();
    const star = row.querySelector('.star').getBoundingClientRect();
    return Math.abs(heat.left - main.left) < 1 && heat.right <= star.left && heat.bottom <= main.bottom + 1;
  });
  assert(aligned, 'expanded report heat stays aligned with its title and clear of the follow button');
  assert.deepEqual(errors, []);
  console.log('PASS public heat ordering, cached navigation, signed-out settings, dataset mismatch, malformed/unavailable/empty states durable report links and immediate long-list visibility');
} finally { await browser?.close(); server.kill('SIGTERM'); }
