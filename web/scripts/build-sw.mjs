// Post-build service-worker generation. Runs AFTER `vite build` on the finished
// `dist/`, so it is independent of the bundler (Vite 8 / rolldown) — no build
// plugin to stay compatible with.
//
// Strategy: precache the app shell (HTML, CSS, code chunks, icons, manifest) so
// the app loads and runs offline after one visit; the per-conference datasets
// (emitted under assets/data/ — see vite.config.ts) are runtime-cached on first
// visit instead, so a new conference works offline once it has been opened online
// and the precache doesn't grow with every conference added.
import { generateSW } from "workbox-build";

const { count, size, warnings } = await generateSW({
  globDirectory: "dist",
  globPatterns: ["**/*.{html,css,js,svg,png,ico,webmanifest,woff2}"],
  // Conference datasets are runtime-cached, not precached (see below).
  globIgnores: ["assets/data/**", "sw.js", "workbox-*.js"],
  swDest: "dist/sw.js",
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  // Pull in our own notificationclick handler (public/reminder-sw.js → dist root)
  // so pre-session reminders — including TimestampTrigger ones that fire while
  // the app is closed — focus/open the app when tapped. See src/lib/reminder.tsx.
  importScripts: ["/reminder-sw.js"],
  // SPA fallback: serve the app shell for in-app navigations. Never intercept the
  // Netlify OAuth broker (or any /api route) — login must always hit the network.
  navigateFallback: "/index.html",
  navigateFallbackDenylist: [/^\/\.netlify\//, /^\/api\//],
  runtimeCaching: [
    {
      // per-conference datasets: fetched on first (online) visit, then served
      // from cache offline; revalidated in the background when online.
      urlPattern: ({ url }) => url.pathname.startsWith("/assets/data/"),
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "fora-conf-data",
        expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
  ],
});

for (const w of warnings) console.warn("[sw]", w);
console.log(`[sw] precached ${count} files, ${(size / 1024 / 1024).toFixed(2)} MiB`);
