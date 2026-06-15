// Senaka Builders — Service Worker v2
// Cache version bumped → forces old cached pages to be cleared on update

const CACHE_VERSION = 'senaka-cube-v2';
const OFFLINE_PAGE  = 'index.html';

// On install: cache the offline fallback with new version name
self.addEventListener('install', (event) => {
  // Skip waiting immediately so new SW takes over without user refresh
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(OFFLINE_PAGE))
  );
});

// On activate: delete ALL old caches (clears "pwabuilder-page" and any others)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// On message: support manual skip-waiting calls
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// On fetch: network first, fall back to cache only when offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with fresh network response
          const cloned = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(OFFLINE_PAGE, cloned));
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cache  = await caches.open(CACHE_VERSION);
          const cached = await cache.match(OFFLINE_PAGE);
          return cached;
        })
    );
  }
});
