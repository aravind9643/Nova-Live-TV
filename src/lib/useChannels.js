import { useEffect, useRef, useState } from 'react';
import { parseM3U } from './m3u';

// In dev we go through the Vite proxy (`/iptv/...`) to dodge CORS. GitHub Pages
// for iptv-org serves permissive CORS, so the raw URL works in prod too.
const BASE = import.meta.env.DEV ? '/iptv' : 'https://iptv-org.github.io/iptv';

// Browse axes — each is a different top-level playlist from iptv-org.
export const AXES = {
  category: { label: 'Category', url: `${BASE}/index.category.m3u` },
  country: { label: 'Country', url: `${BASE}/index.country.m3u` },
  language: { label: 'Language', url: `${BASE}/index.language.m3u` },
};

export function useChannels(axis = 'category') {
  const [state, setState] = useState({ status: 'loading', channels: [], groups: [] });
  // Cache each axis so switching tabs is instant after first load.
  const cache = useRef({});

  useEffect(() => {
    let alive = true;

    if (cache.current[axis]) {
      setState({ status: 'ready', ...cache.current[axis] });
      return;
    }

    setState({ status: 'loading', channels: [], groups: [] });
    (async () => {
      try {
        const res = await fetch(AXES[axis].url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const channels = parseM3U(text);

        const counts = new Map();
        for (const c of channels) counts.set(c.group, (counts.get(c.group) || 0) + 1);
        const groups = [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const payload = { channels, groups };
        cache.current[axis] = payload;
        if (alive) setState({ status: 'ready', ...payload });
      } catch (err) {
        if (alive) setState({ status: 'error', error: err.message, channels: [], groups: [] });
      }
    })();

    return () => { alive = false; };
  }, [axis]);

  return state;
}
