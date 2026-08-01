import { useMemo, useState, useDeferredValue, useCallback, useEffect, useRef } from 'react';
import {
  Search, Tv, WifiOff, Star, History, Menu, X, Globe, SlidersHorizontal,
  Clock, RotateCcw, Check,
} from 'lucide-react';
import { useCatalogue, FACETS } from './lib/useCatalogue';
import { useLibrary, channelKey } from './lib/useLibrary';
import { useFilters, VIEW_ALL, VIEW_FAVORITES, VIEW_RECENT } from './lib/useFilters';
import { useStreamHealth } from './lib/useStreamHealth';
import { useScrollMemory } from './lib/useScrollMemory';
import { searchChannels, loadRecentSearches, pushRecentSearch } from './lib/search';
import VirtualGrid from './components/VirtualGrid';
import AdSlot from './components/AdSlot';
import WatchScreen from './components/WatchScreen';

// How many values to show per facet before "show all".
const FACET_PREVIEW = 12;

export default function App() {
  const { status, channels, facets, stale, enriching } = useCatalogue();
  const { favorites, recent, isFavorite, toggleFavorite, pushRecent } = useLibrary();
  const { report, statusOf, isBad } = useStreamHealth();
  const {
    selected, query, view, play: playParam,
    update, toggleFacet, clearFacets, activeChips,
  } = useFilters();

  const [menuOpen, setMenuOpen] = useState(false);
  const [facetFilter, setFacetFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  const [playing, setPlaying] = useState(null);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [searchFocused, setSearchFocused] = useState(false);

  const mainRef = useRef(null);

  // Search runs over ~14k channels, so debounce the *expensive* path while the
  // input itself stays instant. useDeferredValue alone still re-scores on every
  // keystroke; the timer collapses fast typing into a single pass.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);
  const deferredQuery = useDeferredValue(debouncedQuery);

  // ---- filtering pipeline --------------------------------------------------
  // 1) pick the base list (all / favorites / recent)
  const base = view === VIEW_FAVORITES ? favorites : view === VIEW_RECENT ? recent : channels;

  // 2) apply combined facet filters (AND across facets, OR within a facet)
  const facetFiltered = useMemo(() => {
    const active = Object.entries(selected).filter(([, v]) => v.length);
    if (!active.length || view !== VIEW_ALL) return base;
    return base.filter((c) =>
      active.every(([facet, values]) => values.some((v) => c[facet]?.includes(v)))
    );
  }, [base, selected, view]);

  // 3) rank by search relevance, then sink known-dead streams to the bottom
  const results = useMemo(() => {
    const found = searchChannels(facetFiltered, deferredQuery);
    if (!found.length) return found;
    const live = [];
    const dead = [];
    for (const c of found) (isBad(c.url) ? dead : live).push(c);
    return dead.length ? [...live, ...dead] : found;
  }, [facetFiltered, deferredQuery, isBad]);

  // Restore scroll per distinct view.
  const viewKey = useMemo(
    () => `${view}|${JSON.stringify(selected)}|${deferredQuery}`,
    [view, selected, deferredQuery]
  );
  useScrollMemory(mainRef, viewKey, status === 'ready');

  // ---- deep-link resolution ------------------------------------------------
  useEffect(() => {
    if (!playParam || playing || !channels.length) return;
    const found = [...channels, ...favorites, ...recent].find((c) => channelKey(c) === playParam);
    if (found) { setPlaying(found); pushRecent(found); }
  }, [playParam, channels, favorites, recent, playing, pushRecent]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // AdSense page-level ads stamp `height: auto !important` onto #root/.app,
  // which breaks the viewport height chain: .main then grows to the virtual
  // list's full spacer height (100k+ px), the virtualiser thinks the whole list
  // is on screen, renders every card and the tab locks up. Strip it back out.
  useEffect(() => {
    const targets = [document.getElementById('root'), document.querySelector('.app')].filter(Boolean);
    if (!targets.length) return;

    const strip = () => {
      for (const el of targets) {
        if (el.style.getPropertyValue('height')) el.style.removeProperty('height');
        if (el.style.getPropertyValue('max-height')) el.style.removeProperty('max-height');
      }
    };
    strip();

    const mo = new MutationObserver(strip);
    for (const el of targets) mo.observe(el, { attributes: true, attributeFilter: ['style'] });
    return () => mo.disconnect();
  }, []);

  // Warm the player chunk (~530kB of hls.js) once the grid is up, so tapping a
  // channel opens a working player instead of a controls-less placeholder.
  useEffect(() => {
    if (status !== 'ready') return;
    const id = setTimeout(() => { import('./components/Player'); }, 1200);
    return () => clearTimeout(id);
  }, [status]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // ---- actions -------------------------------------------------------------
  const play = useCallback((c) => {
    setPlaying(c);
    pushRecent(c);                    // the watch screen's rail reads this
    update({ play: channelKey(c) });
    if (query.trim()) setRecentSearches(pushRecentSearch(query));
  }, [update, query, pushRecent]);

  const closePlayer = useCallback(() => {
    setPlaying(null);
    update({ play: null });
  }, [update]);

  // Zap, skipping channels already known to be dead (unless everything is).
  const zap = useCallback((dir) => {
    if (!playing || results.length < 2) return;
    const start = results.findIndex((c) => channelKey(c) === channelKey(playing));
    if (start === -1) return;
    const n = results.length;
    for (let step = 1; step <= n; step++) {
      const idx = (((start + dir * step) % n) + n) % n; // wrap in both directions
      const cand = results[idx];
      if (!cand) continue;
      // Take the first healthy channel; on the last hop accept whatever's there
      // so a fully-dead list still moves rather than freezing.
      if (!isBad(cand.url) || step === n) { play(cand); return; }
    }
  }, [playing, results, isBad, play]);

  const setView = useCallback((v) => {
    update({ view: v, selected: { category: [], country: [], language: [] } });
    setMenuOpen(false);
  }, [update]);

  const chipLabel = (facet, value) => value;

  // ---- render --------------------------------------------------------------
  const showSearchSuggestions = searchFocused && !query && recentSearches.length > 0;

  // Watching is a distinct screen, not an overlay — the browse UI unmounts so
  // nothing renders behind the video (and the grid can't steal scroll/GPU).
  if (playing) {
    return (
      <WatchScreen
        channel={playing}
        recent={recent}
        onBack={closePlayer}
        onPrev={results.length > 1 ? () => zap(-1) : undefined}
        onNext={results.length > 1 ? () => zap(1) : undefined}
        onPlay={play}
        favorite={isFavorite(playing)}
        onToggleFavorite={toggleFavorite}
        onHealth={report}
        statusOf={statusOf}
      />
    );
  }

  return (
    <div className="app">
      {/* ---------------- Header ---------------- */}
      <header className="appbar">
        <button className="hamburger" aria-label="Open filters" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <Menu size={22} />
          {activeChips.length > 0 && <span className="hamburger-dot" />}
        </button>

        <div className="brand">
          <span className="brand-mark"><Tv size={22} /></span>
          <div className="brand-text">
            <div className="brand-name">NOVA</div>
            <div className="brand-tag">Live TV</div>
          </div>
        </div>

        <div className="search appbar-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => update({ query: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) setRecentSearches(pushRecentSearch(query));
              if (e.key === 'Escape') update({ query: '' });
            }}
            placeholder="Search channels…"
            aria-label="Search channels"
          />
          {query && (
            <button className="search-clear" aria-label="Clear search" onClick={() => update({ query: '' })}>
              <X size={16} />
            </button>
          )}

          {showSearchSuggestions && (
            <div className="search-suggest">
              <div className="suggest-head"><Clock size={13} /> Recent searches</div>
              {recentSearches.map((t) => (
                <button key={t} className="suggest-item" onMouseDown={() => update({ query: t })}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-meta">
          <span className="live-dot" />
          <span className="meta-text">
            {status === 'ready' ? `${results.length.toLocaleString()} channels` : 'Loading…'}
          </span>
        </div>
      </header>

      {/* ---------------- Drawer / sidebar ---------------- */}
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <span className="sidebar-title"><SlidersHorizontal size={17} /> Filters</span>
          <button className="drawer-close" aria-label="Close filters" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="views">
          <button className={`view-btn ${view === VIEW_ALL && !activeChips.length ? 'active' : ''}`} onClick={() => setView(VIEW_ALL)}>
            <Globe size={16} /> All
          </button>
          <button className={`view-btn ${view === VIEW_FAVORITES ? 'active' : ''}`} onClick={() => setView(VIEW_FAVORITES)} disabled={!favorites.length}>
            <Star size={16} /> Favorites{favorites.length ? ` (${favorites.length})` : ''}
          </button>
          <button className={`view-btn ${view === VIEW_RECENT ? 'active' : ''}`} onClick={() => setView(VIEW_RECENT)} disabled={!recent.length}>
            <History size={16} /> Recent{recent.length ? ` (${recent.length})` : ''}
          </button>
        </div>

        <div className="menu-search">
          <Search size={16} />
          <input
            value={facetFilter}
            onChange={(e) => setFacetFilter(e.target.value)}
            placeholder="Filter options…"
            aria-label="Filter facet options"
          />
          {facetFilter && (
            <button className="search-clear" aria-label="Clear" onClick={() => setFacetFilter('')}><X size={14} /></button>
          )}
        </div>

        <div className="facets">
          {Object.entries(FACETS).map(([facet, { plural }]) => {
            const q = facetFilter.trim().toLowerCase();
            const all = facets[facet] || [];
            const matching = q ? all.filter((v) => v.name.toLowerCase().includes(q)) : all;
            if (!matching.length) return null;
            const isOpen = expanded[facet] || q;
            const shown = isOpen ? matching : matching.slice(0, FACET_PREVIEW);

            return (
              <section key={facet} className="facet">
                <h3 className="facet-title">{plural}</h3>
                <div className="facet-list">
                  {shown.map((v) => {
                    const on = selected[facet]?.includes(v.name);
                    return (
                      <button
                        key={v.name}
                        className={`facet-item ${on ? 'on' : ''}`}
                        onClick={() => toggleFacet(facet, v.name)}
                        aria-pressed={on}
                      >
                        <span className="facet-check">{on && <Check size={12} strokeWidth={3} />}</span>
                        <span className="facet-name">{v.name}</span>
                        <em>{v.count}</em>
                      </button>
                    );
                  })}
                </div>
                {!q && matching.length > FACET_PREVIEW && (
                  <button
                    className="facet-more"
                    onClick={() => setExpanded((p) => ({ ...p, [facet]: !p[facet] }))}
                  >
                    {isOpen ? 'Show less' : `Show all ${matching.length}`}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <AdSlot slot="sidebar" format="auto" className="ad-sidebar" />
        <div className="sidebar-foot">Streams by iptv-org · free &amp; open</div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <main className="main" ref={mainRef}>
        {stale && <div className="stale-note">Showing saved channels — refreshing in the background…</div>}
        {enriching && (
          <div className="stale-note">
            Channels ready — loading country &amp; language filters…
          </div>
        )}

        {status === 'loading' && (
          <div className="grid skeleton-grid" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card skel">
                <div className="card-thumb skel-box" />
                <div className="card-meta">
                  <span className="skel-line" style={{ width: '78%' }} />
                  <span className="skel-line" style={{ width: '46%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="center-state">
            <WifiOff size={40} />
            <p>Couldn't load the channel list. Check your connection and try again.</p>
            <button className="btn-ghost primary" onClick={() => window.location.reload()}>
              <RotateCcw size={15} /> Retry
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* Active filter chips */}
            {(activeChips.length > 0 || view !== VIEW_ALL) && (
              <div className="chipbar">
                {view !== VIEW_ALL && (
                  <span className="chip chip-view">
                    {view === VIEW_FAVORITES ? <><Star size={13} /> Favorites</> : <><History size={13} /> Recent</>}
                    <button onClick={() => setView(VIEW_ALL)} aria-label="Clear view"><X size={13} /></button>
                  </span>
                )}
                {activeChips.map(({ facet, value }) => (
                  <span key={`${facet}:${value}`} className="chip">
                    {chipLabel(facet, value)}
                    <button onClick={() => toggleFacet(facet, value)} aria-label={`Remove ${value}`}><X size={13} /></button>
                  </span>
                ))}
                {activeChips.length > 1 && (
                  <button className="chip chip-clear" onClick={clearFacets}>Clear all</button>
                )}
              </div>
            )}

            <AdSlot slot="grid" format="fluid" className="ad-grid" />

            {results.length > 0 ? (
              <VirtualGrid
                items={results}
                scrollParent={mainRef}
                onPlay={play}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                statusOf={statusOf}
              />
            ) : (
              <div className="center-state small">
                <p>
                  {view === VIEW_FAVORITES ? 'No favorites yet — tap the ★ on any channel.'
                    : view === VIEW_RECENT ? 'Nothing watched yet.'
                    : query ? `No channels match “${query}”.`
                    : 'No channels match these filters.'}
                </p>
                {(activeChips.length > 0 || query) && (
                  <button className="btn-ghost" onClick={() => { clearFacets(); update({ query: '' }); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
