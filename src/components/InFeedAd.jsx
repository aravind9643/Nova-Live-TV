import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';

// In-feed ad: a full-width horizontal ad that sits between rows of channel
// cards inside the virtual grid. Styled to blend with the grid gap rhythm.
export default function InFeedAd({ index }) {
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [state, setState] = useState('idle');

  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;
    // Stagger pushes slightly so multiple in-feed ads don't all fire at once.
    const delay = 500 + index * 800;
    const t = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
        setState('live');
      } catch { /* blocked */ }
    }, delay);
    return () => clearTimeout(t);
  }, [index]);

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
    <div className="ad-slot ad-infeed">
      <span className="ad-label">Sponsored</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '260px' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOTS.infeed}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
