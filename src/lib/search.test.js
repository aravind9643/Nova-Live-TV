import { describe, it, expect } from 'vitest';
import { searchChannels } from './search';

const ch = (name, extra = '') => ({ name, search: `${name} ${extra}`.toLowerCase() });
const LIST = [
  ch('Sky Sports News', 'sports'),
  ch('BBC News', 'news'),
  ch('BBC', 'general'),
  ch('Discovery', 'documentary'),
  ch('CNN', 'news'),
];

describe('searchChannels', () => {
  it('returns the list untouched for an empty query', () => {
    expect(searchChannels(LIST, '  ')).toBe(LIST);
  });

  it('ranks exact, then prefix, then substring matches', () => {
    expect(searchChannels(LIST, 'bbc').map((c) => c.name)).toEqual(['BBC', 'BBC News']);
  });

  it('prefers name hits over category hits', () => {
    const names = searchChannels(LIST, 'news').map((c) => c.name);
    expect(names.slice(0, 2)).toEqual(['BBC News', 'Sky Sports News']);
    expect(names).toContain('CNN'); // category-only hit still included, last
    expect(names.at(-1)).toBe('CNN');
  });

  it('tolerates abbreviations via subsequence matching', () => {
    expect(searchChannels(LIST, 'dsc').map((c) => c.name)).toEqual(['Discovery']);
  });
});
