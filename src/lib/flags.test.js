import { describe, it, expect } from 'vitest';
import { flagOf } from './flags';

describe('flagOf', () => {
  it('maps CLDR and iptv-org country names to flag images', () => {
    expect(flagOf('India')).toBe('https://flagcdn.com/in.svg');
    expect(flagOf('united states')).toBe('https://flagcdn.com/us.svg');
    expect(flagOf('Russia')).toBe('https://flagcdn.com/ru.svg');
  });

  it('returns an empty string for unknown or missing names', () => {
    expect(flagOf('International')).toBe('');
    expect(flagOf(undefined)).toBe('');
  });
});
