import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Combined, multi-axis filter state, serialized to the URL.
//
// A single facet value gets a real, crawlable path — /category/Sports,
// /country/India — which is what search engines index. Everything else
// (multi-select, search, sort, the playing channel) rides in the hash:
//   /category/Sports#language=English&q=cricket
// Special views (favorites / recent) live under `view`.
//
// Everything is in the URL so any state is shareable and survives reload.

export const VIEW_ALL = 'all';
export const VIEW_FAVORITES = 'favorites';
export const VIEW_RECENT = 'recent';

export const SORTS = {
  popular: 'Popular',
  az: 'A–Z',
  hd: 'HD first',
  works: 'Works for me',
};

const FACET_KEYS = ['category', 'country', 'language'];
const EMPTY = { category: [], country: [], language: [] };

function parse() {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const sel = {};
  for (const k of FACET_KEYS) {
    const raw = p.get(k);
    sel[k] = raw ? raw.split('~').map(decodeURIComponent).filter(Boolean) : [];
  }
  const m = window.location.pathname.match(/^\/(category|country|language)\/([^/]+)\/?$/);
  if (m) {
    const value = decodeURIComponent(m[2]);
    if (!sel[m[1]].includes(value)) sel[m[1]].unshift(value);
  }
  return {
    selected: sel,
    // `?q=` is the sitelinks-search-box entry point; the app itself keeps q in the hash.
    query: p.get('q') ? decodeURIComponent(p.get('q')) : new URLSearchParams(window.location.search).get('q') || '',
    view: p.get('view') || VIEW_ALL,
    sort: SORTS[p.get('sort')] ? p.get('sort') : 'popular',
    play: p.get('play') ? decodeURIComponent(p.get('play')) : null,
  };
}

// Returns the full URL (path + hash) for a state.
function toUrl({ selected, query, view, sort, play }) {
  const chips = FACET_KEYS.flatMap((k) => (selected[k] || []).map((v) => [k, v]));
  const usePath = chips.length === 1 && (!view || view === VIEW_ALL);
  const path = usePath ? `/${chips[0][0]}/${encodeURIComponent(chips[0][1])}` : '/';

  const p = new URLSearchParams();
  if (!usePath) {
    for (const k of FACET_KEYS) {
      if (selected[k]?.length) p.set(k, selected[k].map(encodeURIComponent).join('~'));
    }
  }
  if (query) p.set('q', encodeURIComponent(query));
  if (view && view !== VIEW_ALL) p.set('view', view);
  if (sort && sort !== 'popular') p.set('sort', sort);
  if (play) p.set('play', encodeURIComponent(play));
  const s = p.toString();
  const search = new URLSearchParams(window.location.search);
  search.delete('q');
  const qs = search.toString();
  return `${path}${qs ? `?${qs}` : ''}${s ? `#${s}` : ''}`;
}

export function useFilters() {
  const [state, setState] = useState(parse);
  // The latest state, readable synchronously. History writes happen here, never
  // inside a setState updater — React may run updaters twice (StrictMode) or
  // later than expected, which let the URL and the app drift apart.
  const stateRef = useRef(state);
  const apply = useCallback((next, push = false) => {
    stateRef.current = next;
    window.history[push ? 'pushState' : 'replaceState'](null, '', toUrl(next));
    setState(next);
  }, []);

  useEffect(() => {
    // `popstate` covers Back/Forward (including the Android hardware button);
    // `hashchange` covers a manually edited hash. Both just re-read the URL.
    const sync = () => {
      stateRef.current = parse();
      setState(stateRef.current);
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const commit = useCallback((next) => apply(next), [apply]);

  // `push: true` creates a real history entry so the browser/Android Back
  // button can return to the previous state (used when opening the player)
  // instead of leaving the app entirely.
  const update = useCallback((patch, { push = false } = {}) => {
    apply({ ...stateRef.current, ...patch }, push);
  }, [apply]);

  // Add/remove a single facet value.
  const toggleFacet = useCallback((facet, value) => {
    const prev = stateRef.current;
    const cur = prev.selected[facet] || [];
    const has = cur.includes(value);
    apply({
      ...prev,
      view: VIEW_ALL, // choosing a facet leaves favorites/recent
      selected: {
        ...prev.selected,
        [facet]: has ? cur.filter((v) => v !== value) : [...cur, value],
      },
    });
  }, [apply]);

  const clearFacets = useCallback(() => {
    update({ selected: EMPTY });
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
