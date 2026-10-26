// Merging the per-facet playlists into one channel list. Shared by the
// catalogue worker, the main-thread fallback and the build-time data script,
// so all three produce identical channels.

// iptv-org keeps adult channels out of its public indexes, but AdSense bans
// adult content outright — never let such a category through if that changes.
const BLOCKED = /^(xxx|adult|erotic)$/i;

export const isBlocked = (c) => c.category.some((g) => BLOCKED.test(g));

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

export function absorb(byUrl, facet, channels) {
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
export function prepare(c) {
  c.search = `${c.name} ${c.category.join(' ')} ${c.country.join(' ')}`.toLowerCase();
  c.primary = c.category[0] || c.country[0] || 'Other';
  return c;
}

export function finalize(byUrl) {
  const out = [];
  for (const c of byUrl.values()) if (!isBlocked(c)) out.push(prepare(c));
  return out;
}

// ---- compact wire format (public/catalogue.json) ---------------------------
// Rows instead of objects, facet values as indexes into shared tables: the
// 9.5 MB of raw playlists shrinks to well under 1 MB gzipped.

export function pack(channels, extra = {}) {
  const tables = { category: [], country: [], language: [] };
  const index = { category: new Map(), country: new Map(), language: new Map() };
  const ref = (facet, v) => {
    let i = index[facet].get(v);
    if (i === undefined) {
      i = tables[facet].push(v) - 1;
      index[facet].set(v, i);
    }
    return i;
  };
  const rows = channels.map((c) => [
    c.name, c.url, c.logo || 0, c.quality || 0,
    c.category.map((v) => ref('category', v)),
    c.country.map((v) => ref('country', v)),
    c.language.map((v) => ref('language', v)),
    c.dead ? 1 : 0,
  ]);
  return { v: 1, generatedAt: new Date().toISOString(), ...extra, tables, rows };
}

export function unpack({ tables, rows }) {
  return rows.map(([name, url, logo, quality, cat, country, lang, dead]) => prepare({
    name, url,
    logo: logo || null,
    quality: quality || null,
    category: cat.map((i) => tables.category[i]),
    country: country.map((i) => tables.country[i]),
    language: lang.map((i) => tables.language[i]),
    dead: !!dead,
  }));
}
