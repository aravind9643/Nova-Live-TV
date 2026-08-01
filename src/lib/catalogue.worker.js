// Parses and merges the IPTV playlists off the main thread.
//
// Parsing ~42k EXTINF entries and merging them blocks the main thread for
// 1-2s on a mid-range phone — long enough to freeze scrolling and stall the
// loading skeletons. Doing it here keeps the UI responsive throughout.
//
// Protocol (postMessage):
//   in : { type: 'load', base: string }
//   out: { type: 'partial', channels }  — category only, enough to render
//        { type: 'complete', channels } — enriched with country + language
//        { type: 'error', message }

import { parseM3U } from './m3u';

const FACET_FILES = {
  category: 'index.category.m3u',
  country: 'index.country.m3u',
  language: 'index.language.m3u',
};

function blankEntry(c) {
  return {
    url: c.url,
    name: c.name,
    logo: c.logo,
    quality: c.quality,
    tvgId: c.tvgId,
    flags: c.flags,
    category: [],
    country: [],
    language: [],
  };
}

function absorb(byUrl, facet, channels) {
  for (const c of channels) {
    let entry = byUrl.get(c.url);
    if (!entry) {
      entry = blankEntry(c);
      byUrl.set(c.url, entry);
    }
    if (!entry.logo && c.logo) entry.logo = c.logo;
    if (!entry.quality && c.quality) entry.quality = c.quality;
    for (const g of c.groups) {
      if (g && !entry[facet].includes(g)) entry[facet].push(g);
    }
  }
}

// Precompute the fields the UI needs so the main thread never has to.
function finalize(byUrl) {
  const out = [];
  for (const c of byUrl.values()) {
    c.search = `${c.name} ${c.category.join(' ')} ${c.country.join(' ')}`.toLowerCase();
    c.primary = c.category[0] || c.country[0] || 'Other';
    out.push(c);
  }
  return out;
}

async function fetchFacet(base, facet) {
  const res = await fetch(`${base}/${FACET_FILES[facet]}`);
  if (!res.ok) throw new Error(`${facet}: HTTP ${res.status}`);
  return parseM3U(await res.text());
}

self.onmessage = async (e) => {
  if (e.data?.type !== 'load') return;
  const { base } = e.data;
  const byUrl = new Map();

  try {
    // 1) Category first — it's the smallest useful slice and gives us every
    //    channel's name/logo, so the grid can render immediately.
    absorb(byUrl, 'category', await fetchFacet(base, 'category'));
    self.postMessage({ type: 'partial', channels: finalize(byUrl) });

    // 2) Enrich with country + language for combined filtering.
    const rest = await Promise.allSettled([
      fetchFacet(base, 'country').then((c) => ['country', c]),
      fetchFacet(base, 'language').then((c) => ['language', c]),
    ]);
    for (const r of rest) {
      if (r.status === 'fulfilled') absorb(byUrl, r.value[0], r.value[1]);
    }

    self.postMessage({ type: 'complete', channels: finalize(byUrl) });
  } catch (err) {
    // If category failed we have nothing useful — report it.
    if (!byUrl.size) {
      self.postMessage({ type: 'error', message: err?.message || 'load failed' });
    } else {
      self.postMessage({ type: 'complete', channels: finalize(byUrl) });
    }
  }
};
