// Tiny IndexedDB key/value store for parsed playlists.
//
// The parsed catalogue is ~14k objects (several MB) — far past the localStorage
// quota — so it lives in IndexedDB. Return visits render from cache instantly
// while a fresh copy is fetched in the background (stale-while-revalidate).

const DB_NAME = 'nova-tv';
const STORE = 'playlists';
const DB_VERSION = 1;

// How long a cached playlist is considered fresh enough to skip revalidation.
export const MAX_AGE = 12 * 60 * 60 * 1000; // 12h

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((err) => {
    dbPromise = null; // allow a retry later
    throw err;
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function cacheGet(key) {
  try {
    const rec = await tx('readonly', (s) => s.get(key));
    if (!rec) return null;
    return { data: rec.data, age: Date.now() - rec.savedAt, savedAt: rec.savedAt };
  } catch {
    return null; // private mode / no IDB — just behave like a cold load
  }
}

export async function cacheSet(key, data) {
  try {
    await tx('readwrite', (s) => s.put({ data, savedAt: Date.now() }, key));
  } catch {
    /* quota or unavailable — non-fatal */
  }
}

export async function cacheClear() {
  try {
    await tx('readwrite', (s) => s.clear());
  } catch {
    /* ignore */
  }
}
