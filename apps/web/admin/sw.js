const CACHE = "husba-admin-v11";
const SHELL = [
  "/admin/",
  "/admin/manifest.webmanifest",
  "/admin/icons/admin-192.png",
  "/admin/icons/admin-512.png",
  "/assets/css/styles.css",
  "/assets/css/admin.css",
  "/assets/js/admin.js",
  "/assets/js/api.js",
  "/assets/media/brand/original-logo.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/assets/")) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/admin/"))));
});
