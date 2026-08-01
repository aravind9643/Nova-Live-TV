import { useCallback, useEffect, useMemo, useState } from 'react';

// Combined, multi-axis filter state, serialized to the URL hash.
//
// Replaces the old single-axis model (`axis=country&group=X`) — you can now
// stack Category + Country + Language at once, e.g.
//   #category=Sports&language=English&q=cricket
// Special views (favorites / recent) live under `view`.
//
// Everything is in the URL so any state is shareable and survives reload.

export const VIEW_ALL = 'all';
export const VIEW_FAVORITES = 'favorites';
export const VIEW_RECENT = 'recent';

const FACET_KEYS = ['category', 'country', 'language'];

function parse() {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const sel = {};
  for (const k of FACET_KEYS) {
    const raw = p.get(k);
    sel[k] = raw ? raw.split('~').map(decodeURIComponent).filter(Boolean) : [];
  }
  return {
    selected: sel,
    query: p.get('q') ? decodeURIComponent(p.get('q')) : '',
    view: p.get('view') || VIEW_ALL,
    play: p.get('play') ? decodeURIComponent(p.get('play')) : null,
  };
}

function serialize({ selected, query, view, play }) {
  const p = new URLSearchParams();
  for (const k of FACET_KEYS) {
    if (selected[k]?.length) p.set(k, selected[k].map(encodeURIComponent).join('~'));
  }
  if (query) p.set('q', encodeURIComponent(query));
  if (view && view !== VIEW_ALL) p.set('view', view);
  if (play) p.set('play', encodeURIComponent(play));
  const s = p.toString();
  return s ? `#${s}` : '';
}

export function useFilters() {
  const [state, setState] = useState(parse);

  useEffect(() => {
    const onHash = () => setState(parse());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const commit = useCallback((next) => {
    const hash = serialize(next);
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', url || window.location.pathname);
    setState(next);
  }, []);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const hash = serialize(next);
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, '', url || window.location.pathname);
      return next;
    });
  }, []);

  // Add/remove a single facet value.
  const toggleFacet = useCallback((facet, value) => {
    setState((prev) => {
      const cur = prev.selected[facet] || [];
      const has = cur.includes(value);
      const next = {
        ...prev,
        view: VIEW_ALL, // choosing a facet leaves favorites/recent
        selected: {
          ...prev.selected,
          [facet]: has ? cur.filter((v) => v !== value) : [...cur, value],
        },
      };
      const hash = serialize(next);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}` || window.location.pathname);
      return next;
    });
  }, []);

  const clearFacets = useCallback(() => {
    update({ selected: { category: [], country: [], language: [] } });
  }, [update]);

  // Flat list of active chips for the filter bar.
  const activeChips = useMemo(() => {
    const chips = [];
    for (const facet of FACET_KEYS) {
      for (const value of state.selected[facet] || []) chips.push({ facet, value });
    }
    return chips;
  }, [state.selected]);

  return { ...state, update, commit, toggleFacet, clearFacets, activeChips, FACET_KEYS };
}
