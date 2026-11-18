/**
 * HouseHelper PWA Service Worker
 *
 * Implements:
 * 1. App shell precaching for instant startup
 * 2. Navigation fallback for offline Single Page Application routing
 * 3. Stale-while-revalidate / cache-first for static assets
 * 4. Automatic cache eviction for old versions
 */

const CACHE_NAME = 'househelper-shell-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/fontawesome.min.css'
];

function isValidAssetResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return false;
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (request.destination === 'script') {
    return contentType.includes('javascript') || contentType.includes('ecmascript');
  }
  if (request.destination === 'style') {
    return contentType.includes('text/css');
  }
  if (request.destination === 'image') {
    return contentType.startsWith('image/');
  }
  if (request.destination === 'font') {
    return contentType.startsWith('font/') || contentType.includes('font') || contentType.includes('octet-stream');
  }
  return !contentType.includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip chrome-extension, firestore, and external auth endpoints
  if (
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com')
  ) {
    return;
  }

  // Never intercept unhashed CRA dev bundles
  if (url.pathname === '/static/js/bundle.js' || url.pathname.endsWith('.hot-update.js') || url.pathname.endsWith('.hot-update.json')) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 2. Static assets (JS, CSS, images, fonts) -> Cache first only when Content-Type is valid
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached && isValidAssetResponse(request, cached)) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (isValidAssetResponse(request, response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
