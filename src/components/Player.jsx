import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Volume2, VolumeX, Maximize, Minimize, Loader2, AlertTriangle,
  SkipBack, SkipForward, RotateCcw,
} from 'lucide-react';
import { tap } from '../lib/haptics';

const LOAD_TIMEOUT = 12000;   // declare a stream dead after this
const CHROME_HIDE_MS = 3200;  // auto-hide overlay controls while playing
const SWIPE_MIN = 60;         // px before a horizontal swipe counts as a zap

// The video surface. This is an embedded panel (not a modal) — the watch screen
// owns the surrounding layout, title bar and channel rail.
export default function Player({ channel, onPrev, onNext, onHealth, onBack }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const touch = useRef(null);
  const hideTimer = useRef(null);

  const [status, setStatus] = useState('loading'); // loading | playing | error
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const wakeChrome = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), CHROME_HIDE_MS);
  }, []);

  useEffect(() => {
    if (status === 'playing') wakeChrome();
    else { clearTimeout(hideTimer.current); setChrome(true); }
    return () => clearTimeout(hideTimer.current);
  }, [status, channel, wakeChrome]);

  // ---- stream lifecycle ----------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;
    setStatus('loading');
    let hls;
    let settled = false;

    const fail = () => {
      if (settled) return;
      settled = true;
      setStatus('error');
      onHealth?.(channel.url, false);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      setStatus('playing');
      onHealth?.(channel.url, true);
    };

    const timeout = setTimeout(fail, LOAD_TIMEOUT);
    const onPlaying = () => { clearTimeout(timeout); succeed(); };
    video.addEventListener('playing', onPlaying);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.url; // native HLS (Safari / iOS)
      video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        backBufferLength: 30,
        maxMaxBufferLength: 120,
        liveSyncDurationCount: 3,
      });
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else { clearTimeout(timeout); fail(); }
      });
    } else {
      clearTimeout(timeout);
      fail();
    }

    return () => {
      clearTimeout(timeout);
      video.removeEventListener('playing', onPlaying);
      if (hls) hls.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel, attempt, onHealth]);

  // ---- controls ------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    wakeChrome();
  }, [wakeChrome]);

  const toggleFullscreen = useCallback(async () => {
    wakeChrome();
    try {
      if (document.fullscreenElement) {
        // Release the lock first, then leave fullscreen.
        try { screen.orientation?.unlock?.(); } catch { /* unsupported */ }
        await document.exitFullscreen?.();
        return;
      }

      const el = frameRef.current;
      if (!el) return;

      // Prefer the standard path.
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => el.requestFullscreen());
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (videoRef.current?.webkitEnterFullscreen) {
        // iPhone Safari exposes no element fullscreen — only the native video
        // player, which handles its own rotation.
        videoRef.current.webkitEnterFullscreen();
        return;
      }

      // Rotate to landscape for the (16:9) video. Only meaningful on phones;
      // desktops reject this and it's a no-op, which is fine.
      try {
        await screen.orientation?.lock?.('landscape');
      } catch {
        /* not supported / not allowed (desktop, iOS, non-installed PWA) */
      }
    } catch {
      /* user gesture expired or fullscreen blocked — ignore */
    }
  }, [wakeChrome]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack typing
      if (e.key === 'Escape' && !document.fullscreenElement) return onBack?.();
      if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
      else if (e.key.toLowerCase() === 'm') toggleMute();
      wakeChrome();
    };
    const onFs = () => {
      const on = !!document.fullscreenElement;
      setIsFullscreen(on);
      // Fullscreen can end via Esc, the back gesture or system UI — none of
      // which run our toggle, so always drop the orientation lock here too.
      if (!on) {
        try { screen.orientation?.unlock?.(); } catch { /* unsupported */ }
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, [onBack, onNext, onPrev, toggleFullscreen, toggleMute, wakeChrome]);

  // Safety net: if the player unmounts while still locked/fullscreen, clean up.
  useEffect(() => () => {
    try { screen.orientation?.unlock?.(); } catch { /* unsupported */ }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  // ---- touch gestures: swipe L/R to zap ------------------------------------
  // These live on the stage container, so touches on the overlay buttons bubble
  // up here too. Without this guard a tap on Mute/Fullscreen was swallowed as a
  // "tap the video" gesture (it toggled chrome and the re-render ate the click).
  const fromControl = (e) => !!e.target?.closest?.('button, [role="button"]');

  const onTouchStart = (e) => {
    if (fromControl(e)) { touch.current = null; return; }
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e) => {
    const start = touch.current;
    touch.current = null;
    if (!start || fromControl(e)) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.4) {
      tap();
      (dx < 0 ? onNext : onPrev)?.();
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      setChrome((c) => (c ? false : (wakeChrome(), true)));
    }
  };

  return (
    <div
      ref={frameRef}
      className={`stage ${chrome ? 'chrome-on' : 'chrome-off'}`}
      onMouseMove={wakeChrome}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <video ref={videoRef} playsInline autoPlay className="stage-video" />

      {status === 'loading' && (
        <div className="stage-state">
          <Loader2 className="spin" size={34} />
          <span>Tuning in…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="stage-state error">
          <AlertTriangle size={34} />
          <span>This stream is offline or geo-blocked.</span>
          <div className="stage-actions">
            <button className="btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw size={15} /> Try again
            </button>
            {onNext && (
              <button className="btn-ghost primary" onClick={onNext}>
                <SkipForward size={15} /> Next channel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay controls */}
      <div className="stage-controls">
        {onPrev && (
          <button className="stage-btn" onClick={onPrev} title="Previous (←)" aria-label="Previous channel">
            <SkipBack size={20} />
          </button>
        )}
        {onNext && (
          <button className="stage-btn" onClick={onNext} title="Next (→)" aria-label="Next channel">
            <SkipForward size={20} />
          </button>
        )}
        <span className="stage-spacer" />
        <button className="stage-btn" onClick={toggleMute} title="Mute (M)" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button className="stage-btn" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>
    </div>
  );
}
