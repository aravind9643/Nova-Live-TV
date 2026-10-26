// Build-time data step. Fetches the iptv-org playlists once and writes:
//   public/catalogue.json  compact, pre-merged channel list the app loads
//   public/sitemap.xml     home + every category/country/language + channel page
//   .cache/pages.json      what scripts/prerender.mjs needs
//
// HEALTH_CHECK=1 also probes every stream and marks the ones that don't answer
// as `dead` (the app sinks them, never hides them unless asked — a stream that
// fails from a US build server may well work for a viewer elsewhere).
//
// If the playlists can't be fetched (offline CI) nothing is overwritten and the
// build carries on: the app falls back to loading the live playlists itself.

import { mkdirSync, writeFileSync } from 'node:fs';
import { parseM3U } from '../src/lib/m3u.js';
import { absorb, finalize, pack } from '../src/lib/merge.js';
import { slugOf } from '../src/lib/slug.js';

const SITE = 'https://nova-live-tv.vercel.app';
const BASE = 'https://iptv-org.github.io/iptv';
const FACETS = ['category', 'country', 'language'];
const MIN_CHANNELS = 3;   // skip near-empty facet pages (thin content)
const TOP = 40;           // channel names listed on each facet page
const PROBE_TIMEOUT = 8000;
const PROBE_CONCURRENCY = 64;

const out = (p) => new URL(`../${p}`, import.meta.url);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function playlist(facet) {
  const res = await fetch(`${BASE}/index.${facet}.m3u`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`${facet}: HTTP ${res.status}`);
  return parseM3U(await res.text());
}

// A stream counts as alive if its playlist answers with an HLS manifest.
async function probe(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
      headers: { 'user-agent': 'Mozilla/5.0 (NOVA Live TV health check)' },
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const head = (await res.text()).slice(0, 64);
    return head.includes('#EXTM3U') || !url.includes('.m3u8');
  } catch {
    return false;
  }
}

async function checkHealth(channels) {
  let next = 0;
  let dead = 0;
  const worker = async () => {
    while (next < channels.length) {
      const c = channels[next++];
      c.dead = !(await probe(c.url));
      if (c.dead) dead++;
    }
  };
  const started = Date.now();
  await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, worker));
  console.log(`health: ${dead}/${channels.length} unreachable (${Math.round((Date.now() - started) / 1000)}s)`);
}

try {
  const byUrl = new Map();
  for (const facet of FACETS) absorb(byUrl, facet, await playlist(facet));
  const channels = finalize(byUrl);
  if (process.env.HEALTH_CHECK === '1') await checkHealth(channels);

  // catalogue.json — the app's primary data source
  const strip = (c) => ({ name: c.name, url: c.url, logo: c.logo, quality: c.quality,
    category: c.category, country: c.country, language: c.language, dead: c.dead });
  const catalogue = JSON.stringify(pack(channels.map(strip)));
  writeFileSync(out('public/catalogue.json'), catalogue);

  // facet pages
  const facetPages = [];
  for (const facet of FACETS) {
    const groups = new Map();
    for (const c of channels) {
      for (const g of c[facet]) {
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(c.name);
      }
    }
    for (const [name, names] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
      if (names.length < MIN_CHANNELS || /^(undefined|other)$/i.test(name)) continue;
      facetPages.push({ facet, name, count: names.length, top: [...new Set(names)].slice(0, TOP) });
    }
  }

  // channel pages
  const channelPages = channels.map((c) => ({
    slug: slugOf(c), name: c.name, logo: c.logo, quality: c.quality,
    category: c.category, country: c.country, language: c.language,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const url = (loc, priority, freq = 'daily') =>
    `  <url><loc>${esc(loc)}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
  const urls = [
    url(`${SITE}/`, '1.0'),
    ...facetPages.map((p) => url(`${SITE}/${p.facet}/${encodeURIComponent(p.name)}`, p.facet === 'category' ? '0.8' : '0.6')),
    ...channelPages.map((p) => url(`${SITE}/watch/${p.slug}`, '0.5', 'weekly')),
  ];
  writeFileSync(out('public/sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

  mkdirSync(out('.cache/'), { recursive: true });
  writeFileSync(out('.cache/pages.json'), JSON.stringify({ facetPages, channelPages }));

  console.log(`data: ${channels.length} channels, catalogue ${(catalogue.length / 1024 / 1024).toFixed(2)} MB raw, sitemap ${urls.length} URLs`);
} catch (err) {
  console.warn(`data: skipped (${err.message}) — keeping existing files; the app will load live playlists`);
}
