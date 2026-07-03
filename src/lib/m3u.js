// Minimal, tolerant M3U (extended) parser tuned for the iptv-org playlists.
//
// A channel entry looks like:
//   #EXTINF:-1 tvg-id="..." tvg-logo="..." group-title="News",2GB Sydney (1080p)
//   https://example.com/stream.m3u8

const ATTR_RE = /([a-zA-Z0-9-]+)="([^"]*)"/g;

// Pull the "(1080p)" / "[Geo-blocked]" markers out of the display name so the
// grid stays clean, but keep the quality tag as a badge.
function splitName(raw) {
  const quality = (raw.match(/\((\d{3,4}p)\)/i) || [])[1] || null;
  const flags = [...raw.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  const name = raw
    .replace(/\((?:\d{3,4}p|[^)]*)\)/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { name: name || raw.trim(), quality, flags };
}

export function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let pending = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXTINF')) {
      // The display name is the text after the comma that separates it from the
      // attributes — but attribute VALUES (e.g. a user-agent) can contain commas
      // inside quotes. So find the first comma that sits OUTSIDE any "..." pair.
      let commaIdx = -1;
      let inQuote = false;
      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (ch === '"') inQuote = !inQuote;
        else if (ch === ',' && !inQuote) { commaIdx = i; break; }
      }
      const meta = commaIdx >= 0 ? trimmed.slice(0, commaIdx) : trimmed;
      const rawName = commaIdx >= 0 ? trimmed.slice(commaIdx + 1) : 'Unknown';

      const attrs = {};
      let m;
      ATTR_RE.lastIndex = 0;
      while ((m = ATTR_RE.exec(meta))) attrs[m[1]] = m[2];

      const { name, quality, flags } = splitName(rawName);
      const groups = (attrs['group-title'] || 'Other')
        .split(';')
        .map((g) => g.trim())
        // iptv-org tags uncategorized channels literally as "Undefined" — fold into "Other".
        .map((g) => (/^undefined$/i.test(g) ? 'Other' : g))
        .filter(Boolean);

      pending = {
        name,
        quality,
        flags,
        logo: attrs['tvg-logo'] || null,
        tvgId: attrs['tvg-id'] || null,
        group: groups[0] || 'Other',
        groups,
      };
    } else if (!trimmed.startsWith('#') && pending) {
      channels.push({ ...pending, url: trimmed, id: `${pending.tvgId || pending.name}-${channels.length}` });
      pending = null;
    }
  }
  return channels;
}
