// ---------------------------------------------------------------------------
// Google AdSense configuration.
//
// NOTE: AdSense requires that the site's content complies with its program
// policies. Streaming third-party video you don't own the rights to can violate
// those policies — verify your usage is authorized before going live.
// ---------------------------------------------------------------------------

const env = import.meta.env;

export const PUBLISHER_ID = env.VITE_ADSENSE_CLIENT || 'ca-pub-9316330718026325';

export const SLOTS = {
  header: env.VITE_ADSENSE_SLOT_HEADER || '0000000000',
  sidebar: env.VITE_ADSENSE_SLOT_SIDEBAR || '0000000000',
  grid: env.VITE_ADSENSE_SLOT_GRID || '0000000000',
};

export const ADS_ENABLED = env.VITE_ADS === '1' || env.VITE_ADS === 'true';
export const HAS_REAL_PUBLISHER = !PUBLISHER_ID.includes('X');

// ---------------------------------------------------------------------------
// VERY lazy script loader.
//
// We do NOT put the <script> in index.html. Instead we inject it only after:
//   1. The window has fully loaded (images, fonts, etc.)
//   2. An additional 3-second cool-down so the UI is buttery smooth first
//   3. Then we wait for an idle callback before actually injecting
//
// This keeps the initial page load completely free of AdSense overhead.
// ---------------------------------------------------------------------------
let loaderPromise = null;

function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      // Page already loaded — add a cooldown
      setTimeout(resolve, 3000);
    } else {
      window.addEventListener('load', () => setTimeout(resolve, 3000), { once: true });
    }
  });
}

function whenIdle(fn) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, { timeout: 5000 });
  } else {
    setTimeout(fn, 100);
  }
}

export function loadAdSense() {
  if (!ADS_ENABLED || !HAS_REAL_PUBLISHER) return Promise.resolve(false);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve) => {
    waitForPageReady().then(() => {
      whenIdle(() => {
        const existing = document.querySelector('script[src*="adsbygoogle.js"]');
        if (existing) return resolve(true);

        const s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    });
  });
  return loaderPromise;
}

// ---------------------------------------------------------------------------
// Staggered push queue — one ad at a time, 3s apart, always during idle.
// ---------------------------------------------------------------------------
const STAGGER_MS = 3000;
let queue = [];
let draining = false;

function drainQueue() {
  if (draining || queue.length === 0) return;
  draining = true;
  const next = queue.shift();
  whenIdle(() => {
    next();
    draining = false;
    if (queue.length > 0) setTimeout(drainQueue, STAGGER_MS);
  });
}

export function schedulePush(fn) {
  queue.push(fn);
  if (!draining) drainQueue();
}
