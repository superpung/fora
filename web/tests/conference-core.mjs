// Shared regressions use synthetic records and an existing conference.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:4217';
const server = spawn(new URL('../node_modules/.bin/vite', import.meta.url).pathname,
  ['--host', '127.0.0.1', '--port', '4217', '--strictPort'],
  { cwd: new URL('..', import.meta.url).pathname, stdio: 'ignore' });
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for Vite readiness. */ }
    if (attempt > 100) throw Error('Vite did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'zh-CN', timezoneId: 'America/Los_Angeles', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2025-11-26T23:59:40+08:00') });
  await page.goto(base + '/chinasoft2025/now', { waitUntil: 'networkidle' });
  await page.locator('.nowclock').waitFor();
  assert.equal(await page.locator('.nav__link--live').count(), 0);
  await page.clock.fastForward(31_000);
  await page.locator('.nav__link--live').waitFor();
  assert.equal(await page.locator('.nowclock__time').innerText(), '00:00');
  console.log('PASS live navigation enters the conference at venue midnight');
  const passed = await page.evaluate(async () => {
    const [{ clockAt, scheduleTimeMs }, { buildConferenceViews }, { buildLiveView, nextStarredItem },
      { collectFollowedItems }, { personKey, resolveSpeakerKeys }, { planReminders }] = await Promise.all([
      import('/src/lib/conference-time.ts'), import('/src/lib/data.ts'), import('/src/lib/live.ts'),
      import('/src/lib/export.ts'), import('/src/lib/person-key.ts'), import('/src/lib/reminder-schedule.ts'),
    ]);
    const passed = [];
    const check = (condition, label) => { if (!condition) throw Error(label); passed.push(label); };
    const date = '2030-05-08';
    const forum = (code, extra = {}) => ({ code, title: { zh: code }, day_date: date, room: 'Room A', talks: [], ...extra });
    const raw = { id: 'fixture', name: { zh: 'Fixture' }, start_date: date, end_date: date, timezone: 'Asia/Shanghai',
      venues: [{ id: 'v', name: { zh: 'Venue' }, type: 'main' }], days: [{ date, venue_id: 'v', blocks: [
        { kind: 'registration', title: { zh: 'Registration' }, start: '08:00', end: '09:00', location: 'Lobby' },
        { kind: 'keynotes', title: { zh: 'Keynote programme' }, start: '12:00', end: '13:00', talks: [] },
        { kind: 'committee_meetings', title: { zh: 'Meetings' }, start: '16:00', end: '18:00',
          meetings: [{ name: { zh: 'Working group' }, start: '16:30', end: '17:00', room: 'Room B' }] },
        { kind: 'forums', start: '09:00', end: '17:00', forum_entries: ['L', 'U', 'E', 'X'].map(forum_code => ({ forum_code })) },
      ] }], forums: [forum('L'), forum('U', { start: null, end: null }), forum('E', { start: '14:10', end: '15:10' }),
        forum('X', { start: '09:00', end: '10:00', talks: [{ title: { zh: 'Extended report' },
          start: '09:50', end: '10:20', speakers: [{ name: 'Alex' }, { name: 'Sam' }] }] }),
        forum('Y', { day_date: null, start: null, end: null })],
    };
    const views = buildConferenceViews(raw);
    const now = nowMin => ({ todayStr: date, nowMin });
    const live = nowMin => buildLiveView(views, now(nowMin));
    const follow = forums => ({ forums: new Set(forums), talks: new Set(), speakers: new Set() });
    check(views.forumTimeWindow(raw.forums[0]).start === '09:00' && views.forumTimeWindow(raw.forums[1]).start === null,
      'legacy windows inherit, explicitly unknown windows do not');
    check(views.unscheduledForums.some(f => f.code === 'Y'), 'undated forums remain browsable');
    check(live(510).nowRooms.some(r => r.title === 'Registration'), 'registration appears in Now');
    check(live(750).nowRooms.some(r => r.title === 'Keynote programme'), 'keynote blocks need no fabricated reports');
    check(!live(975).nowRooms.some(r => r.title === 'Working group') &&
      live(1005).nowRooms.some(r => r.title === 'Working group' && r.room === 'Room B'), 'meeting clocks override parent windows');
    check(live(610).nowRooms.find(r => r.code === 'X')?.nowTalk?.speaker === 'Alex、Sam',
      'reports extending beyond forum windows remain live with all speakers');
    check(!live(870).nowRooms.some(r => r.code === 'U'), 'unknown clocks never become live');
    const next = nextStarredItem(views, follow(['U', 'E']), now(870));
    check(next?.item.code === 'E' && next.running, 'date-only follows cannot displace a running follow');
    check(nextStarredItem(views, follow(['U']), now(870))?.item.start == null, 'date-only fallback retains unknown time');
    const exported = collectFollowedItems(follow(['E']), views);
    check(exported.length === 1 && exported[0].start === '14:10' && exported[0].talkIndex == null,
      'empty forums export their own window without a talk anchor');
    const people = [{ name: 'Alex', extra: { identity_key: 'source:a' } }, { name: 'Alex', extra: { identity_key: 'source:b' } }];
    check(personKey(people[0]) !== personKey(people[1]) && personKey({ name: 'Alex', affiliation_raw: 'Other' }) === personKey({ name: 'Alex' }),
      'only explicit source keys separate namesakes');
    const migrated = resolveSpeakerKeys(new Set(['Alex']), { forums: [{ talks: [{ speakers: people }] }] });
    check(migrated.size === 2 && migrated.has('source:a') && migrated.has('source:b'), 'legacy name follows preserve their original scope');
    const mixed = { ...raw, forums: [
      forum('A', { talks: [{ title: { zh: 'Keyed report' }, speakers: [people[0]] }] }),
      forum('B', { talks: [{ title: { zh: 'Name-only report' }, speakers: [{ name: 'Alex' }] }] }),
    ], days: [{ date, blocks: [{ kind: 'keynotes', talks: [
      { title: { zh: 'Keynote-only identity' }, speakers: [{ name: 'Alex', extra: { identity_key: 'source:keynote' } }] },
    ] }] }] };
    const mixedViews = buildConferenceViews(mixed);
    const legacy = { ...follow([]), speakers: new Set(['Alex']) };
    const mixedKeys = resolveSpeakerKeys(legacy.speakers, mixed);
    check(collectFollowedItems(legacy, mixedViews).length === 3,
      'legacy follows retain keyed, name-only and keynote-only appearances');
    const again = resolveSpeakerKeys(mixedKeys, mixed);
    check(again.size === mixedKeys.size && [...mixedKeys].every(key => again.has(key)),
      'speaker migration is idempotent');
    mixedKeys.delete('source:a');
    const remaining = collectFollowedItems({ ...legacy, speakers: resolveSpeakerKeys(mixedKeys, mixed) }, mixedViews);
    check(remaining.length === 2 && !remaining.some(item => item.title === 'Keyed report'),
      'unfollowing one namesake survives migration and agenda resolution');
    const keynoteOnly = { ...mixed, forums: [] };
    check(collectFollowedItems(legacy, buildConferenceViews(keynoteOnly)).length === 1,
      'legacy follows migrate when the person appears only in keynotes');
    check(resolveSpeakerKeys(new Set(['Unpublished person']), mixed).has('Unpublished person'),
      'unresolved legacy follows survive until their source records arrive');
    const instant = Date.parse('2030-05-07T16:00:00Z');
    check(clockAt(instant, 'Asia/Shanghai').todayStr === date && clockAt(instant, 'Asia/Shanghai').nowMin === 0,
      'venue midnight is independent of the device timezone');
    check(scheduleTimeMs(date, '10:00', 'Asia/Shanghai') === Date.parse('2030-05-08T02:00:00Z'), 'exports resolve venue clocks to exact instants');
    const sets = [{ confId: 'fixture', nameZh: 'Fixture', timezone: 'Asia/Shanghai', items: [
      { uid: 'a', title: 'Report', session: 'Forum', date, start: '10:00', approx: false },
      { uid: 'b', title: 'Unknown', session: 'Forum', date, start: null, approx: false },
    ] }];
    const planned = planReminders(sets, { enabled: true, leadMin: 10, dayStart: false },
      (key, vars) => JSON.stringify({ key, ...vars }), true, Date.parse('2030-05-08T01:55:00Z'));
    check(planned.length === 1 && planned[0].fireAt === Date.parse('2030-05-08T01:50:00Z') &&
      JSON.parse(planned[0].body).min === 5, 'reminders skip unknown clocks and announce actual remaining minutes');
    return passed;
  });
  for (const label of passed) console.log('PASS ' + label);
  await context.close();
  const end = await browser.newContext({ locale: 'zh-CN', timezoneId: 'America/Los_Angeles', serviceWorkers: 'block' });
  const endPage = await end.newPage();
  endPage.on('pageerror', error => errors.push(error.message));
  await endPage.clock.install({ time: new Date('2025-11-30T23:59:40+08:00') });
  await endPage.goto(base + '/chinasoft2025/now', { waitUntil: 'networkidle' });
  await endPage.locator('.nav__link--live').waitFor();
  await endPage.clock.fastForward(31_000);
  await endPage.locator('.nav__link--live').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log('PASS live navigation leaves the conference at venue midnight');
  console.log(`PASS ${passed.length + 2} shared regressions without new conference data`);
} finally {
  await browser?.close(); server.kill();
}
