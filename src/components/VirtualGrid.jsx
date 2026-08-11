import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChannelCard from './ChannelCard';
import InFeedAd from './InFeedAd';
import { channelKey } from '../lib/useLibrary';
import { ADS_ENABLED, IN_FEED_INTERVAL } from '../lib/ads';

// Windowed grid: renders only the rows near the viewport, so a 14k-channel list
// scrolls smoothly with a near-constant DOM size. Scrolls inside `scrollParent`.
//
// In-feed ads are injected every IN_FEED_INTERVAL items. They render as full-width
// rows that break the grid flow, sitting *between* grid chunks.
//
// Layout is owned entirely by CSS (`.grid` + its media queries). This component
// *reads* the resulting column count / row height from the DOM rather than
// imposing its own, so the responsive design stays in one place: the stylesheet.
const OVERSCAN = 4;      // extra rows rendered above/below the viewport
const EST_ROW = 180;     // fallback row height until a real card is measured
const MAX_RENDERED = 200; // absolute cap on simultaneously-mounted cards
const AD_ROW_HEIGHT = 280; // estimated height of an in-feed ad row

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
      const raw = cs.gridTemplateColumns;
      const tracks = raw && raw !== 'none' ? raw.split(' ').filter(Boolean).length : 0;

      const rowGap = parseFloat(cs.rowGap) || 0;
      const card = grid.querySelector('.card');
      const cardH = card ? card.getBoundingClientRect().height : 0;

      setMetrics((prev) => {
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

  // Build a layout map: chunks of channel rows separated by ad rows.
  // Each "segment" is IN_FEED_INTERVAL items, followed by an ad row.
  const segments = [];
  const showInFeed = ADS_ENABLED && items.length > IN_FEED_INTERVAL;

  if (showInFeed) {
    for (let i = 0; i < items.length; i += IN_FEED_INTERVAL) {
      const chunk = items.slice(i, i + IN_FEED_INTERVAL);
      const chunkRows = Math.ceil(chunk.length / cols);
      segments.push({ type: 'channels', start: i, count: chunk.length, rows: chunkRows });
      // Add an ad row after each segment (except possibly the last if very few items remain)
      if (i + IN_FEED_INTERVAL < items.length) {
        segments.push({ type: 'ad', adIndex: Math.floor(i / IN_FEED_INTERVAL) });
      }
    }
  } else {
    segments.push({ type: 'channels', start: 0, count: items.length, rows: Math.ceil(items.length / cols) });
  }

  // Calculate total height including ad rows.
  let totalH = 0;
  const segmentOffsets = [];
  for (const seg of segments) {
    segmentOffsets.push(totalH);
    if (seg.type === 'channels') {
      totalH += seg.rows * rowH;
    } else {
      totalH += AD_ROW_HEIGHT;
    }
  }

  useEffect(() => {
    const el = scrollParent?.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return;

    const compute = () => {
      const safeRowH = Math.max(60, rowH);
      const safeCols = Math.max(1, cols);

      const viewTop = el.scrollTop - spacer.offsetTop;
      const startRow = Math.max(0, Math.floor(viewTop / safeRowH) - OVERSCAN);
      const visibleRows = Math.ceil(el.clientHeight / safeRowH) + OVERSCAN * 2;
      const start = startRow * safeCols;

      const want = (startRow + visibleRows) * safeCols;
      const end = Math.min(items.length, want, start + MAX_RENDERED);

      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

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

  // If no in-feed ads, use the simple flat layout for best performance.
  if (!showInFeed) {
    const slice = items.slice(range.start, range.end);
    const offsetY = Math.floor(range.start / cols) * rowH;
    return (
      <div ref={spacerRef} style={{ position: 'relative', height: totalH }}>
        <div
          ref={gridRef}
          className="grid"
          style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}
        >
          {slice.map((c) => (
            <ChannelCard
              key={channelKey(c)}
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

  // With in-feed ads: render visible segments + ad dividers.
  return (
    <div ref={spacerRef} style={{ position: 'relative', height: totalH }}>
      {segments.map((seg, si) => {
        const top = segmentOffsets[si];

        if (seg.type === 'ad') {
          // Only render if within (or near) the visible viewport.
          const viewTop = (range.start / cols) * rowH;
          const viewBot = viewTop + (typeof window !== 'undefined' ? window.innerHeight : 900) + rowH * OVERSCAN;
          if (top > viewBot + 200 || top + AD_ROW_HEIGHT < viewTop - 200) return null;

          return (
            <div key={`ad-${seg.adIndex}`} style={{ position: 'absolute', top, left: 0, right: 0 }}>
              <InFeedAd index={seg.adIndex} />
            </div>
          );
        }

        // Channel chunk.
        const segStart = Math.max(seg.start, range.start);
        const segEnd = Math.min(seg.start + seg.count, range.end);
        if (segStart >= segEnd) return null;

        const localStart = segStart - seg.start;
        const offsetY = top + Math.floor(localStart / cols) * rowH;
        const slice = items.slice(segStart, segEnd);

        return (
          <div
            key={`seg-${si}`}
            ref={si === 0 ? gridRef : undefined}
            className="grid"
            style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}
          >
            {slice.map((c) => (
              <ChannelCard
                key={channelKey(c)}
                channel={c}
                onPlay={onPlay}
                favorite={isFavorite(c)}
                onToggleFavorite={onToggleFavorite}
                health={statusOf ? statusOf(c.url) : 'unknown'}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
