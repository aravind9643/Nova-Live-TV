// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { parse, toUrl } from './useFilters';

const EMPTY = { category: [], country: [], language: [] };
const go = (url) => window.history.replaceState(null, '', url);

describe('URL state', () => {
  beforeEach(() => go('/'));

  it('gives a single facet value a real path', () => {
    const url = toUrl({ selected: { ...EMPTY, country: ['United States'] }, query: '', view: 'all', sort: 'popular' });
    expect(url).toBe('/country/United%20States');
  });

  it('puts multi-select, query, sort and play in the hash', () => {
    const url = toUrl({
      selected: { ...EMPTY, category: ['News', 'Sports'] },
      query: 'bbc', view: 'all', sort: 'az', play: 'https://x/a.m3u8',
    });
    expect(url.startsWith('/#')).toBe(true);
    expect(decodeURIComponent(url)).toContain('category=News~Sports');
    expect(url).toContain('sort=az');
  });

  it('round-trips through parse()', () => {
    const state = {
      selected: { ...EMPTY, category: ['News'], language: ['English'] },
      query: 'world news', view: 'all', sort: 'hd', play: null,
    };
    go(toUrl(state));
    expect(parse()).toEqual(state);
  });

  it('merges the path facet with hash filters', () => {
    go('/category/Sports#language=English');
    expect(parse().selected).toEqual({ category: ['Sports'], country: [], language: ['English'] });
  });

  it('reads ?q= (sitelinks search box) and drops it from the next URL', () => {
    go('/?q=cnn');
    const state = parse();
    expect(state.query).toBe('cnn');
    expect(toUrl(state)).toBe('/#q=cnn');
  });

  it('falls back to the default sort for unknown values', () => {
    go('/#sort=bogus');
    expect(parse().sort).toBe('popular');
  });
});
