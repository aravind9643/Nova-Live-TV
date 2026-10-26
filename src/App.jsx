import { useMemo, useState, useDeferredValue, useCallback, useEffect, useRef } from 'react';
import {
  Search, Tv, WifiOff, Star, History, X, Home, SlidersHorizontal, Clock, RotateCcw,
  Sun, Moon, Monitor, Play, ArrowUpDown,
} from 'lucide-react';
import { useCatalogue } from './lib/useCatalogue';
import { useLibrary, channelKey } from './lib/useLibrary';
import { useFilters, VIEW_ALL, VIEW_FAVORITES, VIEW_RECENT, SORTS } from './lib/useFilters';
import { useAdGuard } from './lib/useAdGuard';
import { usePrefs } from './lib/usePrefs';
import { logoSrc, onLogoError } from './lib/img';
import { useStreamHealth } from './lib/useStreamHealth';
import { useScrollMemory } from './lib/useScrollMemory';
import { searchChannels, loadRecentSearches, pushRecentSearch } from './lib/search';
import VirtualGrid from './components/VirtualGrid';
import FilterPanel from './components/FilterPanel';
import AdSlot from './components/AdSlot';
import AnchorAd from './components/AnchorAd';
import MultiplexAd from './components/MultiplexAd';
import WatchScreen from './components/WatchScreen';
import Toast from './components/Toast';

// Quick-pick categories shown as a scrollable chip row above the grid.
const QUICK_CHIPS = 12;
// How many channels the watch screen lists under "Up next".
const UP_NEXT = 12;
const SITE = 'https://nova-live-tv.vercel.app';
const THEMES = { system: Monitor, dark: Moon, light: Sun };
const NEXT_THEME = { system: 'dark', dark: 'light', light: 'system' };

const HD = /^(4k|2160p|1080[pi]|720p)$/i;

function setMeta(name, content, attr = 'name') {
  const el = document.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.setAttribute('content', content);
}

export default function App() {
  const { status, channels, facets, stale, enriching } = useCatalogue();
  const { favorites, recent, isFavorite, toggleFavorite, pushRecent } = useLibrary();
  const { report, statusOf, isBad } = useStreamHealth();
  const { prefs, setPref } = usePrefs();
  const {
    selected, query, view, sort, play: playParam,
    update, toggleFacet, clearFacets, activeChips,
  } = useFilters();

  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [searchFocused, setSearchFocused] = useState(false);
  const [toast, setToast] = useState(null);

  const mainRef = useRef(null);
  const searchRef = useRef(null);

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

  // 3) rank by search relevance (or the chosen sort), then sink — or hide —
  //    known-dead streams
  const results = useMemo(() => {
    let found = searchChannels(facetFiltered, deferredQuery);
    if (!found.length) return found;
    if (sort === 'az') found = [...found].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'hd') found = [...found].sort((a, b) => HD.test(b.quality || '') - HD.test(a.quality || ''));
    else if (sort === 'works') {
      const rank = { good: 0, unknown: 1, bad: 2 };
      found = [...found].sort((a, b) => rank[statusOf(a.url)] - rank[statusOf(b.url)]);
    }
    const live = [];
    const dead = [];
    for (const c of found) (isBad(c.url) ? dead : live).push(c);
    if (prefs.hideDead) return live;
    return dead.length ? [...live, ...dead] : found;
  }, [facetFiltered, deferredQuery, isBad, statusOf, sort, prefs.hideDead]);

  // Restore scroll per distinct view.
  const viewKey = useMemo(
    () => `${view}|${JSON.stringify(selected)}|${deferredQuery}|${sort}`,
    [view, selected, deferredQuery, sort]
  );
  useScrollMemory(mainRef, viewKey, status === 'ready');

  // ---- deep-link resolution ------------------------------------------------
  useEffect(() => {
    if (!playParam || playing || !channels.length) return;
    const found = [...channels, ...favorites, ...recent].find((c) => channelKey(c) === playParam);
    if (found) { playingRef.current = found; setPlaying(found); pushRecent(found); }
  }, [playParam, channels, favorites, recent, playing, pushRecent]);

  // Per-view title, description and canonical URL. Single-facet views live at
  // real paths (/category/Sports), so each is its own indexable page.
  useEffect(() => {
    let title = 'NOVA Live TV · Watch 13,000+ Free Live TV Channels Online';
    let desc = 'Watch over 13,000 free live TV channels from around the world. Stream news, sports, movies, music and more in HD — no sign-up.';
    if (playing) {
      title = `Watch ${playing.name} Live Stream · NOVA Live TV`;
      desc = `Watch ${playing.name} live and free online${playing.primary ? ` — ${playing.primary}` : ''}${playing.country?.[0] ? ` from ${playing.country[0]}` : ''}. No sign-up.`;
    } else if (query.trim()) {
      title = `Search "${query}" Live TV Channels · NOVA Live TV`;
    } else if (activeChips.length > 0) {
      const summary = activeChips.map((c) => c.value).join(', ');
      title = `${summary} Live TV Channels · Watch Free · NOVA Live TV`;
      desc = `Watch free ${summary} live TV channels online in HD. Browse ${results.length.toLocaleString()} streams on NOVA Live TV.`;
    }
    document.title = title;
    setMeta('description', desc);
    setMeta('og:title', title, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${SITE}${window.location.pathname}`;
  }, [playing, query, activeChips, results.length]);

  useAdGuard();

  // Warm the player chunk (~530kB of hls.js) once the grid is up, so tapping a
  // channel opens a working player instead of a controls-less placeholder.
  useEffect(() => {
    if (status !== 'ready') return;
    const id = setTimeout(() => { import('./components/Player'); }, 1200);
    return () => clearTimeout(id);
  }, [status]);

  // The filter sheet behaves like a modal on phones: Esc closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // ---- actions -------------------------------------------------------------
  // Tracks whether opening the player pushed a history entry we still owe a pop.
  const pushedEntry = useRef(false);
  // Mirrors `playing` synchronously so play() can decide push vs replace
  // without reading state inside an updater.
  const playingRef = useRef(null);

  const play = useCallback((c) => {
    // Opening the player from the grid adds ONE history entry, so Back returns
    // to the channel list. Zapping between channels replaces it, so Back
    // doesn't have to unwind every channel you flicked through.
    const shouldPush = !playingRef.current;
    if (shouldPush) pushedEntry.current = true;
    playingRef.current = c;
    setPlaying(c);
    update({ play: channelKey(c) }, { push: shouldPush });
    pushRecent(c);                    // the watch screen's rail reads this
    if (query.trim()) setRecentSearches(pushRecentSearch(query));
  }, [update, query, pushRecent]);

  const closePlayer = useCallback(() => {
    // Consume the entry play() pushed so Back/Forward stay consistent. popstate
    // then drops `play` from the URL and the effect below unmounts the player.
    if (pushedEntry.current) {
      pushedEntry.current = false;
      window.history.back();
    } else {
      // Arrived via a deep link — no entry of ours to pop.
      playingRef.current = null;
      setPlaying(null);
      update({ play: null });
    }
  }, [update]);

  // Keep the player in sync with the URL — this is what makes the browser /
  // Android Back button close the player instead of leaving the app.
  useEffect(() => {
    if (!playParam && playing) {
      pushedEntry.current = false; // the entry was consumed by the Back press
      playingRef.current = null;
      setPlaying(null);
    }
  }, [playParam, playing]);

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

  // Favorite toggles get a toast with Undo — the star is easy to hit by accident.
  const toggleFav = useCallback((c) => {
    const was = isFavorite(c);
    toggleFavorite(c);
    setToast({
      id: Date.now(),
      message: was ? `Removed ${c.name} from favorites` : `Added ${c.name} to favorites`,
      action: { label: 'Undo', run: () => toggleFavorite(c) },
    });
  }, [isFavorite, toggleFavorite]);
  const clearToast = useCallback(() => setToast(null), []);

  const goHome = useCallback(() => {
    update({ view: VIEW_ALL, query: '', selected: { category: [], country: [], language: [] } });
    setMenuOpen(false);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [update]);

  // The channels after the current one in the active list — what zapping visits.
  const upNext = useMemo(() => {
    if (!playing || results.length < 2) return [];
    const i = Math.max(0, results.findIndex((c) => channelKey(c) === channelKey(playing)));
    const out = [];
    for (let s = 1; s <= Math.min(UP_NEXT, results.length - 1); s++) {
      out.push(results[(i + s) % results.length]);
    }
    return out;
  }, [playing, results]);

  // ---- render --------------------------------------------------------------
  const showSearchSuggestions = searchFocused && !query && recentSearches.length > 0;
  const quickCats = facets.category.slice(0, QUICK_CHIPS);
  const activeCats = selected.category || [];
  const heading = view === VIEW_FAVORITES ? 'Favorites'
    : view === VIEW_RECENT ? 'Recently watched'
    : query.trim() ? `Results for “${query.trim()}”`
    : activeChips.length ? activeChips.map((c) => c.value).join(' · ')
    : 'All channels';
  const isHome = view === VIEW_ALL && !query && !activeChips.length;
  const resume = isHome ? recent[0] : null;
  const ThemeIcon = THEMES[prefs.theme] || Monitor;

  // Watching is a distinct screen, not an overlay — the browse UI unmounts so
  // nothing renders behind the video (and the grid can't steal scroll/GPU).
  if (playing) {
    return (
      <>
        <WatchScreen
          channel={playing}
          recent={recent}
          upNext={upNext}
          onBack={closePlayer}
          onPrev={results.length > 1 ? () => zap(-1) : undefined}
          onNext={results.length > 1 ? () => zap(1) : undefined}
          onPlay={play}
          favorite={isFavorite(playing)}
          onToggleFavorite={toggleFav}
          onHealth={report}
          statusOf={statusOf}
        />
        <Toast toast={toast} onDone={clearToast} />
      </>
    );
  }

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, active: view === VIEW_ALL && !menuOpen, onClick: goHome },
    { key: 'filters', label: 'Filters', icon: SlidersHorizontal, active: menuOpen, onClick: () => setMenuOpen(true), badge: activeChips.length },
    { key: 'fav', label: 'Favorites', icon: Star, active: view === VIEW_FAVORITES && !menuOpen, onClick: () => setView(VIEW_FAVORITES), badge: favorites.length },
    { key: 'recent', label: 'Recent', icon: History, active: view === VIEW_RECENT && !menuOpen, onClick: () => setView(VIEW_RECENT) },
  ];

  return (
    <div className="app">
      {/* ---------------- Header ---------------- */}
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="NOVA Live TV — home">
          <span className="brand-mark"><Tv size={20} /></span>
          <span className="brand-name">NOVA<span>Live TV</span></span>
        </button>

        <div className="search">
          <label className="field">
            <Search size={18} />
            <input
              ref={searchRef}
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => update({ query: e.target.value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) { setRecentSearches(pushRecentSearch(query)); e.currentTarget.blur(); }
                if (e.key === 'Escape') update({ query: '' });
              }}
              placeholder="Search 13,000+ channels"
              aria-label="Search channels"
            />
            {query && (
              <button className="icon-btn sm" aria-label="Clear search" onClick={() => { update({ query: '' }); searchRef.current?.focus(); }}>
                <X size={16} />
              </button>
            )}
          </label>

          {showSearchSuggestions && (
            <div className="suggest pop-in">
              <div className="suggest-head"><Clock size={13} /> Recent searches</div>
              {recentSearches.map((t) => (
                <button key={t} className="suggest-item" onMouseDown={() => update({ query: t })}>
                  <Search size={14} /> {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="top-nav" aria-label="Library">
          <button className={`pill ${view === VIEW_FAVORITES ? 'on' : ''}`} onClick={() => setView(view === VIEW_FAVORITES ? VIEW_ALL : VIEW_FAVORITES)}>
            <Star size={15} /> Favorites{favorites.length ? <em>{favorites.length}</em> : null}
          </button>
          <button className={`pill ${view === VIEW_RECENT ? 'on' : ''}`} onClick={() => setView(view === VIEW_RECENT ? VIEW_ALL : VIEW_RECENT)}>
            <History size={15} /> Recent
          </button>
        </nav>

        <button
          className="icon-btn theme-btn"
          onClick={() => setPref('theme', NEXT_THEME[prefs.theme] || 'system')}
          aria-label={`Theme: ${prefs.theme}. Switch theme`}
          title={`Theme: ${prefs.theme}`}
        >
          <ThemeIcon size={19} />
        </button>
      </header>

      {/* ---------------- Filters (sheet on phones, sidebar on desktop) ---------------- */}
      <FilterPanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        facets={facets}
        selected={selected}
        toggleFacet={toggleFacet}
        clearFacets={clearFacets}
        activeCount={activeChips.length}
        resultCount={results.length}
        hideDead={prefs.hideDead}
        onHideDead={(v) => setPref('hideDead', v)}
      />

      {/* ---------------- Main ---------------- */}
      <main className="main" ref={mainRef}>
        {status === 'ready' && view === VIEW_ALL && quickCats.length > 0 && (
          <div className="quick" role="toolbar" aria-label="Quick categories">
            <button className={`chip ${!activeCats.length ? 'on' : ''}`} onClick={() => update({ selected: { ...selected, category: [] } })}>
              All
            </button>
            {quickCats.map((c) => (
              <button
                key={c.name}
                className={`chip ${activeCats.includes(c.name) ? 'on' : ''}`}
                onClick={() => toggleFacet('category', c.name)}
                aria-pressed={activeCats.includes(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="content">
          {(stale || enriching) && (
            <div className="notice">
              <span className="live-dot" />
              {stale ? 'Showing saved channels — refreshing in the background…' : 'Loading country & language filters…'}
            </div>
          )}

          {status === 'loading' && (
            <>
              <div className="section-head"><span className="skel-line" style={{ width: 160, height: 22 }} /></div>
              <div className="grid" aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="card skel">
                    <span className="card-thumb skel-box" />
                    <span className="card-meta">
                      <span className="skel-line" style={{ width: '78%' }} />
                      <span className="skel-line" style={{ width: '46%' }} />
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {status === 'error' && (
            <div className="empty">
              <span className="empty-icon"><WifiOff size={28} /></span>
              <h2>Can’t reach the channel list</h2>
              <p>Check your connection and try again.</p>
              <button className="btn primary" onClick={() => window.location.reload()}>
                <RotateCcw size={16} /> Retry
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              {resume && (
                <button className="resume" onClick={() => play(resume)}>
                  <span className="resume-thumb">
                    {resume.logo
                      ? <img src={logoSrc(resume.logo, 120)} alt="" onError={(e) => onLogoError(e, resume.logo)} />
                      : <Tv size={22} />}
                  </span>
                  <span className="resume-text">
                    <span className="resume-label">Continue watching</span>
                    <span className="resume-name">{resume.name}</span>
                  </span>
                  <span className="resume-play"><Play size={18} fill="currentColor" /></span>
                </button>
              )}

              <div className="section-head">
                <div className="section-title">
                  <h1>{heading}</h1>
                  <span className="count"><span className="live-dot" /> {results.length.toLocaleString()} live</span>
                </div>
                <label className="sort">
                  <ArrowUpDown size={14} />
                  <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort channels">
                    {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </label>
                {(activeChips.length > 0 || view !== VIEW_ALL) && (
                  <div className="active-chips">
                    {view !== VIEW_ALL && (
                      <span className="chip on removable">
                        {view === VIEW_FAVORITES ? 'Favorites' : 'Recent'}
                        <button onClick={() => setView(VIEW_ALL)} aria-label="Clear view"><X size={13} /></button>
                      </span>
                    )}
                    {activeChips.map(({ facet, value }) => (
                      <span key={`${facet}:${value}`} className="chip on removable">
                        {value}
                        <button onClick={() => toggleFacet(facet, value)} aria-label={`Remove ${value}`}><X size={13} /></button>
                      </span>
                    ))}
                    {activeChips.length > 1 && (
                      <button className="link-btn" onClick={clearFacets}>Clear all</button>
                    )}
                  </div>
                )}
              </div>

              <AdSlot slot="grid" format="fluid" className="ad-grid" />

              {results.length > 0 ? (
                <>
                  <VirtualGrid
                    items={results}
                    scrollParent={mainRef}
                    onPlay={play}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFav}
                    statusOf={statusOf}
                  />
                </>
              ) : (
                <div className="empty">
                  <span className="empty-icon">
                    {view === VIEW_FAVORITES ? <Star size={28} /> : view === VIEW_RECENT ? <History size={28} /> : <Search size={28} />}
                  </span>
                  <h2>
                    {view === VIEW_FAVORITES ? 'No favorites yet'
                      : view === VIEW_RECENT ? 'Nothing watched yet'
                      : 'No channels found'}
                  </h2>
                  <p>
                    {view === VIEW_FAVORITES ? 'Tap the star on any channel to keep it here.'
                      : view === VIEW_RECENT ? 'Channels you watch will show up here.'
                      : query ? `Nothing matches “${query}”. Try a different name.`
                      : 'Try removing a filter or two.'}
                  </p>
                  {(activeChips.length > 0 || query || view !== VIEW_ALL) && (
                    <button className="btn" onClick={goHome}>Browse all channels</button>
                  )}
                </div>
              )}

              <MultiplexAd />
            </>
          )}
        </div>
      </main>

      {/* ---------------- Bottom navigation (phones & tablets) ---------------- */}
      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map(({ key, label, icon: Icon, active, onClick, badge }) => (
          <button key={key} className={`nav-item ${active ? 'on' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
            <span className="nav-icon">
              <Icon size={22} />
              {badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
            </span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <AnchorAd />
      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
