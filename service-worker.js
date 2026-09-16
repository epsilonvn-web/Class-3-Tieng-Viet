// Tiếng Việt 3 — PWA service worker
// Network-first cho app shell; bỏ qua dữ liệu động, Google TTS, Apps Script và mọi cross-origin.
const CACHE_NAME = 'tieng-viet-3-runtime-v4-20260916';
const APP_SHELL = ['./', './index.html', './manifest.json', './assets/js/app.js', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const crossOrigin = url.origin !== self.location.origin;
  const dynamicData = url.pathname.includes('/assets/data/');
  const googleDynamic = /script\.google\.com|translate\.google\.com/i.test(url.hostname);
  if (crossOrigin || dynamicData || googleDynamic) return;

  event.respondWith(
    fetch(new Request(req.url, { cache: 'no-store' }))
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
