import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChannelCard from './ChannelCard';
import { channelKey } from '../lib/useLibrary';

// Windowed grid: renders only the rows near the viewport, so a 14k-channel list
// scrolls smoothly with a near-constant DOM size. Scrolls inside `scrollParent`.
//
// Layout is owned entirely by CSS (`.grid` + its media queries). This component
// *reads* the resulting column count / row height from the DOM rather than
// imposing its own, so the responsive design stays in one place: the stylesheet.
const OVERSCAN = 4;      // extra rows rendered above/below the viewport
const EST_ROW = 180;     // fallback row height until a real card is measured
const MAX_RENDERED = 200; // absolute cap on simultaneously-mounted cards

export default function VirtualGrid({ items, scrollParent, onPlay, isFavorite, onToggleFavorite, statusOf }) {
  const spacerRef = useRef(null);
  const gridRef = useRef(null);
  const [metrics, setMetrics] = useState({ cols: 2, rowH: EST_ROW });
  const [range, setRange] = useState({ start: 0, end: 40 });

  // Read the real column count + row height that CSS produced.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const cs = getComputedStyle(grid);
      // `gridTemplateColumns` reads "none" when the grid is detached/hidden
      // (e.g. while an ad iframe reflows). That parses to 1 column, which makes
      // the window math render EVERY row — a multi-second main-thread freeze.
      // Only trust a value that actually looks like a track list.
      const raw = cs.gridTemplateColumns;
      const tracks = raw && raw !== 'none' ? raw.split(' ').filter(Boolean).length : 0;

      const rowGap = parseFloat(cs.rowGap) || 0;
      const card = grid.querySelector('.card');
      const cardH = card ? card.getBoundingClientRect().height : 0;

      setMetrics((prev) => {
        // Keep the last good reading rather than accepting a degenerate one.
        const cols = tracks > 0 ? tracks : prev.cols;
        const rowH = cardH > 20 ? Math.round(cardH + rowGap) : prev.rowH || EST_ROW;
        return prev.cols === cols && Math.abs(prev.rowH - rowH) <= 1 ? prev : { cols, rowH };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    const card = grid.querySelector('.card');
    if (card) ro.observe(card);
    return () => ro.disconnect();
  }, [items]);

  const { cols, rowH } = metrics;
  const rows = Math.ceil(items.length / cols);
  const totalH = rows * rowH;

  useEffect(() => {
    const el = scrollParent?.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return;

    const compute = () => {
      // Guard against degenerate metrics: a tiny rowH or a mis-read column count
      // would otherwise blow `visibleRows` up and render the whole 13k list.
      const safeRowH = Math.max(60, rowH);
      const safeCols = Math.max(1, cols);

      const viewTop = el.scrollTop - spacer.offsetTop;
      const startRow = Math.max(0, Math.floor(viewTop / safeRowH) - OVERSCAN);
      const visibleRows = Math.ceil(el.clientHeight / safeRowH) + OVERSCAN * 2;
      const start = startRow * safeCols;

      // Hard ceiling on rendered nodes — the window should never exceed this,
      // so no future measurement bug can lock up the main thread again.
      const want = (startRow + visibleRows) * safeCols;
      const end = Math.min(items.length, want, start + MAX_RENDERED);

      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    // rAF-throttle: at most one recompute per frame however fast scroll events fire.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; compute(); });
    };

    compute();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [scrollParent, rowH, cols, items.length]);

  // Arrow-key / TV-remote navigation between cards. The target may not be
  // mounted yet (virtualised), so scroll its row into view first, then focus it
  // once the window has re-rendered.
  const onKeyDown = useCallback((e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    const card = e.target.closest?.('[data-index]');
    if (!step || !card) return;
    const to = Number(card.dataset.index) + step;
    if (to < 0 || to >= items.length) return;
    e.preventDefault();

    const focus = () => {
      const el = spacerRef.current?.querySelector(`[data-index="${to}"] .card-hit`);
      if (!el) return false;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest' });
      return true;
    };
    if (focus()) return;
    const scroller = scrollParent?.current;
    if (scroller && spacerRef.current) {
      scroller.scrollTop = spacerRef.current.offsetTop + Math.floor(to / cols) * rowH - scroller.clientHeight / 2;
    }
    requestAnimationFrame(() => requestAnimationFrame(focus));
  }, [cols, rowH, items.length, scrollParent]);

  const slice = items.slice(range.start, range.end);
  const offsetY = Math.floor(range.start / cols) * rowH;

  return (
    <div ref={spacerRef} style={{ position: 'relative', height: totalH }} onKeyDown={onKeyDown}>
      <div
        ref={gridRef}
        className="grid"
        style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}
      >
        {slice.map((c, i) => (
          <ChannelCard
            key={channelKey(c)}
            index={range.start + i}
            channel={c}
            onPlay={onPlay}
            favorite={isFavorite(c)}
            onToggleFavorite={onToggleFavorite}
            health={statusOf ? statusOf(c.url) : 'unknown'}
          />
        ))}
      </div>
    </div>
  );
}
