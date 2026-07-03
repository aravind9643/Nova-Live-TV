import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  X, Volume2, VolumeX, Maximize, Minimize, Loader2, AlertTriangle, Radio,
  SkipBack, SkipForward, Star, RotateCcw,
} from 'lucide-react';

const LOAD_TIMEOUT = 15000; // give a stream 15s to start before declaring it dead

export default function Player({ channel, onClose, onPrev, onNext, favorite, onToggleFavorite, onWatched }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | playing | error
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0); // bump to retry the same channel

  // Record a play in "recently watched" whenever the channel changes.
  useEffect(() => { if (channel) onWatched?.(channel); }, [channel, onWatched]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;
    setStatus('loading');
    let hls;

    const timeout = setTimeout(() => setStatus((s) => (s === 'loading' ? 'error' : s)), LOAD_TIMEOUT);
    const onPlaying = () => { clearTimeout(timeout); setStatus('playing'); };
    video.addEventListener('playing', onPlaying);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.url; // native HLS (Safari)
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
        else { clearTimeout(timeout); setStatus('error'); }
      });
    } else {
      setStatus('error');
    }

    return () => {
      clearTimeout(timeout);
      video.removeEventListener('playing', onPlaying);
      if (hls) hls.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel, attempt]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      else if (e.key === 'ArrowRight') onNext?.();
      else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
      else if (e.key.toLowerCase() === 'm') toggleMute();
    };
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [onClose, onNext, onPrev]);

  // Focus management: move focus into the dialog on open, trap Tab within it,
  // and restore focus to the previously-focused element on close.
  useEffect(() => {
    const shell = shellRef.current;
    const prevFocus = document.activeElement;
    shell?.focus();

    const onTrap = (e) => {
      if (e.key !== 'Tab' || !shell) return;
      const focusables = shell.querySelectorAll('button, [href], video, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    shell?.addEventListener('keydown', onTrap);
    return () => {
      shell?.removeEventListener('keydown', onTrap);
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else shellRef.current?.requestFullscreen?.();
  };

  return (
    <div className="player-overlay fade-in" onClick={onClose}>
      <div
        ref={shellRef}
        className="player-shell pop-in"
        role="dialog"
        aria-modal="true"
        aria-label={`Now playing: ${channel.name}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-video-wrap">
          <video ref={videoRef} playsInline autoPlay className="player-video" />

          {status === 'loading' && (
            <div className="player-state">
              <Loader2 className="spin" size={40} />
              <span>Tuning in…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="player-state error">
              <AlertTriangle size={40} />
              <span>This stream is offline or geo-blocked.</span>
              <div className="player-state-actions">
                <button className="btn-ghost" onClick={() => setAttempt((a) => a + 1)}>
                  <RotateCcw size={15} /> Try again
                </button>
                {onNext && <button className="btn-ghost" onClick={onNext}>Next channel</button>}
              </div>
            </div>
          )}

          {/* Edge zap buttons */}
          {onPrev && <button className="zap zap-prev" onClick={onPrev} title="Previous (←)" aria-label="Previous channel"><SkipBack size={22} /></button>}
          {onNext && <button className="zap zap-next" onClick={onNext} title="Next (→)" aria-label="Next channel"><SkipForward size={22} /></button>}
        </div>

        <div className="player-bar">
          <div className="player-info">
            {channel.logo
              ? <img src={channel.logo} alt="" className="player-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
              : <div className="player-logo placeholder"><Radio size={18} /></div>}
            <div className="player-info-text">
              <div className="player-title">{channel.name}</div>
              <div className="player-sub">
                <span className="live-dot" /> LIVE · {channel.group}
                {channel.quality && <span className="q-tag">{channel.quality}</span>}
              </div>
            </div>
          </div>
          <div className="player-controls">
            <button
              className={`icon-btn ${favorite ? 'faved' : ''}`}
              onClick={() => onToggleFavorite?.(channel)}
              title={favorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={favorite}
            >
              <Star size={20} fill={favorite ? 'currentColor' : 'none'} />
            </button>
            <button className="icon-btn" onClick={toggleMute} title="Mute (M)" aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}>
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button className="icon-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button className="icon-btn close" onClick={onClose} title="Close (Esc)" aria-label="Close player">
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
