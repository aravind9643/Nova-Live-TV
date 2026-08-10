import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER } from '../lib/ads';

// Fixed heights per placement. AdSense stamps `height: auto !important` on both
// the slot and the <ins>, so CSS alone cannot contain an unfilled unit — we set
// the height inline (also with !important) and re-assert it if Google overwrites.
const SIZE = { header: 100, grid: 250, sidebar: 120, player: 120 };

export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const boxRef = useRef(null);
  const insRef = useRef(null);
  const pushed = useRef(false);
  const [state, setState] = useState('idle'); // idle | live | unfilled

  const height = SIZE[slot] ?? 200;

  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
      setState('live');
    } catch {
      /* blocked — leave as idle */
    }
  }, []);

  // Watch the unit: AdSense marks it data-ad-status="unfilled" when there's no
  // ad to show (localhost, unapproved site, no inventory). Collapse it then, and
  // keep re-applying our height whenever Google rewrites the style attribute.
  useEffect(() => {
    const ins = insRef.current;
    if (!ins || !ADS_ENABLED || !HAS_REAL_PUBLISHER) return;

    const enforce = () => {
      if (ins.getAttribute('data-ad-status') === 'unfilled') {
        setState('unfilled');
        return;
      }
      if (ins.style.height === 'auto' || ins.style.maxHeight === 'none') {
        ins.style.setProperty('height', `${height}px`, 'important');
        ins.style.setProperty('max-height', `${height}px`, 'important');
      }
      const box = boxRef.current;
      if (box && (box.style.height === 'auto' || box.style.maxHeight === 'none')) {
        box.style.removeProperty('height');
        box.style.removeProperty('min-height');
        box.style.removeProperty('max-height');
      }
    };

    enforce();
    const mo = new MutationObserver(enforce);
    mo.observe(ins, { attributes: true, attributeFilter: ['style', 'data-ad-status'] });
    if (boxRef.current) mo.observe(boxRef.current, { attributes: true, attributeFilter: ['style'] });

    // Give Google a few seconds; if it never fills, collapse.
    const t = setTimeout(() => {
      if (ins.getAttribute('data-ad-status') !== 'filled') setState((s) => (s === 'live' ? 'unfilled' : s));
    }, 6000);

    return () => { mo.disconnect(); clearTimeout(t); };
  }, [height]);

  const label = <span className="ad-label">Advertisement</span>;

  // Placeholder when ads are off / not configured.
  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) {
    return (
      <div className={`ad-slot ad-placeholder ${className}`} aria-hidden style={{ height }}>
        {label}
        <span className="ad-placeholder-hint">Ad space</span>
      </div>
    );
  }

  // No ad returned — render nothing rather than a large empty box.
  if (state === 'unfilled') return null;

  return (
    <div ref={boxRef} className={`ad-slot ${state === 'live' ? 'ad-live' : ''} ${className}`}>
      {label}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: `${height}px` }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={SLOTS[slot]}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
