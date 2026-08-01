import { useEffect, useRef } from 'react';

// Remembers scroll offset per "view key" (the active filter combination) and
// restores it when you come back — so closing the player or switching a filter
// and returning doesn't dump you at the top of a 14k-row list.

export function useScrollMemory(scrollRef, viewKey, ready) {
  const store = useRef(new Map());
  const prevKey = useRef(null);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    // Save the outgoing view's position before switching.
    if (prevKey.current !== null && prevKey.current !== viewKey) {
      store.current.set(prevKey.current, el.scrollTop);
    }
    prevKey.current = viewKey;

    if (!ready) return;
    const saved = store.current.get(viewKey) ?? 0;
    // Wait for the grid to lay out before restoring, else we clamp to 0.
    const raf = requestAnimationFrame(() => {
      el.scrollTop = saved;
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollRef, viewKey, ready]);

  // Keep the current position fresh while scrolling.
  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        store.current.set(prevKey.current, el.scrollTop);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);
}
