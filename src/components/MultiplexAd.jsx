import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';

// Multiplex ad — a grid of sponsored content recommendations that sits
// below the channel list. Uses IntersectionObserver so it only loads when
// the user scrolls near the bottom.
export default function MultiplexAd() {
  const containerRef = useRef(null);
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [state, setState] = useState('idle');

  // Lazy-load: only push() when near the viewport.
  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !pushed.current) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushed.current = true;
            setState('live');
          } catch { /* blocked */ }
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins || !ADS_ENABLED || !HAS_REAL_PUBLISHER) return;
    const check = () => {
      if (ins.getAttribute('data-ad-status') === 'unfilled') setState('unfilled');
    };
    const mo = new MutationObserver(check);
    mo.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    const t = setTimeout(check, 8000);
    return () => { mo.disconnect(); clearTimeout(t); };
  }, []);

  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return null;
  if (state === 'unfilled') return null;

  return (
    <div ref={containerRef} className="ad-slot ad-multiplex">
      <span className="ad-label">Sponsored</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOTS.multiplex}
        data-ad-format="autorelaxed"
      />
    </div>
  );
}
