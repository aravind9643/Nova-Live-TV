import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';
import { X } from 'lucide-react';

const DISMISS_KEY = 'nova.anchorDismissedAt';
const DISMISS_FOR = 24 * 60 * 60 * 1000; // closing it means "not today"

const wasDismissed = () => {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_FOR; } catch { return false; }
};

// Sticky bottom anchor ad. Kept polite, especially on phones:
//  • only appears once the visitor has scrolled (engaged), never on arrival
//  • closing it keeps it closed for 24h
//  • steps aside (stays mounted, not re-requested) while `hidden` — e.g. the
//    filter sheet or the mini-player is open
export default function AnchorAd({ hidden = false, scrollRef }) {
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [engaged, setEngaged] = useState(false);
  const [state, setState] = useState('idle');

  useEffect(() => {
    if (engaged || dismissed) return;
    const el = scrollRef?.current;
    const onScroll = () => { if ((el?.scrollTop || 0) > 400) setEngaged(true); };
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => el?.removeEventListener('scroll', onScroll);
  }, [engaged, dismissed, scrollRef]);

  useEffect(() => {
    if (!engaged || !ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
      setState('live');
    } catch { /* blocked */ }
  }, [engaged]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

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
  }, [engaged]); // the <ins> only exists once the anchor has appeared

  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || dismissed || !engaged || state === 'unfilled') return null;

  return (
    <div className="anchor-ad" hidden={hidden}>
      <button
        className="anchor-ad-close"
        aria-label="Dismiss ad"
        onClick={dismiss}
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
