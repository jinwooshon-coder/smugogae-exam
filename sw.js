/* 스무고개 시험준비 PWA — Service Worker
 * 전략: cache-first (navigation은 network-first로 최신 유지)
 * 버전 올릴 때 CACHE_VERSION 증가 → 자동 재설치
 */
const CACHE_VERSION = 'smg-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './student.html',
  './photo-editor.html',
  './photo-guide.html',
  './teacher-view.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // 핵심 자산 선캐시. 실패해도 SW는 설치되게 개별 catch
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[sw] skip', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // POST 등 non-GET 무시
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 외부 도메인(CDN 등)은 그대로
  if (url.origin !== self.location.origin) return;

  // 네비게이션(HTML 페이지 이동): network-first → fallback cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // 그 외 자원: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
