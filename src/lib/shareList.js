// Favorites as a shareable link: a compact JSON array, base64url-encoded into
// the `import` hash param. No server, no account — the link *is* the list.

const MAX = 200; // keep links a sane length

function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeFavorites(favorites) {
  const rows = favorites.slice(0, MAX).map((c) => [c.name, c.url, c.logo || '', c.primary || '']);
  return toB64Url(JSON.stringify(rows));
}

// Returns channel objects, or [] for anything malformed.
export function decodeFavorites(token) {
  try {
    const rows = JSON.parse(fromB64Url(token));
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => Array.isArray(r) && typeof r[1] === 'string' && /^https?:\/\//.test(r[1]))
      .slice(0, MAX)
      .map(([name, url, logo, primary]) => ({
        name: String(name || 'Channel'), url, logo: logo || null, primary: primary || 'Other',
        category: primary ? [primary] : [], country: [], language: [],
      }));
  } catch {
    return [];
  }
}

export function favoritesLink(favorites) {
  return `${window.location.origin}/#import=${encodeFavorites(favorites)}`;
}

// Reads (and returns) a pending import token from the current URL.
export function readImportToken() {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return p.get('import');
}
