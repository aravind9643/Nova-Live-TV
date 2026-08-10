import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';
import { X } from 'lucide-react';

// Sticky bottom anchor ad — hugs the viewport bottom edge, dismissible.
// Re-appears when the user scrolls to a new section (after 60 s cooldown).
export default function AnchorAd() {
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState('idle');

  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;
    // Delay pushing the anchor ad so it doesn't compete with above-the-fold ads.
    const t = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
        setState('live');
      } catch { /* blocked */ }
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Watch for unfilled status
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

  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || dismissed || state === 'unfilled') return null;

  return (
    <div className="anchor-ad">
      <button
        className="anchor-ad-close"
        aria-label="Dismiss ad"
        onClick={() => setDismissed(true)}
      >
        <X size={14} />
      </button>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '60px' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOTS.anchor}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}
