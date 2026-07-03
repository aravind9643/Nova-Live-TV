import { useMemo, useState, useDeferredValue, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import {
  Search, Tv, WifiOff, Newspaper, Film, Trophy, Music, Baby,
  Radio, Globe, Clapperboard, Gamepad2, GraduationCap, Church, Landmark,
  Sparkles, ShoppingBag, Utensils, Plane, FlaskConical, Star, History, Menu, X,
} from 'lucide-react';
import { useChannels, AXES } from './lib/useChannels';
import { useLibrary, channelKey } from './lib/useLibrary';
import { useHashState } from './lib/useHashState';
import VirtualGrid from './components/VirtualGrid';

// Code-split the player so hls.js only downloads when the first channel is opened.
const Player = lazy(() => import('./components/Player'));

const FAVORITES = '__favorites__';
const RECENT = '__recent__';

const GROUP_ICONS = {
  News: Newspaper, Movies: Film, Sports: Trophy, Music, Kids: Baby,
  General: Tv, Entertainment: Clapperboard, Documentary: FlaskConical,
  Education: GraduationCap, Religious: Church, Business: Landmark,
  Lifestyle: Sparkles, Shop: ShoppingBag, Cooking: Utensils, Travel: Plane,
  Animation: Film, Series: Clapperboard, Comedy: Sparkles, Culture: Globe,
  Family: Baby, Games: Gamepad2, Legislative: Landmark, Outdoor: Plane,
  Relax: Sparkles, Science: FlaskConical, Weather: Globe, Auto: Plane,
};
const iconFor = (name) => GROUP_ICONS[name] || Radio;

export default function App() {
  const [hash, setHash] = useHashState();
  const { axis, group: activeGroup } = hash;
  const { status, channels, groups } = useChannels(axis);
  const { favorites, recent, isFavorite, toggleFavorite, pushRecent } = useLibrary();

  const [query, setQuery] = useState('');       // channel search (header)
  const [menuFilter, setMenuFilter] = useState(''); // filters the group list inside the menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(null);
  const deferredQuery = useDeferredValue(query);
  const mainRef = useRef(null);

  const source = activeGroup === FAVORITES ? favorites
    : activeGroup === RECENT ? recent
    : channels;

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const isVirtual = activeGroup === FAVORITES || activeGroup === RECENT;
    return source.filter((c) => {
      const inGroup = isVirtual || activeGroup === 'All' || c.groups?.includes(activeGroup);
      const match = !q || c.name.toLowerCase().includes(q) || (c.group || '').toLowerCase().includes(q);
      return inGroup && match;
    });
  }, [source, activeGroup, deferredQuery]);

  // Groups filtered by the in-menu search box.
  const menuGroups = useMemo(() => {
    const q = menuFilter.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, menuFilter]);

  // Resolve a ?play=<url> deep-link once channels/library are available.
  useEffect(() => {
    if (!hash.play || playing) return;
    const pool = [...channels, ...favorites, ...recent];
    const found = pool.find((c) => channelKey(c) === hash.play);
    if (found) setPlaying(found);
  }, [hash.play, channels, favorites, recent, playing]);

  // Close the mobile drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const setGroup = useCallback((g) => { setHash({ group: g }); setMenuOpen(false); }, [setHash]);

  const play = useCallback((c) => {
    setPlaying(c);
    setHash({ play: channelKey(c) });
  }, [setHash]);

  const closePlayer = useCallback(() => {
    setPlaying(null);
    setHash({ play: null });
  }, [setHash]);

  const zap = useCallback((dir) => {
    if (!playing) return;
    const idx = filtered.findIndex((c) => channelKey(c) === channelKey(playing));
    if (idx === -1) return;
    const next = filtered[(idx + dir + filtered.length) % filtered.length];
    if (next) play(next);
  }, [playing, filtered, play]);

  const switchAxis = (a) => setHash({ axis: a, group: 'All' });

  return (
    <div className={`app ${playing ? 'playing' : ''}`}>
      <div className="bg-orbs" aria-hidden>
        <span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" />
      </div>

      {/* ---------- Top header ---------- */}
      <header className="appbar">
        <button
          className="hamburger"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} />
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels…"
            aria-label="Search channels"
          />
          {query && <button className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}><X size={16} /></button>}
        </div>

        <div className="topbar-meta">
          <span className="live-dot" />
          <span className="meta-text">{status === 'ready' ? `${filtered.length.toLocaleString()} channels` : 'Loading…'}</span>
        </div>
      </header>

      {/* ---------- Sidebar / drawer ---------- */}
      {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <span className="sidebar-title">Browse</span>
          <button className="drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>

        {/* Axis switcher */}
        <div className="axis-tabs" role="tablist" aria-label="Browse by">
          {Object.entries(AXES).map(([key, { label }]) => (
            <button
              key={key}
              role="tab"
              aria-selected={axis === key}
              className={`axis-tab ${axis === key ? 'active' : ''}`}
              onClick={() => switchAxis(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* In-menu search over the group list */}
        <div className="menu-search">
          <Search size={16} />
          <input
            value={menuFilter}
            onChange={(e) => setMenuFilter(e.target.value)}
            placeholder={`Filter ${AXES[axis].label.toLowerCase()}…`}
            aria-label="Filter groups"
          />
        </div>

        <nav className="groups">
          {favorites.length > 0 && !menuFilter && (
            <button className={`group-item accent ${activeGroup === FAVORITES ? 'active' : ''}`} onClick={() => setGroup(FAVORITES)}>
              <Star size={18} /><span>Favorites</span><em>{favorites.length}</em>
            </button>
          )}
          {recent.length > 0 && !menuFilter && (
            <button className={`group-item ${activeGroup === RECENT ? 'active' : ''}`} onClick={() => setGroup(RECENT)}>
              <History size={18} /><span>Recently watched</span><em>{recent.length}</em>
            </button>
          )}
          {!menuFilter && (
            <button className={`group-item ${activeGroup === 'All' ? 'active' : ''}`} onClick={() => setGroup('All')}>
              <Globe size={18} /><span>All Channels</span><em>{channels.length}</em>
            </button>
          )}
          {menuGroups.map((g) => {
            const Icon = iconFor(g.name);
            return (
              <button key={g.name} className={`group-item ${activeGroup === g.name ? 'active' : ''}`} onClick={() => setGroup(g.name)}>
                <Icon size={18} /><span>{g.name}</span><em>{g.count}</em>
              </button>
            );
          })}
          {menuFilter && menuGroups.length === 0 && (
            <div className="menu-empty">No {AXES[axis].label.toLowerCase()} matches “{menuFilter}”.</div>
          )}
        </nav>
        <div className="sidebar-foot">Streams by iptv-org · free &amp; open</div>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="main" ref={mainRef}>
        {status === 'loading' && (
          <div className="grid skeleton-grid" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="card skel">
                <div className="card-thumb skel-box" />
                <div className="card-meta">
                  <span className="skel-line" style={{ width: '80%' }} />
                  <span className="skel-line" style={{ width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {status === 'error' && (
          <div className="center-state"><WifiOff size={44} /><p>Couldn't load the playlist. Check your connection and refresh.</p></div>
        )}

        {status === 'ready' && (
          <>
            <section className="hero fade-in">
              <div className="hero-glow" />
              <div className="hero-inner">
                {activeGroup !== 'All' && (
                  <span className="hero-badge">{
                    activeGroup === FAVORITES ? 'Your Favorites'
                      : activeGroup === RECENT ? 'Recently Watched'
                      : activeGroup
                  }</span>
                )}
                <h1>Thousands of channels.<br />One click away.</h1>
                <p>Zap through global live TV — news, sports, movies and more — in glorious real time.</p>
              </div>
            </section>

            {filtered.length > 0 ? (
              <VirtualGrid
                items={filtered}
                scrollParent={mainRef}
                onPlay={play}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <div className="center-state small">
                <p>{activeGroup === FAVORITES ? 'No favorites yet — tap the ★ on any channel.'
                  : activeGroup === RECENT ? 'Nothing watched yet.'
                  : `No channels match “${query}”.`}</p>
              </div>
            )}
          </>
        )}
      </main>

      {playing && (
        <Suspense fallback={null}>
          <Player
            channel={playing}
            onClose={closePlayer}
            onPrev={filtered.length > 1 ? () => zap(-1) : undefined}
            onNext={filtered.length > 1 ? () => zap(1) : undefined}
            favorite={isFavorite(playing)}
            onToggleFavorite={toggleFavorite}
            onWatched={pushRecent}
          />
        </Suspense>
      )}
    </div>
  );
}
