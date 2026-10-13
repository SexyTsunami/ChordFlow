// Kill switch for a leftover localhost service worker that was serving
// the old Jay Chou catalog after the ChordDatabase rewrite.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      for (const client of windows) {
        client.navigate(client.url);
      }
    })(),
  );
});
