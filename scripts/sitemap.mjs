// Generates public/sitemap.xml with one URL per category, country and
// language that actually has channels — each is a real, indexable page
// (/category/Sports, /country/India, …) served by the SPA rewrite.
//
// Runs before `vite build`. If the playlists can't be fetched (offline CI),
// the existing sitemap is left untouched so the build never fails on it.

import { writeFileSync } from 'node:fs';
import { parseM3U } from '../src/lib/m3u.js';

const SITE = 'https://nova-live-tv.vercel.app';
const BASE = 'https://iptv-org.github.io/iptv';
const FACETS = ['category', 'country', 'language'];
const MIN_CHANNELS = 3; // skip near-empty pages (thin content)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function groups(facet) {
  const res = await fetch(`${BASE}/index.${facet}.m3u`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${facet}: HTTP ${res.status}`);
  const counts = new Map();
  for (const c of parseM3U(await res.text())) {
    for (const g of c.groups) if (g) counts.set(g, (counts.get(g) || 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= MIN_CHANNELS).sort((a, b) => b[1] - a[1]);
}

try {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [`  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`];
  for (const facet of FACETS) {
    for (const [name] of await groups(facet)) {
      if (/^(undefined|other)$/i.test(name)) continue;
      const loc = `${SITE}/${facet}/${encodeURIComponent(name)}`;
      const priority = facet === 'category' ? '0.8' : '0.6';
      urls.push(`  <url><loc>${esc(loc)}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${priority}</priority></url>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
  console.log(`sitemap: ${urls.length} URLs`);
} catch (err) {
  console.warn(`sitemap: skipped (${err.message}) — keeping existing public/sitemap.xml`);
}
