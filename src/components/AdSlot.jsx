import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER, loadAdSense, schedulePush } from '../lib/ads';

// AdSense display unit component.
export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const boxRef = useRef(null);
  const pushed = useRef(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;
    let cancelled = false;

    loadAdSense().then((ok) => {
      if (cancelled || !ok || pushed.current) return;

      schedulePush(() => {
        if (cancelled || pushed.current) return;
        const box = boxRef.current;
        if (!box || box.clientWidth < 50) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
          setLive(true);
        } catch {
          /* ad blocker or push error */
        }
      });
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
    <div ref={boxRef} className={`ad-slot ${live ? 'ad-live' : ''} ${className}`}>
      {label}
      <ins
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
