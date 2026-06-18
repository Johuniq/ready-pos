/**
 * Ready POS Service Worker
 *
 * Provides offline caching for the POS terminal:
 * - Cache-first strategy for static assets (instant load)
 * - Network-first strategy for API calls (fresh data preferred)
 *
 * Version: 2.0.0
 */

// Dynamic cache name based on version to force cache invalidation
const getCacheName = () => {
  const version = self.READYPOS_CACHE_VERSION || "v2.0.0";
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

// Fetch: intelligent caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests. Non-GET requests (POST/PUT/DELETE) require
  // a live network connection and cannot be safely cached or replayed.
  if (request.method !== "GET") {
    return;
  }

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
          return caches
            .match(request)
            .then((cached) => {
              if (cached) {
                return cached;
              }
              // Return offline indicator response
              return new Response(
                JSON.stringify({
                  error: "offline",
                  message: "No network connection. Data may be stale.",
                  cached: false,
                }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" },
                },
              );
            });
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

// Message handler for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
