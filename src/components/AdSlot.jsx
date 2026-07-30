import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER, loadAdSense, schedulePush } from '../lib/ads';

// Lazy-loaded AdSense display unit.
//
// Loading sequence:
//   1. IntersectionObserver detects the slot is near the viewport
//   2. loadAdSense() waits for page-ready + cooldown + idle, then loads the script
//   3. schedulePush() queues the push with 3s stagger between ads
//   4. The push only fires if the container has a real width (≥ 50px)
export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const boxRef = useRef(null);
  const pushed = useRef(false);
  const [visible, setVisible] = useState(false);
  const [live, setLive] = useState(false);

  // Detect when slot enters viewport
  useEffect(() => {
    if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return;
    const el = boxRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Load + push once visible
  useEffect(() => {
    if (!visible || pushed.current) return;
    let cancelled = false;

    loadAdSense().then((ok) => {
      if (cancelled || !ok || pushed.current) return;

      schedulePush(() => {
        if (cancelled || pushed.current) return;
        // Only push if the container has a real width
        const box = boxRef.current;
        if (!box || box.clientWidth < 50) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
          setLive(true);
        } catch {
          /* ad blocker */
        }
      });
    });

    return () => { cancelled = true; };
  }, [visible]);

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
      {visible && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={PUBLISHER_ID}
          data-ad-slot={SLOTS[slot]}
          data-ad-format={format}
          data-ad-loading="lazy"
          data-full-width-responsive="false"
        />
      )}
      <div className="ad-scroll-guard" />
    </div>
  );
}
