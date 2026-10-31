import { installDataFixture } from './data-fixture.mjs';
// Exercise forum-only agendas through the actual schedule routes and providers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4218';
const server = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4218', '--strictPort'],
  { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for Vite readiness. */ }
    if (attempt > 100) throw Error('Vite did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const errors = [];
  let cases = 0;
  for (const mobile of [false, true]) {
    for (const window of [
      { start: '14:10', end: '15:10', label: '14:10–15:10' },
      { start: '14:00', end: null, label: '14:00' },
      { start: null, end: null, label: null },
    ]) {
      const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block',
        viewport: { width: mobile ? 390 : 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const date = '2030-05-08';
      const raw = { id: 'chinasoft2025', name: { zh: 'Fixture' }, start_date: date, end_date: date,
        timezone: 'Asia/Shanghai', days: [{ date, blocks: [{ kind: 'forums', title: { zh: 'Forums' },
          start: '09:00', end: '17:00', forum_entries: [{ forum_code: 'E' }, { forum_code: 'U' }] }] }],
        forums: ['E', 'U'].map(code => ({ code, title: { zh: code === 'E' ? 'Followed forum' : 'Other forum' },
          day_date: date, room: 'Room A', start: window.start, end: window.end,
          talks: [], agenda_status: 'not_published' })),
      };
      await installDataFixture(page, raw);
      await page.addInitScript(() => localStorage.setItem('chinasoft2025:followed.forums', JSON.stringify(['E'])));
      await page.clock.setFixedTime(new Date(date + 'T14:30:00+08:00'));
      for (const view of ['all', 'mine-board', 'mine-day']) {
        await page.goto(base + '/chinasoft2025/schedule?v=' + view, { waitUntil: 'networkidle' });
        const main = page.locator('main');
        assert((await main.innerText()).includes('Followed forum'), `${view} retains an empty followed forum`);
        if (view === 'mine-day') {
          assert.equal(await page.locator('.talkrow').count(), 1);
          if (window.label) assert((await page.locator('.talkrow__time').innerText()).includes(window.label));
          assert.equal(await page.locator('.talkrow a').getAttribute('href'), '/chinasoft2025/forum/E');
        } else {
          const columns = page.locator('.tgrid__col');
          assert.equal(await columns.count(), view === 'all' ? 2 : 1);
          const followed = columns.filter({ hasText: 'Followed forum' });
          if (window.label) {
            assert.equal(await page.locator('.ufg').count(), 0, 'published forum clocks select the timed board');
            assert((await followed.innerText()).includes(window.label));
            const marker = followed.locator('.tgrid__more');
            assert.equal(await marker.getAttribute('href'), '/chinasoft2025/forum/E');
            assert(await marker.evaluate(el => {
              const parent = el.parentElement.getBoundingClientRect();
              const rect = el.getBoundingClientRect();
              return rect.top >= parent.top && rect.bottom <= parent.bottom + 1;
            }), 'the placeholder fits inside its column, including a start-only window');
          } else {
            assert((await followed.innerText()).includes('Agenda to come'));
          }
        }
      }
      console.log(`PASS ${mobile ? 'mobile' : 'desktop'} empty forum: ${window.label ?? 'unknown clock'} in all/board/day`);
      cases++;
      await context.close();
    }
  }
  const identityContext = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
  const identityPage = await identityContext.newPage();
  identityPage.on('pageerror', error => errors.push(error.message));
  const date = '2030-05-08';
  const people = [
    { name: 'Alex', affiliation_raw: 'Unit A', extra: { identity_key: 'source:a' } },
    { name: 'Alex', affiliation_raw: 'Unit B' },
    { name: 'Alex', affiliation_raw: 'Unit K', extra: { identity_key: 'source:keynote' } },
  ];
  const raw = { id: 'chinasoft2025', name: { zh: 'Fixture' }, start_date: date, end_date: date,
    timezone: 'Asia/Shanghai', forums: people.slice(0, 2).map((person, i) => ({ code: `F${i}`,
      title: { zh: `Forum ${i}` }, day_date: date, talks: [{ title: { zh: `Report ${i}` }, speakers: [person] }] })),
    days: [{ date, blocks: [{ kind: 'keynotes', talks: [{ title: { zh: 'Keynote' }, speakers: [people[2]] }] }] }],
  };
  await installDataFixture(identityPage, raw);
  await identityPage.addInitScript(() => {
    const key = 'chinasoft2025:followed.speakers';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(['source:a', 'name:Alex', 'source:keynote']));
  });
  await identityPage.goto(base + '/chinasoft2025/speakers', { waitUntil: 'networkidle' });
  await identityPage.locator('.spcard .star').first().waitFor();
  assert.equal(await identityPage.locator('.spcard .star[aria-pressed="true"]').count(), 3);
  await identityPage.locator('.spcard').filter({ hasText: 'Unit A' }).locator('.star').click();
  await identityPage.reload({ waitUntil: 'networkidle' });
  await identityPage.locator('.spcard .star').first().waitFor();
  assert.equal(await identityPage.locator('.spcard .star[aria-pressed="true"]').count(), 2);
  assert.equal(await identityPage.locator('.spcard').filter({ hasText: 'Unit A' }).locator('.star').getAttribute('aria-pressed'), 'false');
  await identityPage.goto(base + '/chinasoft2025/schedule?v=mine-day', { waitUntil: 'networkidle' });
  // Network quiescence does not guarantee that the lazy route has rendered.
  await identityPage.locator('.talkrow__title').first().waitFor();
  const titles = await identityPage.locator('.talkrow__title').allTextContents();
  assert.deepEqual(titles.sort(), ['Keynote', 'Report 1']);
  const cached = await identityPage.evaluate(() => JSON.parse(localStorage.getItem('chinasoft2025:reminder.items')));
  assert.deepEqual(cached.items.map(item => item.title).sort(), ['Keynote', 'Report 1']);
  console.log('PASS current follows preserve namesakes and keynotes, and an unfollow survives reload and reminder resolution');
  await identityContext.close();
  // Long rosters must reveal even when the viewport covers only a small fraction.
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: 900 },
      isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const raw = { id: 'chinasoft2025', name: { zh: 'Fixture' }, start_date: date, end_date: date,
      forums: [], days: [], committees: [{ role: { zh: 'Large roster' },
        members: Array.from({ length: 400 }, (_, index) => ({ name: `Member ${index}`, affiliation_raw: 'Institute' })) }] };
    await installDataFixture(page, raw);
    await page.goto(base + '/chinasoft2025/committee', { waitUntil: 'networkidle' });
    await page.locator('.cmt__role').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('.cmt, .member:first-child')]
      .every(el => Number(getComputedStyle(el).opacity) >= 0.99));
    assert.equal(await page.locator('.member').count(), 400);
    await page.locator('.member').last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.member:last-child')).opacity) >= 0.99);
    assert((await page.locator('.member').last().boundingBox()).y < 900);
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'} long committee remains visible at both ends`);
    cases++;
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${cases} shared UI regressions`);
} finally {
  await browser?.close(); server.kill();
}
