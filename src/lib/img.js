// Channel logos come from hundreds of hosts, many slow or serving multi-MB
// PNGs. Route them through a resizing CDN (WebP, fixed width) and fall back to
// the original URL if the proxy can't fetch it.

const PROXY = 'https://images.weserv.nl/?';

export function logoSrc(url, width = 160) {
  if (!url || url.startsWith('data:')) return url;
  const bare = url.replace(/^https?:\/\//, '');
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  return `${PROXY}url=${encodeURIComponent(bare)}&w=${Math.round(width * dpr)}&output=webp&q=80&il`;
}

// onError handler: proxy → original → caller's fallback.
export function onLogoError(e, original, onGiveUp) {
  const img = e.currentTarget;
  if (original && img.dataset.fallback !== '1') {
    img.dataset.fallback = '1';
    img.src = original;
    return;
  }
  onGiveUp?.(img);
}
