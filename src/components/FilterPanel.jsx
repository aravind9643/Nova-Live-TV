import { useEffect, useRef, useState } from 'react';
import { Search, X, Check, ChevronDown, SlidersHorizontal, EyeOff } from 'lucide-react';
import { FACETS } from '../lib/useCatalogue';
import { flagOf } from '../lib/flags';

// Re-opens Google's consent message (AdSense Privacy & messaging CMP).
function openPrivacySettings() {
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push(() => window.googlefc.showRevocationMessage?.());
}

// How many values to show per facet before "show all".
const FACET_PREVIEW = 10;

// One component for both shapes of the filter UI: a bottom sheet on phones and
// a persistent sidebar on desktop. Which one you get is decided purely by CSS.
export default function FilterPanel({
  open, onClose, facets, selected, toggleFacet, clearFacets, activeCount, resultCount,
  hideDead, onHideDead,
}) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const q = filter.trim().toLowerCase();
  const sheetRef = useRef(null);

  // As a phone sheet it's modal: move focus in, trap Tab inside, and hand
  // focus back to whatever opened it. (On desktop it's a plain sidebar.)
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!open || !sheet || window.matchMedia('(min-width: 1024px)').matches) return;
    const opener = document.activeElement;
    const focusables = () => [...sheet.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    sheet.addEventListener('keydown', onKey);
    return () => {
      sheet.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open]);

  // Drag the sheet's header down to dismiss it (phones).
  const drag = useRef(null);
  const onDragStart = (e) => { drag.current = { y: e.touches[0].clientY, dy: 0 }; };
  const onDragMove = (e) => {
    if (!drag.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.translate = `0 ${drag.current.dy}px`;
    }
  };
  const onDragEnd = () => {
    const dy = drag.current?.dy || 0;
    drag.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.translate = '';
    }
    if (dy > 90) onClose();
  };

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'show' : ''}`} onClick={onClose} aria-hidden />

      <aside
        ref={sheetRef}
        id="filters"
        className={`filters ${open ? 'open' : ''}`}
        aria-label="Filters"
        aria-modal={open || undefined}
        role={open ? 'dialog' : undefined}
      >
        <div className="sheet-drag" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="sheet-grip" aria-hidden />
          <div className="filters-head">
            <h2><SlidersHorizontal size={17} /> Filters</h2>
            {activeCount > 0 && (
              <button className="link-btn" onClick={clearFacets}>Reset ({activeCount})</button>
            )}
            <button className="icon-btn filters-close" aria-label="Close filters" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <label className="field filters-search">
          <Search size={16} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a category, country, language…"
            aria-label="Filter options"
          />
          {filter && (
            <button className="icon-btn sm" aria-label="Clear" onClick={() => setFilter('')}><X size={14} /></button>
          )}
        </label>

        <div className="filters-body">
          <label className="switch-row">
            <EyeOff size={16} />
            <span>Hide broken streams</span>
            <input type="checkbox" className="switch" checked={hideDead} onChange={(e) => onHideDead(e.target.checked)} />
          </label>

          {Object.entries(FACETS).map(([facet, { plural }]) => {
            const all = facets[facet] || [];
            const active = selected[facet] || [];
            const matching = q ? all.filter((v) => v.name.toLowerCase().includes(q)) : all;
            if (!matching.length) return null;

            // Selected values float to the top so they're never lost in a long list.
            const ordered = active.length
              ? [...matching].sort((a, b) => active.includes(b.name) - active.includes(a.name))
              : matching;
            const isCollapsed = collapsed[facet] && !q;
            const showAll = expanded[facet] || !!q;
            const shown = showAll ? ordered : ordered.slice(0, FACET_PREVIEW);

            return (
              <section key={facet} className="facet">
                <button
                  className="facet-head"
                  onClick={() => setCollapsed((p) => ({ ...p, [facet]: !p[facet] }))}
                  aria-expanded={!isCollapsed}
                >
                  <span className="facet-title">{plural}</span>
                  {active.length > 0 && <span className="badge">{active.length}</span>}
                  <span className="facet-total">{matching.length}</span>
                  <ChevronDown size={16} className={`caret ${isCollapsed ? 'up' : ''}`} />
                </button>

                {!isCollapsed && (
                  <>
                    <div className="facet-list">
                      {shown.map((v) => {
                        const on = active.includes(v.name);
                        return (
                          <button
                            key={v.name}
                            className={`facet-item ${on ? 'on' : ''}`}
                            onClick={() => toggleFacet(facet, v.name)}
                            aria-pressed={on}
                          >
                            <span className="check">{on && <Check size={12} strokeWidth={3} />}</span>
                            <span className="facet-name">
                              {facet === 'country' && flagOf(v.name) && (
                                <img className="flag" src={flagOf(v.name)} alt="" loading="lazy" width="16" height="12" />
                              )}
                              {v.name}
                            </span>
                            <em>{v.count.toLocaleString()}</em>
                          </button>
                        );
                      })}
                    </div>
                    {!q && ordered.length > FACET_PREVIEW && (
                      <button className="link-btn facet-more" onClick={() => setExpanded((p) => ({ ...p, [facet]: !p[facet] }))}>
                        {showAll ? 'Show less' : `Show all ${ordered.length.toLocaleString()}`}
                      </button>
                    )}
                  </>
                )}
              </section>
            );
          })}

          <p className="filters-foot">
            Streams by iptv-org · free &amp; open
            {' · '}
            <button className="link-btn inline" onClick={openPrivacySettings}>Privacy settings</button>
          </p>
        </div>

        {/* Phone-only sticky action: shows the live result count. */}
        <div className="filters-apply">
          <button className="btn primary block" onClick={onClose}>
            Show {resultCount.toLocaleString()} channels
          </button>
        </div>
      </aside>
    </>
  );
}
