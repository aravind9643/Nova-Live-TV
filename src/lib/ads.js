// ---------------------------------------------------------------------------
// Google AdSense configuration.
// ---------------------------------------------------------------------------

const env = import.meta.env;

export const PUBLISHER_ID = env.VITE_ADSENSE_CLIENT || 'ca-pub-9316330718026325';

export const SLOTS = {
  header:    env.VITE_ADSENSE_SLOT_HEADER   || '6471680207',
  sidebar:   env.VITE_ADSENSE_SLOT_SIDEBAR  || '9594491395',
  grid:      env.VITE_ADSENSE_SLOT_GRID     || '6124231238',
  // Reusing existing IDs until dedicated units are created in AdSense:
  infeed:    env.VITE_ADSENSE_SLOT_INFEED   || '6124231238',
  anchor:    env.VITE_ADSENSE_SLOT_ANCHOR   || '6471680207',
  multiplex: env.VITE_ADSENSE_SLOT_MULTIPLEX|| '9594491395',
  player:    env.VITE_ADSENSE_SLOT_PLAYER   || '6124231238',
};

// How many channel cards between each in-feed ad row.
export const IN_FEED_INTERVAL = 18;

// Always enable in production (Vercel) or when VITE_ADS is explicitly 1/true.
export const ADS_ENABLED = env.VITE_ADS === '1' || env.VITE_ADS === 'true' || import.meta.env.PROD;
export const HAS_REAL_PUBLISHER = !PUBLISHER_ID.includes('X');
