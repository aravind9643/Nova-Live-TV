import { useCallback, useEffect, useState } from 'react';

// Persists favorites + recently-watched to localStorage. Channels come and go on
// the iptv-org lists, so we store the full channel object (not just an id) — that
// way a favorite still renders even if it's dropped from the current playlist.

const FAV_KEY = 'nova.favorites';
const RECENT_KEY = 'nova.recent';
const RECENT_MAX = 18;

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

// A stable key for a channel across playlists (url is the most reliable).
export const channelKey = (c) => c?.url || c?.id;

export function useLibrary() {
  const [favorites, setFavorites] = useState(() => load(FAV_KEY));
  const [recent, setRecent] = useState(() => load(RECENT_KEY));

  useEffect(() => save(FAV_KEY, favorites), [favorites]);
  useEffect(() => save(RECENT_KEY, recent), [recent]);

  const isFavorite = useCallback(
    (c) => favorites.some((f) => channelKey(f) === channelKey(c)),
    [favorites]
  );

  const toggleFavorite = useCallback((c) => {
    setFavorites((prev) => {
      const k = channelKey(c);
      return prev.some((f) => channelKey(f) === k)
        ? prev.filter((f) => channelKey(f) !== k)
        : [c, ...prev];
    });
  }, []);

  const pushRecent = useCallback((c) => {
    setRecent((prev) => {
      const k = channelKey(c);
      return [c, ...prev.filter((r) => channelKey(r) !== k)].slice(0, RECENT_MAX);
    });
  }, []);

  return { favorites, recent, isFavorite, toggleFavorite, pushRecent };
}
