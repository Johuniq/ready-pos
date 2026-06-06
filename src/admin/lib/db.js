// IndexedDB Promise-based wrapper for offline POS operations
const DB_NAME = "ready_pos_offline";
const DB_VERSION = 2; // Incremented for schema changes
const LOCAL_STORAGE_KEYS = ["ready_pos_favorites"];

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB opening failed:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Store 1: Products catalog
      if (!db.objectStoreNames.contains("products")) {
        const productStore = db.createObjectStore("products", { keyPath: "id" });
        productStore.createIndex("sku", "sku", { unique: false });
        productStore.createIndex("barcode", "barcode", { unique: false });
        productStore.createIndex("category", "category_id", { unique: false });
      }

      // Store 2: Categories catalog
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "slug" });
      }

      // Store 3: Customers catalog
      if (!db.objectStoreNames.contains("customers")) {
        const customerStore = db.createObjectStore("customers", { keyPath: "id" });
        customerStore.createIndex("email", "email", { unique: false });
        customerStore.createIndex("phone", "phone", { unique: false });
      }

      // Store 4: Offline Orders Queue
      if (!db.objectStoreNames.contains("offline_orders")) {
        const orderStore = db.createObjectStore("offline_orders", {
          keyPath: "localId",
        });
        orderStore.createIndex("syncStatus", "_syncStatus", { unique: false });
        orderStore.createIndex("createdAt", "_createdAt", { unique: false });
      }

      // Store 5: Offline Inventory (NEW in v2)
      if (!db.objectStoreNames.contains("offline_inventory")) {
        const inventoryStore = db.createObjectStore("offline_inventory", {
          keyPath: "product_id",
        });
        inventoryStore.createIndex("pendingSync", "_pendingSync", {
          unique: false,
        });
        inventoryStore.createIndex("lastUpdate", "_lastUpdate", {
          unique: false,
        });
      }

      // Store 6: Sync Queue for non-order operations (NEW in v2)
      if (!db.objectStoreNames.contains("sync_queue")) {
        const queueStore = db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
        queueStore.createIndex("retries", "retries", { unique: false });
      }

      // Store 7: Sync History (NEW in v2)
      if (!db.objectStoreNames.contains("sync_history")) {
        const historyStore = db.createObjectStore("sync_history", {
          keyPath: "id",
          autoIncrement: true,
        });
        historyStore.createIndex("timestamp", "timestamp", { unique: false });
        historyStore.createIndex("type", "type", { unique: false });
      }

      // Migration logic for existing data
      if (oldVersion < 2) {
        console.log("[DB] Migrating from version", oldVersion, "to version 2");
        // Add any migration logic here if needed
      }
    };
  });
};

export const dbOperations = {
  // Get single item by key
  async get(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Get all items in store
  async getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // Put / insert single item
  async put(storeName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Put / insert multiple items in batch
  async putAll(storeName, values) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      values.forEach((value) => {
        store.put(value);
      });

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // Delete single item by key
  async delete(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Clear whole store
  async clear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  // Query by index
  async getByIndex(storeName, indexName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // Count items in store
  async count(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Add sync history entry
  async logSync(type, data) {
    const entry = {
      type, // 'order', 'inventory', 'queue', 'manual'
      timestamp: Date.now(),
      success: data.success || false,
      itemCount: data.itemCount || 0,
      errors: data.errors || [],
      details: data.details || null,
    };
    return this.put("sync_history", entry);
  },

  // Get recent sync history
  async getSyncHistory(limit = 50) {
    const all = await this.getAll("sync_history");
    return all
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
};

export const resetOfflineStorage = async () => {
  const tasks = [];

  if (typeof localStorage !== "undefined") {
    LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  if (typeof sessionStorage !== "undefined") {
    Object.keys(sessionStorage)
      .filter(
        (key) => key.startsWith("readypos_") || key.startsWith("ready_pos_"),
      )
      .forEach((key) => sessionStorage.removeItem(key));
  }

  if (typeof indexedDB !== "undefined") {
    tasks.push(
      new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
      }),
    );
  }

  if (typeof caches !== "undefined") {
    tasks.push(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("readypos-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch(() => false),
    );
  }

  await Promise.all(tasks);
};
