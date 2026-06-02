// IndexedDB Promise-based wrapper for offline POS operations
const DB_NAME = "ready_pos_offline";
const DB_VERSION = 1;
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

      // Store 1: Products catalog
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }

      // Store 2: Categories catalog
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "slug" });
      }

      // Store 3: Customers catalog
      if (!db.objectStoreNames.contains("customers")) {
        db.createObjectStore("customers", { keyPath: "id" });
      }

      // Store 4: Offline Orders Queue
      if (!db.objectStoreNames.contains("offline_orders")) {
        db.createObjectStore("offline_orders", { keyPath: "localId" });
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
