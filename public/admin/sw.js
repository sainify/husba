const CACHE = 'husba-admin-v20-thread-20261002';
const SHELL = ['/admin/manifest.webmanifest','/admin/icons/admin-192.png','/admin/icons/admin-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('husba-admin-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith('/admin/')||url.pathname.startsWith('/admin/api/'))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>HUSBA offline</title><main style="font:16px sans-serif;padding:2rem"><h1>You are offline</h1><p>Reconnect to manage your store.</p><button onclick="location.reload()">Try again</button></main>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
