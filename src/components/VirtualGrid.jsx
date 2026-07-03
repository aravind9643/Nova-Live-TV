import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChannelCard from './ChannelCard';
import { channelKey } from '../lib/useLibrary';

// Windowed grid: renders only the rows near the viewport, so a 14k-channel list
// scrolls smoothly with a near-constant DOM size. Scrolls inside `scrollParent`.
const GAP = 18;
const OVERSCAN = 4;      // extra rows above/below the viewport
const EST_ROW = 190;     // initial row-height guess until we measure a real card

// Min card width per breakpoint — since we set grid columns inline (which overrides
// any CSS media query), the responsive column logic must live here.
function minCardFor(width) {
  if (width <= 560) return Math.floor((width - GAP - 36) / 2); // exactly 2 cols on phones
  if (width <= 860) return 140;                                 // tablet
  return 168;                                                   // desktop
}

export default function VirtualGrid({ items, scrollParent, onPlay, isFavorite, onToggleFavorite }) {
  const spacerRef = useRef(null);
  const gridRef = useRef(null);
  const [cols, setCols] = useState(1);
  const [rowH, setRowH] = useState(EST_ROW);
  const [range, setRange] = useState({ start: 0, end: 40 });

  // Column count from the container's inner width (mirrors auto-fill behaviour).
  useLayoutEffect(() => {
    const el = scrollParent?.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const inner = el.clientWidth - padX;
      // Read the real column gap from the rendered grid (varies by breakpoint).
      const gap = gridRef.current ? parseFloat(getComputedStyle(gridRef.current).columnGap) || GAP : GAP;
      const minCard = minCardFor(window.innerWidth);
      const next = Math.max(1, Math.floor((inner + gap) / (minCard + gap)));
      setCols(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollParent]);

  // Measure the REAL rendered height of a card so row math never drifts.
  // Depends only on column count + list identity — NOT on scroll position, so this
  // doesn't rebuild an observer or force layout on every scroll tick.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measureRow = () => {
      const first = grid.querySelector('.card');
      if (first) {
        const h = Math.round(first.getBoundingClientRect().height + GAP);
        if (h > 40) setRowH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      }
    };
    measureRow();
    const first = grid.querySelector('.card');
    if (!first) return;
    const ro = new ResizeObserver(measureRow);
    ro.observe(first);
    return () => ro.disconnect();
  }, [cols, items]);

  const rows = Math.ceil(items.length / cols);
  const totalH = rows * rowH;

  useEffect(() => {
    const el = scrollParent?.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return;

    const compute = () => {
      const gridTop = spacer.offsetTop; // grid start relative to the scroll container
      const viewTop = el.scrollTop - gridTop;
      const startRow = Math.max(0, Math.floor(viewTop / rowH) - OVERSCAN);
      const visibleRows = Math.ceil(el.clientHeight / rowH) + OVERSCAN * 2;
      const start = startRow * cols;
      const end = Math.min(items.length, (startRow + visibleRows) * cols);
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    // rAF-throttle: at most one recompute per frame no matter how many scroll events fire.
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

  const slice = items.slice(range.start, range.end);
  const offsetY = Math.floor(range.start / cols) * rowH;

  return (
    <div ref={spacerRef} style={{ position: 'relative', height: totalH }}>
      <div
        ref={gridRef}
        className="grid"
        style={{
          position: 'absolute',
          top: offsetY,
          left: 0,
          right: 0,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {slice.map((c) => (
          <ChannelCard
            key={channelKey(c)}
            channel={c}
            onPlay={onPlay}
            favorite={isFavorite(c)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}
