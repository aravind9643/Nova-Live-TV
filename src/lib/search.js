// Relevance-ranked channel search.
//
// The old search was a plain `includes()` filter, so "bbc" could bury BBC News
// under any channel whose *category* happened to contain the letters. Here we
// score each match and sort, so the obvious answer comes first.

const EXACT = 1000;
const PREFIX = 500;
const WORD_START = 250;
const SUBSTRING = 100;
const FACET_HIT = 20;

// Subsequence match ("dsc" → "DiSCovery") for typo/abbreviation tolerance.
// Returns a small score based on how tightly the letters cluster, or 0.
function subsequenceScore(needle, haystack) {
  let hi = 0;
  let first = -1;
  let last = -1;
  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni];
    let found = -1;
    while (hi < haystack.length) {
      if (haystack[hi] === ch) { found = hi; hi++; break; }
      hi++;
    }
    if (found === -1) return 0;
    if (first === -1) first = found;
    last = found;
  }
  const span = last - first + 1;
  // Tighter spans score higher; never beats a real substring hit.
  return Math.max(1, Math.round((needle.length / span) * 40));
}

function scoreChannel(c, q) {
  const name = c.name.toLowerCase();

  if (name === q) return EXACT;
  if (name.startsWith(q)) return PREFIX + Math.max(0, 60 - name.length);

  const idx = name.indexOf(q);
  if (idx === 0) return PREFIX;
  if (idx > 0) {
    // Bonus when the match begins a word ("… HD Sports" for "sports").
    const atWordStart = name[idx - 1] === ' ' || name[idx - 1] === '-';
    return (atWordStart ? WORD_START : SUBSTRING) + Math.max(0, 40 - idx);
  }

  // Facet text (category/country) is a weaker signal than the channel name.
  if (c.search.includes(q)) return FACET_HIT;

  return subsequenceScore(q, name);
}

/**
 * Filter + rank. `channels` should already be facet-filtered.
 * Returns a new array sorted by relevance when a query is present.
 */
export function searchChannels(channels, query) {
  const q = query.trim().toLowerCase();
  if (!q) return channels;

  const scored = [];
  for (const c of channels) {
    const s = scoreChannel(c, q);
    if (s > 0) scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name));
  return scored.map((x) => x.c);
}

// ---- recent searches -------------------------------------------------------

const RECENT_KEY = 'nova.searches';
const RECENT_MAX = 8;

export function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(q) {
  const term = q.trim();
  if (term.length < 2) return loadRecentSearches();
  const next = [term, ...loadRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase())]
    .slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
