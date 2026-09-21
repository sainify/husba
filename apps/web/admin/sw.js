const CACHE = "husba-admin-v14";
const SHELL = [
  "/admin/", "/admin/manifest.webmanifest",
  "/admin/icons/admin-192.png", "/admin/icons/admin-512.png",
  "/assets/css/styles.css", "/assets/css/admin.css",
  "/assets/js/admin.js", "/assets/js/api.js",
  "/assets/media/brand/original-logo.webp"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("husba-admin-") && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Only static app files are cached. API responses and credentials never enter this cache.
  if (url.origin !== location.origin || !SHELL.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(url.pathname);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(url.pathname, response.clone());
    return response;
  })());
});
