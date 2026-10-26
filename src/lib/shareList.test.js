import { describe, it, expect } from 'vitest';
import { encodeFavorites, decodeFavorites } from './shareList';

describe('favorites share links', () => {
  it('round-trips names (including non-ASCII), urls and logos', () => {
    const favs = [
      { name: 'Ténéré TV · 日本', url: 'https://a.example/x.m3u8', logo: 'https://a.example/l.png', primary: 'News' },
      { name: 'Plain', url: 'http://b.example/y.m3u8' },
    ];
    const out = decodeFavorites(encodeFavorites(favs));
    expect(out.map((c) => [c.name, c.url, c.logo, c.primary])).toEqual([
      ['Ténéré TV · 日本', 'https://a.example/x.m3u8', 'https://a.example/l.png', 'News'],
      ['Plain', 'http://b.example/y.m3u8', null, 'Other'],
    ]);
  });

  it('rejects garbage and non-http urls', () => {
    expect(decodeFavorites('not-base64!!')).toEqual([]);
    const evil = encodeFavorites([{ name: 'x', url: 'javascript:alert(1)' }]);
    expect(decodeFavorites(evil)).toEqual([]);
  });
});
