// ============================================================================
// SERVICE WORKER CUỐI - TIẾNG VIỆT 3 CŨ (EPSILON EDU)
// Chỉ phục vụ thông báo chuyển sang https://epsilon-class-3.pages.dev/.
// Không tải/cache engine học, JSON hay private API. Không chuyển tài khoản.
// ============================================================================
'use strict';

const OLD_APP_CACHE_PREFIX = 'tieng-viet-3-';
const CACHE_NAME = 'tieng-viet-3-retirement-20261019-v1';
const APP_SCOPE = self.registration.scope;
const INDEX_URL = new URL('index.html', APP_SCOPE).href;
const MANIFEST_URL = new URL('manifest.json', APP_SCOPE).href;
const ICON_URL = new URL('icon-192.png', APP_SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Trang thông báo offline là bắt buộc trước khi kích hoạt SW cuối.
    const response = await fetch(new Request(INDEX_URL, {
      cache: 'reload',
      credentials: 'same-origin'
    }));
    if (!response.ok) throw new Error('Retirement page unavailable');
    await cache.put(INDEX_URL, response);

    // Tài nguyên PWA phụ trợ: nếu không có thì không làm hỏng bản thông báo.
    await Promise.allSettled([
      cache.add(new Request(MANIFEST_URL, { cache: 'reload' })),
      cache.add(new Request(ICON_URL, { cache: 'reload' }))
    ]);

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(OLD_APP_CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    // Không xóa cache của ứng dụng khác có thể cùng origin.
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  // Chỉ xử lý tài liệu của app cũ trong phạm vi đăng ký này.
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_SCOPE)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Mọi đường dẫn mở app/PWA cũ đều nhận index chuyển tiếp mới nhất.
      const response = await fetch(new Request(INDEX_URL, {
        cache: 'no-store',
        credentials: 'same-origin'
      }));
      if (!response.ok) throw new Error('Retirement page unavailable');
      await cache.put(INDEX_URL, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      // Mất mạng: chỉ mở lại trang thông báo, không trả app.js/index cũ.
      const offlinePage = await cache.match(INDEX_URL);
      return offlinePage || new Response(
        '<!doctype html><html lang="vi"><meta charset="utf-8">' +
        '<title>Tiếng Việt 3 chuyển sang Lớp 3</title>' +
        '<body><h1>Tiếng Việt 3 đã chuyển sang LỚP 3 – Epsilon Edu</h1>' +
        '<p>Chưa có kết nối mạng. Vui lòng thử lại khi có Internet.</p>' +
        '<p><a href="https://epsilon-class-3.pages.dev/" rel="noreferrer">Vào LỚP 3</a></p></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  })());
});
