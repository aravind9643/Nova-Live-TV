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
