const CACHE = 'jarvis-v2';

const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js?v=2',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('/app.js') ||
     url.pathname.endsWith('/index.html'))
  ) {
    e.respondWith(
      fetch(e.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) =>
            cache.put(e.request, copy)
          );
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
  }
});
