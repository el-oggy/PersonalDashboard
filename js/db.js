/* ==========================================================================
   FlowOS — db.js
   Persistence layer. IndexedDB primary, localStorage fallback.
   Exposes a simple async key/value API: DB.get(key), DB.set(key, val),
   DB.getAllKeys(), DB.exportAll(), DB.importAll(obj).
   ========================================================================== */

const DB = (() => {
  const DB_NAME = 'flowos_db';
  const DB_VERSION = 1;
  const STORE = 'kv';
  const LS_PREFIX = 'flowos::';

  let idb = null;
  let useIndexedDB = 'indexedDB' in window;

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!useIndexedDB) return reject(new Error('no-idb'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function init() {
    if (!useIndexedDB) return;
    try {
      idb = await openIDB();
    } catch (e) {
      useIndexedDB = false;
      idb = null;
    }
  }

  function idbGet(key) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbSet(key, val) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGetAllKeys() {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(key) {
    if (useIndexedDB && idb) {
      try { return await idbGet(key); } catch (e) { /* fall through */ }
    }
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  }

  async function set(key, val) {
    if (useIndexedDB && idb) {
      try { await idbSet(key, val); return true; } catch (e) { /* fall through */ }
    }
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
    } catch (e) {
      console.warn('FlowOS: storage write failed', e);
    }
    return true;
  }

  async function getAllKeys() {
    if (useIndexedDB && idb) {
      try { return await idbGetAllKeys(); } catch (e) { /* fall through */ }
    }
    return Object.keys(localStorage)
      .filter(k => k.startsWith(LS_PREFIX))
      .map(k => k.slice(LS_PREFIX.length));
  }

  async function exportAll() {
    const keys = await getAllKeys();
    const out = {};
    for (const k of keys) {
      out[k] = await get(k);
    }
    out.__exportedAt = new Date().toISOString();
    out.__version = DB_VERSION;
    return out;
  }

  async function importAll(obj) {
    const keys = Object.keys(obj).filter(k => !k.startsWith('__'));
    for (const k of keys) {
      await set(k, obj[k]);
    }
    return true;
  }

  return { init, get, set, getAllKeys, exportAll, importAll };
})();
