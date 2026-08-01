import { useCallback, useEffect, useRef, useState } from 'react';

// Remembers which streams actually worked.
//
// A meaningful share of these public streams are dead or geo-blocked. Without
// memory you rediscover the same dead channel every session. We record an
// outcome per stream URL and use it to (a) badge/dim known-bad channels and
// (b) auto-skip them when zapping.

const KEY = 'nova.health';
const MAX_ENTRIES = 4000;         // keep the store bounded
const RETRY_AFTER = 24 * 60 * 60 * 1000; // give a failed stream another chance after 24h

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function useStreamHealth() {
  const [health, setHealth] = useState(load);
  const timer = useRef(null);

  // Debounced persist — playback events can arrive in bursts while zapping.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        let entries = Object.entries(health);
        if (entries.length > MAX_ENTRIES) {
          entries.sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
          entries = entries.slice(0, MAX_ENTRIES);
        }
        localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
      } catch {
        /* quota — ignore */
      }
    }, 800);
    return () => clearTimeout(timer.current);
  }, [health]);

  const report = useCallback((url, ok) => {
    if (!url) return;
    setHealth((prev) => {
      const cur = prev[url];
      // Don't churn state when nothing meaningful changed.
      if (cur && cur.ok === ok && Date.now() - (cur.at || 0) < 60_000) return prev;
      return { ...prev, [url]: { ok, at: Date.now(), fails: ok ? 0 : (cur?.fails || 0) + 1 } };
    });
  }, []);

  // 'good' | 'bad' | 'unknown' — 'bad' expires so streams can recover.
  const statusOf = useCallback(
    (url) => {
      const h = health[url];
      if (!h) return 'unknown';
      if (h.ok) return 'good';
      return Date.now() - h.at > RETRY_AFTER ? 'unknown' : 'bad';
    },
    [health]
  );

  const isBad = useCallback((url) => statusOf(url) === 'bad', [statusOf]);

  const clearHealth = useCallback(() => {
    setHealth({});
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  return { report, statusOf, isBad, clearHealth };
}
