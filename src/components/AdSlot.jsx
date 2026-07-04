import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER, loadAdSense } from '../lib/ads';

// A single responsive AdSense display unit.
//
// Props:
//   slot   — key into SLOTS ("header" | "sidebar" | "grid")
//   format — AdSense data-ad-format ("auto" | "rectangle" | "horizontal" | ...)
//   className — extra classes for layout/placement
//
// When ads are disabled or the publisher ID hasn't been set, it renders a labeled
// placeholder that occupies the same footprint — so the layout looks right in dev.
export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const ref = useRef(null);
  const pushed = useRef(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return;

    loadAdSense().then((ok) => {
      if (cancelled || !ok || pushed.current) return;
      try {
        // eslint-disable-next-line no-undef
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
        setLive(true);
      } catch {
        /* ad blocker or not-ready — leave placeholder */
      }
    });
    return () => { cancelled = true; };
  }, []);

  const label = <span className="ad-label">Advertisement</span>;

  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) {
    return (
      <div className={`ad-slot ad-placeholder ${className}`} aria-hidden>
        {label}
        <span className="ad-placeholder-hint">Ad space</span>
      </div>
    );
  }

  return (
    <div className={`ad-slot ${live ? 'ad-live' : ''} ${className}`}>
      {label}
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOTS[slot]}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
