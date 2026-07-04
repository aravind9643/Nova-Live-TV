// ---------------------------------------------------------------------------
// Google AdSense configuration.
//
// SETUP (once your AdSense account is approved):
//   1. Replace PUBLISHER_ID with your real "ca-pub-XXXXXXXXXXXXXXXX" client ID.
//   2. In your AdSense dashboard create three display ad units and paste each
//      unit's data-ad-slot number into SLOTS below.
//   3. Set ENABLED to true (or via env: VITE_ADS=1).
//
// Until then ENABLED stays false and AdSlot renders a labeled placeholder, so
// development stays ad-free and nothing calls Google.
//
// NOTE: AdSense requires that the site's content complies with its program
// policies. Streaming third-party video you don't own the rights to can violate
// those policies — verify your usage is authorized before going live.
// ---------------------------------------------------------------------------

// All values are read from the environment (see .env / .env.example), with the
// literals below as fallbacks. In Vite, env vars must be prefixed with VITE_.
const env = import.meta.env;

export const PUBLISHER_ID = env.VITE_ADSENSE_CLIENT || 'ca-pub-9316330718026325';

export const SLOTS = {
  header: env.VITE_ADSENSE_SLOT_HEADER || '0000000000',   // leaderboard / banner under the header
  sidebar: env.VITE_ADSENSE_SLOT_SIDEBAR || '0000000000', // square/vertical unit in the sidebar-drawer
  grid: env.VITE_ADSENSE_SLOT_GRID || '0000000000',       // in-feed unit inside the channel grid
};

// Master switch. Off by default; flip via env (VITE_ADS=1) or hardcode true.
export const ADS_ENABLED = env.VITE_ADS === '1' || env.VITE_ADS === 'true';

// A publisher ID is only valid once the placeholder "X" template is replaced.
export const HAS_REAL_PUBLISHER = !PUBLISHER_ID.includes('X');

// Inject the AdSense loader script once, lazily, only when ads are enabled and
// a real publisher ID is set. Safe to call multiple times.
let loaderPromise = null;
export function loadAdSense() {
  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return Promise.resolve(false);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-adsbygoogle-loader]');
    if (existing) return resolve(true);

    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
    s.setAttribute('data-adsbygoogle-loader', '');
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return loaderPromise;
}
