// ─────────────────────────────────────────────────────────────────────────────
// sw.js  — VAIDYA Service Worker
// Caches the app shell so the UI loads offline.
// Caches offline-responses.json so basic health guidance works without backend.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'vaidya-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/src/js/script.js',
  '/offline-responses.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap',
];

// ── INSTALL: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first for API calls, cache-first for static assets ─────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let backend API calls go through; don't interfere
  if (url.port === '3000' || url.pathname.startsWith('/ask') || url.pathname.startsWith('/memory')) {
    return; // fall through to network
  }

  // For everything else: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          // Cache successful GET responses for static assets
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline and requesting the root, serve cached index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});