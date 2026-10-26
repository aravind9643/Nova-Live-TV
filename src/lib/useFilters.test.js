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

  it('puts multi-select, query and sort in the hash', () => {
    const url = toUrl({
      selected: { ...EMPTY, category: ['News', 'Sports'] },
      query: 'bbc', view: 'all', sort: 'az',
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

  it('gives the playing channel a /watch path and keeps filters in the hash', () => {
    const url = toUrl({ selected: { ...EMPTY, category: ['News'] }, query: '', view: 'all', sort: 'popular', play: 'bbc-news-abc123' });
    expect(url).toBe('/watch/bbc-news-abc123#category=News');
    go(url);
    expect(parse()).toMatchObject({ play: 'bbc-news-abc123', selected: { ...EMPTY, category: ['News'] } });
  });

  it('still reads legacy #play=<stream url> links', () => {
    go(`/#play=${encodeURIComponent(encodeURIComponent('https://x/a.m3u8'))}`);
    expect(parse().play).toBe('https://x/a.m3u8');
  });

  it('falls back to the default sort for unknown values', () => {
    go('/#sort=bogus');
    expect(parse().sort).toBe('popular');
  });
});
