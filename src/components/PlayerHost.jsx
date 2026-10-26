import { Suspense, lazy, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const Player = lazy(() => import('./Player'));

// One player for the whole app. It lives in a fixed layer and tracks the
// position of whichever placeholder ("slot") is on screen — the watch screen's
// stage or the mini-player box — so moving between them never tears down the
// <video> and the stream keeps playing without a re-buffer.
export default function PlayerHost({ channel, slot, mode, children, ...playerProps }) {
  const { t } = useI18n();
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    let last = '';
    // Follow the slot every frame: it moves with scrolling, sticky headers,
    // rotation and the mini-player's entrance animation. Cheap — one rect read.
    const follow = () => {
      raf = requestAnimationFrame(follow);
      if (document.fullscreenElement) return; // the browser owns the layout
      if (!slot || !slot.isConnected) {
        if (last !== 'hidden') { host.style.visibility = 'hidden'; last = 'hidden'; }
        return;
      }
      const r = slot.getBoundingClientRect();
      const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
      if (key === last) return;
      last = key;
      Object.assign(host.style, {
        visibility: 'visible',
        transform: `translate(${r.left}px, ${r.top}px)`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [slot]);

  return (
    <div ref={hostRef} className={`player-host ${mode}`} style={{ visibility: 'hidden' }}>
      <Suspense fallback={
        <div className="stage">
          <div className="stage-state"><Loader2 className="spin" size={30} /><span>{t('starting')}</span></div>
        </div>
      }>
        <Player channel={channel} keys={mode === 'full'} {...playerProps} />
      </Suspense>
      {children}
    </div>
  );
}
