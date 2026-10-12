// Service worker for offline support.
// Strategy: cache-first for everything (the app + its CDN libraries), so after
// the first online load the trainer works fully offline. Bump CACHE to ship an
// update (old caches are cleared on activate).
const CACHE = 'bjt-cache-v1';
const CORE = ['./', './index.html', './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => {
            try { c.put(e.request, copy); } catch (_) {}
          });
          return resp;
        })
        .catch(() => cached);
    })
  );
});
