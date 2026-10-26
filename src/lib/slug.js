// Stable, readable URL slug per channel: "bbc-news-3f9a1c". The name part is
// for humans and search engines; the hash of the stream URL keeps two channels
// with the same name apart. Shared by the app and the build-time page script.

function hash(str) {
  // FNV-1a, 32-bit — tiny, deterministic, good enough for disambiguation.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(-6);
}

export function slugOf(channel) {
  const base = (channel.name || 'channel')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'channel';
  return `${base}-${hash(channel.url || '')}`;
}
