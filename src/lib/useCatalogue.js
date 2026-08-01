import { useEffect, useMemo, useRef, useState } from 'react';
import { parseM3U } from './m3u';
import { cacheGet, cacheSet, MAX_AGE } from './cache';

// Unified channel catalogue.
//
// The old design fetched ONE playlist at a time (category OR country OR
// language), so you could never filter across axes. Here all three are merged
// into a single list where every channel carries its category, country AND
// language — which is what makes combined filtering possible.
//
// Loading is progressive and off-thread:
//   cache (instant) → category only (~3MB, renders) → + country/language
// so a phone shows channels after a third of the download instead of all 9.5MB.

const BASE = import.meta.env.DEV ? '/iptv' : 'https://iptv-org.github.io/iptv';
const CACHE_KEY = 'catalogue-v1';

export const FACETS = {
  category: { label: 'Category', plural: 'Categories' },
  country: { label: 'Country', plural: 'Countries' },
  language: { label: 'Language', plural: 'Languages' },
};

// ---- main-thread fallback (no Worker support) ------------------------------
async function loadOnMainThread(onPartial) {
  const byUrl = new Map();
  const absorb = (facet, channels) => {
    for (const c of channels) {
      let e = byUrl.get(c.url);
      if (!e) {
        e = { url: c.url, name: c.name, logo: c.logo, quality: c.quality,
              tvgId: c.tvgId, flags: c.flags, category: [], country: [], language: [] };
        byUrl.set(c.url, e);
      }
      if (!e.logo && c.logo) e.logo = c.logo;
      if (!e.quality && c.quality) e.quality = c.quality;
      for (const g of c.groups) if (g && !e[facet].includes(g)) e[facet].push(g);
    }
  };
  const finalize = () => {
    const out = [];
    for (const c of byUrl.values()) {
      c.search = `${c.name} ${c.category.join(' ')} ${c.country.join(' ')}`.toLowerCase();
      c.primary = c.category[0] || c.country[0] || 'Other';
      out.push(c);
    }
    return out;
  };
  const get = async (file) => {
    const res = await fetch(`${BASE}/${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseM3U(await res.text());
  };

  absorb('category', await get('index.category.m3u'));
  onPartial?.(finalize());

  const rest = await Promise.allSettled([
    get('index.country.m3u').then((c) => ['country', c]),
    get('index.language.m3u').then((c) => ['language', c]),
  ]);
  for (const r of rest) if (r.status === 'fulfilled') absorb(r.value[0], r.value[1]);
  return finalize();
}

// Facet value lists with counts, sorted by frequency.
function buildFacets(channels) {
  const out = {};
  for (const facet of Object.keys(FACETS)) {
    const counts = new Map();
    for (const c of channels) {
      for (const v of c[facet]) counts.set(v, (counts.get(v) || 0) + 1);
    }
    out[facet] = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return out;
}

export function useCatalogue() {
  const [state, setState] = useState({
    status: 'loading', channels: [], stale: false, enriching: false,
  });
  // NOTE: a "already started" ref guard would break under StrictMode — the first
  // mount's cleanup cancels the shared work before the second mount can commit.
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const alive = () => !cancelled.current;
    let worker = null;

    const run = async () => {
      // 1) Paint from cache immediately when we have it.
      const cached = await cacheGet(CACHE_KEY);
      if (cached?.data?.length && alive()) {
        setState({
          status: 'ready', channels: cached.data,
          stale: cached.age > MAX_AGE, enriching: false,
        });
        if (cached.age <= MAX_AGE) return; // fresh — skip the network entirely
      }

      // 2) Prefer the worker so parsing never blocks the UI.
      if (typeof Worker !== 'undefined') {
        try {
          worker = new Worker(new URL('./catalogue.worker.js', import.meta.url), { type: 'module' });
          worker.onmessage = (e) => {
            const { type, channels, message } = e.data || {};
            if (!alive()) return;
            if (type === 'partial') {
              setState({ status: 'ready', channels, stale: false, enriching: true });
            } else if (type === 'complete') {
              setState({ status: 'ready', channels, stale: false, enriching: false });
              cacheSet(CACHE_KEY, channels);
              worker?.terminate();
            } else if (type === 'error') {
              setState((prev) => prev.channels.length
                ? { ...prev, stale: true, enriching: false }
                : { status: 'error', channels: [], stale: false, enriching: false, error: message });
              worker?.terminate();
            }
          };
          worker.onerror = () => { worker?.terminate(); worker = null; };
          worker.postMessage({ type: 'load', base: BASE });
          return;
        } catch {
          worker = null; // fall through to the main-thread path
        }
      }

      // 3) Fallback.
      try {
        const channels = await loadOnMainThread((partial) => {
          if (alive()) setState({ status: 'ready', channels: partial, stale: false, enriching: true });
        });
        if (alive()) setState({ status: 'ready', channels, stale: false, enriching: false });
        cacheSet(CACHE_KEY, channels);
      } catch (err) {
        if (alive()) {
          setState((prev) => prev.channels.length
            ? { ...prev, stale: true, enriching: false }
            : { status: 'error', channels: [], stale: false, enriching: false, error: err.message });
        }
      }
    };

    run();
    return () => {
      cancelled.current = true;
      worker?.terminate();
    };
  }, []);

  const facets = useMemo(
    () => (state.channels.length
      ? buildFacets(state.channels)
      : { category: [], country: [], language: [] }),
    [state.channels]
  );

  return { ...state, facets };
}
