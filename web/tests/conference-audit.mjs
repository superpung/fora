// End-to-end audit of the onboarded conference, including every published
// forum, chronological schedule blocks, people, AI governance and follows.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const data = JSON.parse(await readFile(new URL("../src/data/conferences/chinasoft2026.json", import.meta.url)));
const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4201";
const server = process.env.AUDIT_BASE_URL ? null : spawn(
  new URL("../node_modules/.bin/vite", import.meta.url).pathname,
  ["--host", "127.0.0.1", "--port", "4201", "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname, stdio: "ignore" },
);
let browser;
const errors = [];
try {
  if (server) {
    for (let attempt = 0; ; attempt++) {
      try { if ((await fetch(base)).ok) break; } catch { /* Wait for Vite. */ }
      if (attempt >= 100) throw new Error("Vite did not start");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "zh-CN" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const goto = async (path, selector) => {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    await page.locator(selector).first().waitFor();
  };

  await goto("/", 'a[href="/chinasoft2026"]');
  const portraits = JSON.parse(await readFile(new URL("../../source/chinasoft2026/raw/portraits.json", import.meta.url)));
  const paths = [...new Set(Object.values(portraits).map((p) => p.local_path))];
  for (let offset = 0; offset < paths.length; offset += 12) {
    const failures = await page.evaluate(async (batch) => {
      return (await Promise.all(batch.map(async (src) => {
        const img = new Image();
        img.src = src;
        try { await img.decode(); return img.naturalWidth > 0 ? null : src; }
        catch { return src; }
      }))).filter(Boolean);
    }, paths.slice(offset, offset + 12));
    assert.deepEqual(failures, [], "Portraits must load and decode");
  }
  console.log(`PASS ${paths.length} local portrait assets load and decode`);
  const forbidden = new Set(["华为", "百度", "昆仑芯", "院士", "校长", "待更新", "待定", "所有嘉宾"]);
  for (const forum of data.forums.filter((f) => f.detail_extracted)) {
    await goto(`/chinasoft2026/forum/${forum.code}`, "[id^=talk-]");
    assert((await page.locator(".fd__meta").textContent()).includes(`${forum.start}–${forum.end}`), `${forum.code}: published forum window`);
    const result = await page.locator("[id^=talk-]").evaluateAll((nodes) => nodes.map((node) => ({
      title: node.querySelector(".talk__title")?.textContent.trim(),
      people: [...node.querySelectorAll(".person__name,.authorchip__name")].filter((el) => !el.closest(".talk__hosts")).map((el) => el.textContent.trim()),
      hosts: [...node.querySelectorAll(".talk__hosts .person__name")].map((el) => el.textContent.trim()),
      portraits: [...node.querySelectorAll("img.avatar")].filter((el) => !el.closest(".talk__hosts")).map((el) => `${el.alt}:${el.getAttribute("src")}`),
    })));
    assert.equal(result.length, forum.talks.length, `${forum.code}: missing programme rows`);
    result.forEach((row, i) => {
      assert.equal(row.title, forum.talks[i].title.zh);
      assert.deepEqual([...row.people].sort(), forum.talks[i].speakers.map((p) => p.name).sort(), `${forum.code}#${i}: people`);
      assert.deepEqual(row.hosts, (forum.talks[i].extra?.hosts ?? []).map((p) => p.name), `${forum.code}#${i}: hosts`);
      row.people.forEach((name) => assert(!forbidden.has(name), `${forum.code}: pseudo-person ${name}`));
      assert.deepEqual(row.portraits.sort(), forum.talks[i].speakers.filter((p) => p.photo)
        .map((p) => `${p.name}:${p.photo.local_path}`).sort(), `${forum.code}#${i}: portraits`);
    });
    console.log(`PASS ${forum.code}: ${result.length} programme rows and speaker identities`);
  }
  await goto("/chinasoft2026/forum/R32#talk-5", "#talk-5 .person__name");
  assert.deepEqual(await page.locator("#talk-5 .person__name").allTextContents(), ["金意儿"]);
  assert.equal(await page.locator("#talk-5 .person__aff").textContent(), "华为");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/chinasoft2026-r32.png" });
  await page.locator("#talk-5 .talk__star").click();
  assert.equal(await page.locator("#talk-5 .talk__star").getAttribute("aria-pressed"), "true");

  await goto("/chinasoft2026/committee", ".member__name");
  const members = await page.locator(".member__name").allTextContents();
  members.forEach((name) => assert(!forbidden.has(name), `Committee pseudo-person: ${name}`));
  const roles = await page.locator(".cmt__role").allTextContents();
  assert.equal(new Set(roles).size, roles.length, "Duplicate committee groups");
  assert.equal(await page.locator(".cmt").filter({ has: page.locator(".cmt__role", { hasText: "荣誉主席" }) }).locator(".member").count(), 5);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/chinasoft2026-committee.png" });

  await goto("/chinasoft2026/schedule?v=all", ".daytab");
  for (let i = 0; i < data.days.length; i++) {
    await page.locator(".daytab").nth(i).click();
    await page.waitForTimeout(450);
    const starts = await page.locator(".block__head .time").allTextContents();
    assert.deepEqual(starts.map((s) => s.slice(0, 5)), starts.map((s) => s.slice(0, 5)).sort(), `Unsorted schedule on ${data.days[i].date}`);
    const links = await page.locator(".tgrid__talk[href]").count();
    const expected = data.forums.filter((f) => f.day_date === data.days[i].date).reduce((n, f) => n + f.talks.length, 0);
    assert.equal(links, expected, `Missing timeline talks on ${data.days[i].date}`);
    if (i === 1) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: "/tmp/chinasoft2026-schedule.png" });
    }
    if (data.days[i].date === "2026-11-07") {
      for (const code of ["E6", "C5", "C6"]) {
        assert(await page.locator(`.tgrid__chead[href="/chinasoft2026/forum/${code}"]`).count(), `Missing pending forum ${code}`);
      }
    }
  }
  await goto("/chinasoft2026/schedule?v=mine-day", ".daytab");
  await page.locator(".daytab").nth(1).click();
  await page.locator('a[href="/chinasoft2026/forum/R32#talk-5"]').first().waitFor();

  await goto("/chinasoft2026/topics", ".tmap__node");
  assert(await page.locator(".tmap__node").count() > 10, "Topic map is empty");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/chinasoft2026-topics.png" });
  await page.locator(".tmap__node").first().click();
  await page.locator(".tmaptalk").first().waitFor();
  assert(await page.locator(".tmaptalk__spk").count() > 0, "Topic talks have no speakers");
  await goto("/chinasoft2026/forum/R32", ".talksum");
  await page.evaluate(() => localStorage.setItem("fora-ai.enabled", "0"));
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator(".talksum").count(), 0, "AI summary ignores the global switch");
  assert.equal(await page.locator('nav a[href="/chinasoft2026/topics"]').count(), 0);
  assert.equal(await page.locator("#talk-5 .person__aff").textContent(), "华为");

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "zh-CN" });
  const phone = await mobile.newPage();
  phone.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["forum/R32#talk-5", "committee", "schedule", "topics", "speakers", "plan"]) {
    await phone.goto(`${base}/chinasoft2026/${path}`, { waitUntil: "networkidle" });
    await phone.waitForTimeout(550);
    assert(await phone.locator("h1,h2").count() > 0, `Blank mobile page: ${path}`);
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 1, `${path}: mobile page overflows by ${overflow}px`);
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS hub, committees, four schedule days, pending forums, follows, topics, AI switch and mobile routes");
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
