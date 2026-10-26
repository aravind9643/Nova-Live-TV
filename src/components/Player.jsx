import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Volume2, VolumeX, Maximize, Minimize, Loader2, AlertTriangle,
  SkipBack, SkipForward, RotateCcw, PictureInPicture2, Cast, WifiOff,
} from 'lucide-react';
import { tap } from '../lib/haptics';

const LOAD_TIMEOUT = 12000;   // declare a stream dead after this
const CHROME_HIDE_MS = 3200;  // auto-hide overlay controls while playing
const SWIPE_MIN = 60;         // px before a horizontal swipe counts as a zap
const SWIPE_CLOSE = 110;      // px of downward swipe that closes the player

// hls.js is only needed where HLS isn't native (i.e. not Safari/iOS), and the
// light build covers live streams — load it on demand.
let hlsModule = null;
const loadHls = () => (hlsModule ??= import('hls.js/dist/hls.light.mjs').then((m) => m.default));
const canPip = typeof document !== 'undefined' && !!document.pictureInPictureEnabled;

// The video surface. This is an embedded panel (not a modal) — the watch screen
// owns the surrounding layout, title bar and channel rail.
export default function Player({ channel, onPrev, onNext, onHealth, onBack }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const touch = useRef(null);
  const hideTimer = useRef(null);

  const [status, setStatus] = useState('loading'); // loading | playing | error
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [castable, setCastable] = useState(false);
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
    let disposed = false;

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
    } else {
      loadHls().then((Hls) => {
        if (disposed) return;
        if (!Hls.isSupported()) { clearTimeout(timeout); fail(); return; }
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
      }).catch(() => { clearTimeout(timeout); fail(); });
    }

    return () => {
      disposed = true;
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

  const changeVolume = useCallback((v) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = v;
    el.muted = v === 0;
    setVolume(v);
    setMuted(v === 0);
    wakeChrome();
  }, [wakeChrome]);

  // Casting: AirPlay on Safari, the Remote Playback API (Chromecast etc.) on
  // Chromium. Remote playback only works for native `src` playback, not hls.js
  // (MSE) — so the button simply stays hidden where it can't work.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let watchId = null;
    const onAirplay = (e) => setCastable(e.availability === 'available');
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      video.addEventListener('webkitplaybacktargetavailabilitychanged', onAirplay);
    } else if (video.remote?.watchAvailability) {
      video.remote.watchAvailability((ok) => setCastable(ok))
        .then((id) => { watchId = id; })
        .catch(() => setCastable(false));
    }
    return () => {
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', onAirplay);
      if (watchId !== null) video.remote?.cancelWatchAvailability(watchId).catch(() => {});
    };
  }, [channel]);

  const cast = useCallback(() => {
    const video = videoRef.current;
    wakeChrome();
    if (!video) return;
    if (video.webkitShowPlaybackTargetPicker) video.webkitShowPlaybackTargetPicker();
    else video.remote?.prompt().catch(() => {});
  }, [wakeChrome]);

  const togglePip = useCallback(async () => {
    wakeChrome();
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch { /* not allowed until the stream plays */ }
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
      else if (e.key.toLowerCase() === 'p' && canPip) togglePip();
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
  }, [onBack, onNext, onPrev, toggleFullscreen, toggleMute, togglePip, wakeChrome]);

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
    } else if (dy > SWIPE_CLOSE && Math.abs(dy) > Math.abs(dx) * 1.4 && !document.fullscreenElement) {
      onBack?.();
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
      <video ref={videoRef} playsInline autoPlay x-webkit-airplay="allow" className="stage-video" />

      {status === 'loading' && (
        <div className="stage-state">
          <Loader2 className="spin" size={34} />
          <span>Tuning in…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="stage-state error">
          <AlertTriangle size={34} />
          {navigator.onLine === false
            ? <span><WifiOff size={14} /> You’re offline — reconnect and try again.</span>
            : <span>This stream is offline or geo-blocked.</span>}
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
        <span className="stage-live"><span className="live-dot" /> LIVE</span>
        <span className="stage-spacer" />
        <button className="stage-btn" onClick={toggleMute} title="Mute (M)" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          className="stage-volume"
          type="range" min="0" max="1" step="0.05"
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          aria-label="Volume"
        />
        {castable && (
          <button className="stage-btn" onClick={cast} title="Cast to a device" aria-label="Cast to a device">
            <Cast size={20} />
          </button>
        )}
        {canPip && (
          <button className="stage-btn" onClick={togglePip} title="Picture in picture (P)" aria-label="Picture in picture">
            <PictureInPicture2 size={20} />
          </button>
        )}
        <button className="stage-btn" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>
    </div>
  );
}
