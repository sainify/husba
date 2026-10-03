const CACHE = 'husba-public-v2-thread-20261002';
const SHELL = ['/offline.html', '/icons/husba-192.png', '/icons/husba-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('husba-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Never intercept admin, API, writes or external media. Live catalogue stays live.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
