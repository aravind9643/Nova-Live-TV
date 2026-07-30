import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';

// AdSense display unit component.
export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const boxRef = useRef(null);
  const pushed = useRef(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;

    // Google AdSense is designed to accept .push({}) immediately onto window.adsbygoogle array,
    // even before adsbygoogle.js finishes downloading asynchronously.
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
      setLive(true);
    } catch {
      /* ad blocker or error */
    }
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
