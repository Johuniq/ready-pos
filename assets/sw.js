/**
 * Ready POS Service Worker
 *
 * Provides offline caching for the POS terminal so it remains functional
 * even when the network drops. Uses a cache-first strategy for static assets
 * and a network-first strategy for API calls.
 */

// Dynamic cache name based on version to force cache invalidation
const getCacheName = () => {
  // This will be replaced by PHP during service worker registration
  const version = self.READYPOS_CACHE_VERSION || "v1";
  return `readypos-${version}`;
};

const CACHE_NAME = getCacheName();
const STATIC_ASSETS = [
  // The shell HTML and main JS/CSS will be added dynamically on install
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip WP admin ajax and non-relevant requests
  if (url.pathname.includes("admin-ajax.php")) return;

  // API requests: network-first with cache fallback
  if (url.pathname.includes("/wp-json/ready-pos/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from cache if available
          return caches.match(request);
        }),
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|eot|ico)$/) ||
    url.pathname.includes("/assets/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // HTML pages: network-first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});
