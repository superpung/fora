// Custom additions pulled into the generated Workbox service worker via
// importScripts (see scripts/build-sw.mjs). Workbox owns precache/runtime
// caching; this file only adds notification behaviour, so reminders scheduled
// with a TimestampTrigger (Chromium) fire and are tappable even when the app is
// fully closed. On browsers without Notification Triggers the app schedules
// in-page instead and this handler still routes the click.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || "/";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer focusing an already-open window, navigating it to the target.
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if (target && "navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* cross-origin or detached; ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});
