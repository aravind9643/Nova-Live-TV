import { describe, it, expect } from 'vitest';
import { absorb, finalize, pack, unpack } from './merge';
import { slugOf } from './slug';

const raw = (name, url, groups, extra = {}) => ({ name, url, groups, logo: null, quality: null, ...extra });

describe('merge', () => {
  it('merges facets by stream URL and drops blocked categories', () => {
    const byUrl = new Map();
    absorb(byUrl, 'category', [raw('BBC', 'u1', ['News']), raw('Bad', 'u2', ['XXX'])]);
    absorb(byUrl, 'country', [raw('BBC', 'u1', ['United Kingdom'], { logo: 'l.png' })]);
    const out = finalize(byUrl);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'BBC', logo: 'l.png', category: ['News'], country: ['United Kingdom'], primary: 'News' });
  });

  it('pack/unpack round-trips the channel list', () => {
    const channels = [
      { name: 'A', url: 'u1', logo: 'a.png', quality: '1080p', category: ['News'], country: ['India'], language: ['Hindi'], dead: true },
      { name: 'B', url: 'u2', logo: null, quality: null, category: ['News', 'Sports'], country: [], language: ['Hindi'] },
    ];
    const back = unpack(JSON.parse(JSON.stringify(pack(channels))));
    expect(back.map(({ search: _s, primary: _p, ...c }) => c)).toEqual([
      channels[0],
      { ...channels[1], dead: false },
    ]);
    expect(back[1].primary).toBe('News');
  });
});

describe('slugOf', () => {
  it('is readable, stable and unique per stream', () => {
    const a = slugOf({ name: 'Ténéré TV 24/7!', url: 'https://x/1.m3u8' });
    expect(a).toMatch(/^tenere-tv-24-7-[a-z0-9]{6}$/);
    expect(slugOf({ name: 'Ténéré TV 24/7!', url: 'https://x/1.m3u8' })).toBe(a);
    expect(slugOf({ name: 'Ténéré TV 24/7!', url: 'https://x/2.m3u8' })).not.toBe(a);
    expect(slugOf({ name: '日本', url: 'u' })).toMatch(/^channel-[a-z0-9]{6}$/);
  });
});
