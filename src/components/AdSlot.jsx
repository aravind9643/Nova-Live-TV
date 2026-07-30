import { useEffect, useRef, useState } from 'react';
import { PUBLISHER_ID, SLOTS, ADS_ENABLED, HAS_REAL_PUBLISHER, loadAdSense, schedulePush } from '../lib/ads';

// A single responsive AdSense display unit.
//
// Ads are loaded LAZILY — the <ins> tag is only injected and pushed when the
// slot first scrolls into the viewport. This avoids heavy main-thread work on
// page load and prevents AdSense iframes from freezing scrolling.
//
// A transparent overlay sits on top of the ad. It lets scroll/touch events pass
// through to the scroll container but becomes click-transparent when the user
// taps, so the ad itself is still clickable.
export default function AdSlot({ slot = 'grid', format = 'auto', className = '' }) {
  const boxRef = useRef(null);
  const pushed = useRef(false);
  const [visible, setVisible] = useState(false); // true once the slot enters the viewport
  const [live, setLive] = useState(false);        // true once the ad push succeeds

  // Step 1: Use IntersectionObserver to detect when the slot scrolls into view.
  //         Only then do we start loading the ad.
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
      { rootMargin: '200px' } // start loading a bit before it enters view
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Step 2: Once visible, load the script and push the ad through the stagger queue.
  useEffect(() => {
    if (!visible || pushed.current) return;
    let cancelled = false;

    loadAdSense().then((ok) => {
      if (cancelled || !ok || pushed.current) return;
      schedulePush(() => {
        if (cancelled || pushed.current) return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushed.current = true;
          setLive(true);
        } catch {
          /* ad blocker or not ready */
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
      {/* Only inject the <ins> once the slot is near the viewport */}
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
      {/* Scroll-passthrough overlay: lets wheel/touch events reach the scroll
          container instead of being swallowed by the AdSense iframe. */}
      <div className="ad-scroll-guard" />
    </div>
  );
}
