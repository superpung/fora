// Regression test: a forum permalink (…/forum/<code>#talk-<n>) must, on a fresh
// load/refresh, scroll the anchored talk to rest just below the sticky nav —
// NOT under it, and not far down the page. This has regressed more than once
// because the page keeps relaying out after the initial scroll (abstracts clamp
// their height in a useLayoutEffect, avatars load, the enter animation settles),
// so the scroll must re-settle. Run on every change: `pnpm test`.
//
// Exit code 0 = all anchors landed within tolerance; non-zero = a regression.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";

const PORT = Number(process.env.PERMA_PORT || 4199);
const BASE = `http://localhost:${PORT}`;
const CONF = process.env.PERMA_CONF || "chinasoft2025";
// Forums with enough talks that a late anchor sits well below the fold. Both a
// timed forum (tlrow layout) and the numbered-card layout are worth covering.
const FORUMS = (process.env.PERMA_FORUMS || "U1,S8").split(",");
const TOL = 14; // px tolerance around the intended resting offset

// Readiness via a raw TCP connect (avoids proxy env interfering with fetch).
// vite binds IPv6 ::1 here, so try that first, then the IPv4 loopback.
function tryConnect(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => { s.destroy(); resolve(false); });
  });
}
async function waitReady(port, timeoutMs = 40000) {
  const start = Date.now();
  for (;;) {
    if (await tryConnect("::1", port) || await tryConnect("127.0.0.1", port)) return;
    if (Date.now() - start > timeoutMs) throw new Error("dev server never came up");
    await new Promise((r) => setTimeout(r, 250));
  }
}

// Spawn vite directly (not via npx) in its own process group so we can reliably
// kill the whole tree on teardown — killing an `npx` wrapper leaves vite behind.
const viteBin = new URL("../node_modules/.bin/vite", import.meta.url).pathname;
const server = spawn(
  viteBin,
  ["--port", String(PORT), "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, HTTP_PROXY: "", HTTPS_PROXY: "", NO_PROXY: "*", no_proxy: "*" },
    stdio: "ignore", detached: true },
);
const killServer = () => { tearingDown = true; try { process.kill(-server.pid, "SIGTERM"); } catch { /* gone */ } };
let tearingDown = false;
server.on("exit", (code) => {
  if (code && !tearingDown && code !== 143) console.error(`vite exited early (code=${code})`);
});

let failures = 0;
try {
  await waitReady(PORT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  for (const code of FORUMS) {
    // discover how many talks this forum lists
    await page.goto(`${BASE}/${CONF}/forum/${code}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const count = await page.locator("[id^='talk-']").count();
    if (count < 3) { console.log(`SKIP ${code}: only ${count} talks`); continue; }

    // Test a mid anchor (must land exactly under the nav) and the last anchor
    // (near the page bottom it can't reach the top, so "scrolled as far as
    // possible, still visible" is the correct outcome — guard that it isn't left
    // off-screen or under the nav).
    const anchors = [Math.max(2, Math.round(count / 3)), count];
    for (const n of anchors) {
      const anchor = `talk-${n}`;
      // fresh load straight at the permalink (mimics a refresh of a shared link)
      await page.goto(`${BASE}/${CONF}/forum/${code}#${anchor}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000); // let abstracts clamp / avatars load / anim settle

      const m = await page.evaluate((id) => {
        const el = document.getElementById(id);
        const nav = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 56;
        const maxY = document.body.scrollHeight - window.innerHeight;
        return {
          rectTop: el ? el.getBoundingClientRect().top : null,
          navH: nav, winH: window.innerHeight,
          atMax: Math.abs(window.scrollY - maxY) < 2,
        };
      }, anchor);

      if (m.rectTop === null) { console.log(`FAIL ${code}#${anchor}: element missing`); failures++; continue; }
      const want = m.navH + 16;
      const drift = Math.abs(m.rectTop - want);
      const landedAtTop = drift <= TOL;
      // acceptable end-of-page case: page maxed out and the talk is on-screen,
      // no higher than the intended offset (i.e. scrolled as far as it can).
      const scrolledAsFarAsPossible =
        m.atMax && m.rectTop >= m.navH - 2 && m.rectTop <= m.winH * 0.9;
      const ok = landedAtTop || scrolledAsFarAsPossible;
      const how = landedAtTop ? "at-top" : scrolledAsFarAsPossible ? "maxed-visible" : "OFF";
      console.log(`${ok ? "PASS" : "FAIL"} ${code}#${anchor}: rectTop=${m.rectTop.toFixed(1)} want≈${want} drift=${drift.toFixed(1)} [${how}]`);
      if (!ok) failures++;
    }
  }

  await browser.close();
} catch (e) {
  console.error("ERROR:", e.message);
  failures++;
} finally {
  killServer();
}

if (failures > 0) { console.error(`\n${failures} permalink-scroll regression(s).`); process.exit(1); }
console.log("\nAll permalink-scroll checks passed.");
