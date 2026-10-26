// Writes a static HTML page for every category / country / language in
// .cache/pages.json (produced by scripts/sitemap.mjs) into dist/, e.g.
// dist/category/Sports/index.html. Each gets its own title, description,
// canonical URL and a real list of channels inside #root, so crawlers that
// don't run JavaScript still see content. React replaces it on load.
//
// Runs after `vite build`. Without pages.json it does nothing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://nova-live-tv.vercel.app';
const dist = new URL('../dist/', import.meta.url);
const data = new URL('../.cache/pages.json', import.meta.url);

if (!existsSync(data)) {
  console.warn('prerender: skipped (no .cache/pages.json — sitemap step could not fetch playlists)');
  process.exit(0);
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "Sports channels" / "Channels from India" / "Channels in English"
const phrase = (facet, name) => ({
  category: [`${name} channels`, `${name} live TV channels`],
  country: [`Channels from ${name}`, `live TV channels from ${name}`],
  language: [`Channels in ${name}`, `live TV channels in ${name}`],
}[facet]);

const shell = readFileSync(new URL('index.html', dist), 'utf8');
const pages = JSON.parse(readFileSync(data, 'utf8'));

const setMeta = (html, re, value) => html.replace(re, (_m, pre, post) => `${pre}${esc(value)}${post}`);

for (const { facet, name, count, top } of pages) {
  if (name.includes('/')) continue; // can't be a directory name
  const [label, inline] = phrase(facet, name);
  const title = `${name} Live TV Channels · Watch Free · NOVA Live TV`;
  const desc = `Watch ${count.toLocaleString('en')} free ${inline} online in HD — ${top.slice(0, 5).join(', ')} and more. No sign-up.`;
  const path = `/${facet}/${encodeURIComponent(name)}`;

  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, /(<meta name="title" content=")[^"]*(")/, title);
  html = setMeta(html, /(<meta name="description"\s+content=")[^"]*(")/, desc);
  html = setMeta(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = setMeta(html, /(<meta property="og:description"\s+content=")[^"]*(")/, desc);
  html = setMeta(html, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  html = setMeta(html, /(<meta name="twitter:description"\s+content=")[^"]*(")/, desc);
  html = setMeta(html, /(<meta property="og:url" content=")[^"]*(")/, `${SITE}${path}`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}${path}$2`);

  const body = `<main class="prerender">
      <h1>${esc(label)}</h1>
      <p>${esc(count.toLocaleString('en'))} free live streams. Loading the player…</p>
      <ul>${top.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </main>`;
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);

  // Plain name on disk: Vercel decodes /country/United%20States before the file lookup.
  const dir = join(fileURLToPath(dist), facet, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}
console.log(`prerender: ${pages.length} pages`);
