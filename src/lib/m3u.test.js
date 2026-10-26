import { describe, it, expect } from 'vitest';
import { parseM3U } from './m3u';

const PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-id="bbc.uk" tvg-logo="https://x/bbc.png" group-title="News;General",BBC News (1080p) [Geo-blocked]
https://example.com/bbc.m3u8
#EXTINF:-1 http-user-agent="Mozilla/5.0, like Gecko" group-title="Undefined",Plain, Channel
#EXTVLCOPT:http-referrer=https://example.com
https://example.com/plain.m3u8
#EXTINF:-1 group-title="Sports",Orphan without url
`;

describe('parseM3U', () => {
  const channels = parseM3U(PLAYLIST);

  it('parses one entry per stream URL and drops entries without one', () => {
    expect(channels.map((c) => c.url)).toEqual([
      'https://example.com/bbc.m3u8',
      'https://example.com/plain.m3u8',
    ]);
  });

  it('extracts attributes, quality and flags, and cleans the name', () => {
    expect(channels[0]).toMatchObject({
      name: 'BBC News',
      quality: '1080p',
      flags: ['Geo-blocked'],
      logo: 'https://x/bbc.png',
      tvgId: 'bbc.uk',
      groups: ['News', 'General'],
    });
  });

  it('ignores commas inside quoted attributes and folds "Undefined" into "Other"', () => {
    expect(channels[1].name).toBe('Plain, Channel');
    expect(channels[1].groups).toEqual(['Other']);
  });
});
