import { useCallback, useEffect, useState } from 'react';

// Serializes app state into the URL hash so views are shareable and survive reload.
// Shape: #axis=category&group=News&play=<encoded channel url>

function parseHash() {
  const h = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(h);
  return {
    axis: params.get('axis') || 'category',
    group: params.get('group') ? decodeURIComponent(params.get('group')) : 'All',
    play: params.get('play') ? decodeURIComponent(params.get('play')) : null,
  };
}

function buildHash({ axis, group, play }) {
  const params = new URLSearchParams();
  if (axis && axis !== 'category') params.set('axis', axis);
  if (group && group !== 'All') params.set('group', encodeURIComponent(group));
  if (play) params.set('play', encodeURIComponent(play));
  const s = params.toString();
  return s ? `#${s}` : '';
}

export function useHashState() {
  const [state, setState] = useState(parseHash);

  // React to back/forward + manual hash edits.
  useEffect(() => {
    const onHash = () => setState(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Write without triggering our own hashchange re-parse loop.
  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const hash = buildHash(next);
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, '', url || window.location.pathname);
      return next;
    });
  }, []);

  return [state, update];
}
