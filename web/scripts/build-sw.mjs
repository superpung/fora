// Post-build service-worker generation. Runs AFTER `vite build` on the finished
// `dist/`, so it is independent of the bundler (Vite 8 / rolldown) — no build
// plugin to stay compatible with.
//
// Strategy: precache the app shell (HTML, CSS, code chunks, icons, manifest) so
// the app loads offline after one visit. The data loader caches validated,
// immutable JSON separately; the shell never embeds a conference release.
import { generateSW } from "workbox-build";

const { count, size, warnings } = await generateSW({
  globDirectory: "dist",
  globPatterns: ["**/*.{html,css,js,svg,png,ico,webmanifest,woff2}"],
  // Conference datasets are runtime-cached, not precached (see below).
  globIgnores: ["data/**", "portraits/**", "sw.js", "workbox-*.js"],
  swDest: "dist/sw.js",
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  // Pull in our own notificationclick handler (public/reminder-sw.js → dist root)
  // so pre-session reminders — including TimestampTrigger ones that fire while
  // the app is closed — focus/open the app when tapped. See src/lib/reminder.tsx.
  importScripts: ["/reminder-sw.js"],
  // OAuth callbacks arrive at the root and must reach the Worker, even when
  // this service worker already controls the page.
  navigateFallback: "/index.html",
  navigateFallbackDenylist: [/^\/api\//, /^\/\?(?:.*&)?(?:code|state|error)=/],
  runtimeCaching: [
    {
      // Content-addressed portraits are cached as viewed, never downloaded for
      // unrelated conferences when the app shell first installs.
      urlPattern: ({ url }) => url.pathname.includes("/portraits/"),
      handler: "CacheFirst",
      options: {
        cacheName: "fora-portraits",
        expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
      },
    },
  ],
});

for (const w of warnings) console.warn("[sw]", w);
console.log(`[sw] precached ${count} files, ${(size / 1024 / 1024).toFixed(2)} MiB`);
