// Country name → flag image, without shipping a lookup table: build the
// reverse map once from Intl.DisplayNames over every two-letter region code.
// Images rather than emoji: Windows has no flag glyphs and shows "US" instead.

let byName = null;

function build() {
  byName = new Map();
  let names;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return; // very old browser — no flags
  }
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      let name;
      try { name = names.of(code); } catch { continue; }
      if (name && name !== code) byName.set(name.toLowerCase(), code);
    }
  }
  // iptv-org spellings that differ from CLDR.
  const alias = {
    'united states': 'US', 'united kingdom': 'GB', 'russia': 'RU', 'south korea': 'KR',
    'north korea': 'KP', 'vietnam': 'VN', 'czech republic': 'CZ', 'ivory coast': 'CI',
    'hong kong': 'HK', 'macao': 'MO', 'turkey': 'TR', 'congo': 'CG', 'dr congo': 'CD',
    'myanmar': 'MM', 'palestine': 'PS', 'kosovo': 'XK',
  };
  for (const [k, v] of Object.entries(alias)) byName.set(k, v);
}

export function flagOf(country) {
  if (!country) return '';
  if (!byName) build();
  const code = byName.get(country.toLowerCase());
  return code ? `https://flagcdn.com/${code.toLowerCase()}.svg` : '';
}
