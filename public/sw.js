// Placeholder service worker to avoid 404s. Add real SW logic if needed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
