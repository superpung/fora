// Regression coverage for source completeness and user-visible agenda semantics.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4204";
const server = process.env.AUDIT_BASE_URL ? null : spawn(
  new URL("../node_modules/.bin/vite", import.meta.url).pathname,
  ["--host", "127.0.0.1", "--port", "4204", "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" },
);
let browser;
try {
  if (server) for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for Vite. */ }
    if (attempt >= 100) throw new Error("Vite did not start");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "zh-CN" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const go = async (path, selector) => {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.locator(selector).first().waitFor();
  };
  await go("/chinasoft2026", ".frow");
  assert.equal(await page.locator(".frow").count(), 64);
  const pending = page.locator(".dashday").filter({ has: page.locator("h2", { hasText: "日期待公布" }) });
  assert.equal(await pending.locator(".frow").count(), 34);
  await page.locator(".daypill").filter({ hasText: "日期待公布" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".frow").length === 34);
  assert.equal(await page.locator(".frow").count(), 34);
  await page.locator(".search__input").fill("软件工程智能体创新论坛");
  await page.waitForFunction(() => document.querySelectorAll(".frow").length === 1);
  assert.equal(await page.locator(".frow").count(), 1);
  assert.equal(await page.locator(".frow__code").textContent(), "R2");

  await go("/chinasoft2026/forum/R14", "#talk-4 .person__name");
  assert.equal(await page.locator("#talk-4 .person__name").textContent(), "廖楠");
  assert.equal(await page.locator("#talk-4 img.avatar").count(), 1);
  assert(await page.locator("#talk-4 .talk__abstract").count());
  assert((await page.locator("#talk-1 .talk__abstract").textContent()).includes("本报告围绕软件供应链中的风险发现"));
  assert((await page.locator(".fd__break").textContent()).includes("10:20–10:40"));
  const sequence = await page.locator(".tline").first().locator(":scope > *").evaluateAll((es) => es.map((e) => e.id || e.textContent));
  assert(sequence[sequence.indexOf("talk-4") + 1].includes("茶歇"));

  await go("/chinasoft2026/forum/E4", ".talk__hosts");
  assert.equal(await page.locator(".talk__hosts").count(), 7);
  assert.equal(await page.locator(".talk__hosts img.avatar").count(), 7);
  assert.equal(await page.locator("#talk-1 .talk__hosts .person__name").textContent(), "邓玉欣");
  await go("/chinasoft2026/forum/R32", ".fd__people");
  for (const button of await page.locator(".fd__people .person__toggle").all()) await button.click();
  const bios = await page.locator(".fd__people .person__bio").allTextContents();
  assert.equal(bios.length, 4);
  assert(bios.every((bio) => bio.length > 30 && !bio.includes("角色：")));

  await go("/chinasoft2026/speakers?q=李佳", ".spcard");
  assert.equal(await page.locator(".spcard").count(), 2);
  assert.deepEqual((await page.locator(".spcard__aff").allTextContents()).sort(), ["武汉大学", "清华大学"].sort());
  const qinghua = page.locator(".spcard").filter({ has: page.locator(".spcard__aff", { hasText: "清华大学" }) });
  await qinghua.locator(".star").click();
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("chinasoft2026:followed.speakers"))), ["P4:李佳"]);
  await go("/chinasoft2026/schedule?v=mine-day", ".daytab");
  await page.locator(".daytab").nth(3).click();
  await page.locator('a[href="/chinasoft2026/forum/P4#talk-4"]').waitFor();
  assert.equal(await page.locator('a[href="/chinasoft2026/forum/R4#talk-6"]').count(), 0);

  // Legacy imports followed every appearance of the name. Preserve that scope,
  // then allow either source record to be unfollowed independently.
  await page.evaluate(() => localStorage.setItem("chinasoft2026:followed.speakers", '["李佳"]'));
  await go("/chinasoft2026/speakers?q=李佳", ".spcard");
  assert.equal(await page.locator('.spcard .star[aria-pressed="true"]').count(), 2);
  await page.locator(".spcard").filter({ has: page.locator(".spcard__aff", { hasText: "清华大学" }) }).locator(".star").click();
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("chinasoft2026:followed.speakers"))), ["R4:李佳"]);
  await page.evaluate(() => localStorage.removeItem("chinasoft2026:followed.speakers"));
  await go("/chinasoft2026/forum/E6", ".followbtn");
  await page.locator(".followbtn").click();
  await go("/chinasoft2026/schedule?v=mine-day", ".daytab");
  await page.locator(".daytab").nth(2).click();
  await page.locator('a[href="/chinasoft2026/forum/E6"]').waitFor();
  assert.equal(await page.locator(".myday__empty").count(), 0);
  assert((await page.locator(".block--myday").textContent()).includes("14:10"));
  if (server) {
    const result = await page.evaluate(async () => {
      const { buildConferenceViews } = await import("/src/lib/data.ts");
      const { collectFollowedItems, toICS } = await import("/src/lib/export.ts");
      const { buildLiveView } = await import("/src/lib/live.ts");
      const { default: raw } = await import("/src/data/conferences/chinasoft2026.json");
      const views = buildConferenceViews(raw);
      const items = collectFollowedItems({ forums: new Set(["E6", "C5"]), speakers: new Set(), talks: new Set() }, views);
      const live = (date, minutes) => buildLiveView(views, { todayStr: date, nowMin: minutes });
      return { items, ics: toICS(items, "2026-10-14T00:00:00Z", views),
        morning: live("2026-11-06", 10 * 60), afternoon: live("2026-11-06", 14 * 60),
        beforeE6: live("2026-11-07", 14 * 60), duringE6: live("2026-11-07", 14 * 60 + 30),
        afterE6: live("2026-11-07", 15 * 60 + 11), lateReport: live("2026-11-06", 12 * 60 + 5),
      };
    });
    assert.equal(result.items.length, 2);
    const forum = result.items.find((x) => x.code === "E6");
    assert.equal(forum.approx, false);
    assert.equal(forum.talkIndex, undefined);
    assert(result.ics.includes("20261107T061000Z"));
    assert(result.ics.includes("DTSTART;VALUE=DATE:20261107"));
    assert(result.morning.nowRooms.some((r) => r.code === "R14"));
    assert(!result.morning.nowRooms.some((r) => r.code === "R32"));
    assert(!result.afternoon.nowRooms.some((r) => r.code === "R14"));
    assert(result.afternoon.nowRooms.some((r) => r.code === "R32"));
    assert(!result.beforeE6.nowRooms.some((r) => r.code === "E6"));
    assert.equal(result.beforeE6.next.start, "14:10");
    assert(result.duringE6.nowRooms.some((r) => r.code === "E6"));
    assert(!result.afterE6.nowRooms.some((r) => r.code === "E6"));
    assert(!result.duringE6.nowRooms.some((r) => r.code === "C5" || r.code === "C6"));
    assert(result.lateReport.nowRooms.some((r) => r.code === "E4"));
  }

  // Generic behavior also exposes an existing undated forum in another dataset.
  await go("/chinasoft2025", ".frow");
  assert.equal(await page.locator(".frow").count(), 73);
  assert(await page.locator('.frow__code').getByText("C3", { exact: true }).count());

  await page.setViewportSize({ width: 390, height: 844 });
  await go("/chinasoft2026/forum/E2", ".source-notes__toggle");
  const note = page.locator("#talk-4 .source-notes__toggle");
  await note.focus();
  await page.keyboard.press("Enter");
  assert.equal(await note.getAttribute("aria-expanded"), "true");
  assert((await page.locator("#talk-4 .source-notes__content").textContent()).includes("彭蓉-张颖"));
  assert(await page.getByRole("heading", { name: "未匹配的报告资料" }).count());
  assert(await page.locator(".person__name").getByText("张颖", { exact: true }).count());
  const profileWidth = await page.locator(".talk--profile .talk__body").evaluate((el) => el.getBoundingClientRect().width);
  assert(profileWidth >= 300, "Unmatched profiles must not occupy the report-number column on mobile");
  assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
  assert.deepEqual(errors, []);
  console.log("PASS all forum entries, updated source, hosts, breaks, clean biographies, separate identities, legacy follows, pending-forum agenda/exports and accessible source notes");
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
