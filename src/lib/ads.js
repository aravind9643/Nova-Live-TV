// ---------------------------------------------------------------------------
// Google AdSense configuration.
// ---------------------------------------------------------------------------

const env = import.meta.env;

export const PUBLISHER_ID = env.VITE_ADSENSE_CLIENT || 'ca-pub-9316330718026325';

export const SLOTS = {
  header: env.VITE_ADSENSE_SLOT_HEADER || '6471680207',
  sidebar: env.VITE_ADSENSE_SLOT_SIDEBAR || '9594491395',
  grid: env.VITE_ADSENSE_SLOT_GRID || '6124231238',
};

export const ADS_ENABLED = env.VITE_ADS === '1' || env.VITE_ADS === 'true';
export const HAS_REAL_PUBLISHER = !PUBLISHER_ID.includes('X');

let loaderPromise = null;

export function loadAdSense() {
  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return Promise.resolve(false);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve) => {
    if (window.adsbygoogle) return resolve(true);

    const existing = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      // If already loaded
      if (existing.complete || window.adsbygoogle) resolve(true);
      return;
    }

    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return loaderPromise;
}
