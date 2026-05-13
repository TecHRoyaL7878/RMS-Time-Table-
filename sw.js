// ============================================================
// RGI Teacher Timetable System — Service Worker
// Cache Strategy: Cache-First for assets, Network-First for HTML
// ============================================================

const CACHE_NAME = 'rgi-timetable-v1';
const BASE_PATH = '/RMS-Time-Table-';

// Files to pre-cache on install
// ⚠️ Only list files that ACTUALLY EXIST in your repo root
const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/rms-logo.png'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
// Delete old caches from previous versions
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Strategy: Network-First for HTML (always get fresh page)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy: Cache-First for everything else (JS, CSS, images, fonts)
  event.respondWith(cacheFirst(request));
});

// ── STRATEGIES ───────────────────────────────────────────────

/**
 * Network-First: Try network, fall back to cache.
 * Best for HTML pages so users get the latest content.
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network failed, serving from cache:', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    // Final fallback: serve index.html as shell
    return caches.match(BASE_PATH + '/index.html');
  }
}

/**
 * Cache-First: Serve from cache if available, else fetch and cache.
 * Best for static assets that don't change often.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Cache miss and network failed for:', request.url);
    return new Response('Resource not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}
