// Verify real deployment routing, cached reading and OAuth with an active SW.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.AUDIT_BASE_URL;
assert(base, 'AUDIT_BASE_URL is required');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const revision = process.env.AUDIT_DATA_REVISION;
  await page.goto(base + '/' + (revision ? '?dataVersion=' + revision : ''), { waitUntil: 'domcontentloaded' });
  await page.locator('a[href="/chinasoft2026"]').first().waitFor();
  await page.goto(base + '/chinasoft2026/forum/R32#talk-4', { waitUntil: 'domcontentloaded' });
  await page.locator('#talk-4 .person__name').waitFor();
  assert.equal(await page.locator('#talk-4 .person__name').textContent(), '金意儿');
  await page.locator('#talk-4 img').first().evaluate(img => img.decode());
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const session = await page.evaluate(async () => (await fetch('/api/session')).json());
  assert.equal(session.user, null);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#talk-4 .person__name').waitFor();
  await page.getByText('缓存数据', { exact: true }).waitFor();
  await context.setOffline(false);
  const callback = await page.goto(base + '/?code=invalid&state=invalid', { waitUntil: 'domcontentloaded' });
  assert.equal(callback.status(), session.enabled ? 400 : 403);
  assert((await page.textContent('body')).includes('OAuth'));
  assert.deepEqual(errors, []);
  console.log('PASS deployed data, portrait, deep link, offline SW reading and network OAuth callback');
} finally {
  await browser.close();
}
