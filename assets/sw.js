/**
 * Ready POS Service Worker - Advanced Offline Support
 *
 * Provides comprehensive offline caching for the POS terminal:
 * - Cache-first strategy for static assets (instant load)
 * - Network-first strategy for API calls (fresh data preferred)
 * - Offline order queue management
 * - Background sync for pending operations
 * - Conflict detection and resolution
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

// IndexedDB for offline queue (mirrored from main thread)
const DB_NAME = "ready_pos_offline";
const DB_VERSION = 1;

// Open IndexedDB connection
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offline_orders")) {
        db.createObjectStore("offline_orders", { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains("offline_inventory")) {
        db.createObjectStore("offline_inventory", { keyPath: "product_id" });
      }
      if (!db.objectStoreNames.contains("sync_queue")) {
        db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
};

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

  // Skip non-GET requests for caching
  if (request.method !== "GET") {
    // POST/PUT/DELETE when offline → queue for sync
    if (!navigator.onLine && url.pathname.includes("/wp-json/ready-pos/")) {
      event.respondWith(handleOfflineWrite(request));
    }
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

// Handle offline write operations (POST/PUT/DELETE)
async function handleOfflineWrite(request) {
  try {
    const body = await request.clone().text();
    const db = await openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction("sync_queue", "readwrite");
      const store = transaction.objectStore("sync_queue");

      const queueItem = {
        url: request.url,
        method: request.method,
        body: body,
        headers: Array.from(request.headers.entries()),
        timestamp: Date.now(),
        retries: 0,
      };

      store.add(queueItem);

      transaction.oncomplete = () => {
        resolve(
          new Response(
            JSON.stringify({
              success: true,
              offline: true,
              message: "Operation queued for sync when connection returns",
            }),
            {
              status: 202,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      };

      transaction.onerror = () => {
        resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: "Failed to queue operation",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      };
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Background sync for pending operations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-orders") {
    event.waitUntil(syncOfflineOrders());
  } else if (event.tag === "sync-queue") {
    event.waitUntil(syncQueuedOperations());
  }
});

// Sync offline orders
async function syncOfflineOrders() {
  try {
    const db = await openDB();
    const transaction = db.transaction("offline_orders", "readonly");
    const store = transaction.objectStore("offline_orders");

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        const orders = request.result || [];

        for (const order of orders) {
          try {
            // Attempt to sync order
            const response = await fetch(order._syncUrl || "/wp-json/ready-pos/v1/orders/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(order),
            });

            if (response.ok) {
              // Remove from offline queue
              const delTransaction = db.transaction("offline_orders", "readwrite");
              const delStore = delTransaction.objectStore("offline_orders");
              delStore.delete(order.localId);
            }
          } catch (err) {
            // Sync failed, will retry later
          }
        }

        resolve();
      };
    });
  } catch (error) {
    // Sync error occurred
  }
}

// Sync queued operations
async function syncQueuedOperations() {
  try {
    const db = await openDB();
    const transaction = db.transaction("sync_queue", "readonly");
    const store = transaction.objectStore("sync_queue");

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = async () => {
        const items = request.result || [];

        for (const item of items) {
          try {
            const headers = new Headers(item.headers);
            const response = await fetch(item.url, {
              method: item.method,
              headers: headers,
              body: item.body,
            });

            if (response.ok) {
              // Remove from queue
              const delTransaction = db.transaction("sync_queue", "readwrite");
              const delStore = delTransaction.objectStore("sync_queue");
              delStore.delete(item.id);
            }
          } catch (err) {
            // Sync failed, will retry later
          }
        }

        resolve();
      };
    });
  } catch (error) {
    // Sync queue error occurred
  }
}

// Message handler for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "SYNC_NOW") {
    syncOfflineOrders();
    syncQueuedOperations();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
