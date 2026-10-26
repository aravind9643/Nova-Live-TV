// Writes static HTML into dist/ for every page in .cache/pages.json (from
// scripts/data.mjs):
//   dist/category|country|language/<name>/index.html
//   dist/watch/<slug>/index.html
// Each gets its own title, description, canonical URL and real content inside
// #root, so crawlers that don't run JavaScript still see it. React replaces the
// content on load. Channel pages also carry TelevisionChannel structured data.
//
// Runs after `vite build`. Without pages.json it does nothing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://nova-live-tv.vercel.app';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const data = new URL('../.cache/pages.json', import.meta.url);

if (!existsSync(data)) {
  console.warn('prerender: skipped (no .cache/pages.json — the data step could not fetch playlists)');
  process.exit(0);
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script>: escape "<" so a channel name can't close the tag.
const ldJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

const shell = readFileSync(join(dist, 'index.html'), 'utf8');
const { facetPages, channelPages } = JSON.parse(readFileSync(data, 'utf8'));

function render({ path, title, desc, body, head = '' }) {
  const set = (html, re, value) => html.replace(re, (_m, pre, post) => `${pre}${esc(value)}${post}`);
  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = set(html, /(<meta name="title" content=")[^"]*(")/, title);
  html = set(html, /(<meta name="description"\s+content=")[^"]*(")/, desc);
  html = set(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = set(html, /(<meta property="og:description"\s+content=")[^"]*(")/, desc);
  html = set(html, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  html = set(html, /(<meta name="twitter:description"\s+content=")[^"]*(")/, desc);
  html = set(html, /(<meta property="og:url" content=")[^"]*(")/, `${SITE}${path}`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}${path}$2`);
  if (head) html = html.replace('</head>', `${head}\n</head>`);
  return html.replace('<div id="root"></div>', `<div id="root"><main class="prerender">${body}</main></div>`);
}

function write(segments, html) {
  const dir = join(dist, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

// ---- facet pages ----
const phrase = (facet, name) => ({
  category: [`${name} channels`, `${name} live TV channels`],
  country: [`Channels from ${name}`, `live TV channels from ${name}`],
  language: [`Channels in ${name}`, `live TV channels in ${name}`],
}[facet]);

let facets = 0;
for (const { facet, name, count, top } of facetPages) {
  if (name.includes('/')) continue; // can't be a directory name
  const [label, inline] = phrase(facet, name);
  write([facet, name], render({
    path: `/${facet}/${encodeURIComponent(name)}`,
    title: `${name} Live TV Channels · Watch Free · NOVA Live TV`,
    desc: `Watch ${count.toLocaleString('en')} free ${inline} online in HD — ${top.slice(0, 5).join(', ')} and more. No sign-up.`,
    body: `<h1>${esc(label)}</h1>
      <p>${esc(count.toLocaleString('en'))} free live streams. Loading the player…</p>
      <ul>${top.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`,
  }));
  facets++;
}

// ---- channel pages ----
for (const c of channelPages) {
  const path = `/watch/${c.slug}`;
  const facts = [c.category[0], c.country[0], c.language[0]].filter(Boolean);
  const where = c.country[0] ? ` from ${c.country[0]}` : '';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'TelevisionChannel',
    name: c.name,
    url: `${SITE}${path}`,
    ...(c.logo && { logo: c.logo, image: c.logo }),
    ...(c.category.length && { genre: c.category }),
    ...(c.language[0] && { inLanguage: c.language[0] }),
  };
  write(['watch', c.slug], render({
    path,
    title: `Watch ${c.name} Live Stream Free · NOVA Live TV`,
    desc: `Watch ${c.name} live and free online${c.category[0] ? ` — ${c.category[0]}` : ''}${where}${c.quality ? ` in ${c.quality}` : ''}. No sign-up, works on phone, tablet and TV.`,
    head: `<script type="application/ld+json">${ldJson(ld)}</script>`,
    body: `${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)} logo" width="160" height="100" />` : ''}
      <h1>${esc(c.name)} — live</h1>
      <p>${esc(facts.join(' · '))}${c.quality ? ` · ${esc(c.quality)}` : ''}. Loading the player…</p>`,
  }));
}

console.log(`prerender: ${facets} facet pages, ${channelPages.length} channel pages`);
