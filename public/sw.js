/* Nova · Live TV — service worker
 *
 * Scope is deliberately narrow: cache the app shell so the app launches
 * offline. Channel data lives in IndexedDB (handled by the app), and video
 * segments are never cached — they're live streams and would blow the quota.
 */

const VERSION = 'nova-v1';
const SHELL = `${VERSION}-shell`;

// Only same-origin GETs for static assets are cacheable. Anything else
// (chrome-extension://, blob:, POST, cross-origin streams) is passed through —
// attempting to cache those throws "Request scheme 'x' is unsupported".
function isCacheable(request, url) {
  return (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    !url.pathname.startsWith('/iptv/') &&        // playlists: app caches these in IDB
    !/\.(m3u8?|ts|mp4|m4s)$/i.test(url.pathname) // never cache media segments
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(['/', '/index.html', '/manifest.webmanifest', '/icon.svg']))
      .catch(() => {}) // a missing asset must not abort installation
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return; // malformed — let the network handle it
  }

  if (!isCacheable(request, url)) return; // untouched by the SW

  // Navigations: network-first so users get fresh HTML, cache as offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first (Vite output is content-hashed, so it's safe).
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
