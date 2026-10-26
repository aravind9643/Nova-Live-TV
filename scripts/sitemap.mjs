// Generates public/sitemap.xml with one URL per category, country and
// language that actually has channels — each is a real, indexable page
// (/category/Sports, /country/India, …) served by the SPA rewrite.
//
// Also writes .cache/pages.json (each page's top channels) for
// scripts/prerender.mjs.
//
// Runs before `vite build`. If the playlists can't be fetched (offline CI),
// the existing sitemap is left untouched so the build never fails on it.

import { mkdirSync, writeFileSync } from 'node:fs';
import { parseM3U } from '../src/lib/m3u.js';

const SITE = 'https://nova-live-tv.vercel.app';
const BASE = 'https://iptv-org.github.io/iptv';
const FACETS = ['category', 'country', 'language'];
const MIN_CHANNELS = 3; // skip near-empty pages (thin content)
const TOP = 40;          // channel names listed on each pre-rendered page

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function groups(facet) {
  const res = await fetch(`${BASE}/index.${facet}.m3u`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${facet}: HTTP ${res.status}`);
  const byGroup = new Map();
  for (const c of parseM3U(await res.text())) {
    for (const g of c.groups) {
      if (!g) continue;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(c.name);
    }
  }
  return [...byGroup]
    .filter(([, names]) => names.length >= MIN_CHANNELS)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, names]) => [name, names.length, [...new Set(names)].slice(0, TOP)]);
}

try {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [`  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`];
  const pages = [];
  for (const facet of FACETS) {
    for (const [name, count, top] of await groups(facet)) {
      if (/^(undefined|other)$/i.test(name)) continue;
      pages.push({ facet, name, count, top });
      const loc = `${SITE}/${facet}/${encodeURIComponent(name)}`;
      const priority = facet === 'category' ? '0.8' : '0.6';
      urls.push(`  <url><loc>${esc(loc)}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>${priority}</priority></url>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
  mkdirSync(new URL('../.cache/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../.cache/pages.json', import.meta.url), JSON.stringify(pages));
  console.log(`sitemap: ${urls.length} URLs`);
} catch (err) {
  console.warn(`sitemap: skipped (${err.message}) — keeping existing public/sitemap.xml`);
}
