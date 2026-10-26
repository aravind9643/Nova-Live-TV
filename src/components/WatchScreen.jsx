import { Suspense, lazy, useState } from 'react';
import {
  ArrowLeft, Star, Radio, History, Play, Loader2, Share2, Check, ListVideo, AlertTriangle,
} from 'lucide-react';
import { channelKey } from '../lib/useLibrary';
import AdSlot from './AdSlot';
import { logoSrc, onLogoError } from '../lib/img';
import { flagOf } from '../lib/flags';

const Player = lazy(() => import('./Player'));

function Thumb({ channel, size = 22 }) {
  return (
    <span className="thumb">
      {channel.logo
        ? <img src={logoSrc(channel.logo, 96)} alt="" loading="lazy" decoding="async" width="96" height="60" onError={(e) => onLogoError(e, channel.logo)} />
        : <Radio size={size} />}
    </span>
  );
}

// A dedicated "watch" screen. Phones: video pinned on top, details and lists
// scroll underneath. Desktop: video + details on the left, a queue on the right.
export default function WatchScreen({
  channel, recent, upNext = [], onBack, onPrev, onNext, onPlay,
  favorite, onToggleFavorite, onHealth, statusOf,
}) {
  const [shared, setShared] = useState(false);
  // Don't show the channel you're already watching in the rail.
  const rail = recent.filter((c) => channelKey(c) !== channelKey(channel));
  const health = (c) => (statusOf ? statusOf(c.url) : 'unknown');

  const share = async () => {
    const data = { title: `${channel.name} · NOVA Live TV`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch { /* dismissed */ }
  };

  const meta = [channel.primary, channel.country?.[0], channel.language?.[0]]
    .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="watch">
      <header className="watch-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back to channels">
          <ArrowLeft size={22} />
        </button>
        <span className="watch-bar-title">{channel.name}</span>
      </header>

      <div className="watch-layout">
        <div className="watch-primary">
          <div className="stage-wrap">
            <Suspense fallback={
              <div className="stage">
                <div className="stage-state">
                  <Loader2 className="spin" size={34} />
                  <span>Starting player…</span>
                </div>
              </div>
            }>
              <Player channel={channel} onPrev={onPrev} onNext={onNext} onHealth={onHealth} onBack={onBack} />
            </Suspense>
          </div>

          <section className="watch-info">
            <div className="watch-id">
              <Thumb channel={channel} size={26} />
              <div className="watch-title">
                <h1>{channel.name}</h1>
                <div className="watch-meta">
                  <span className="live-badge"><span className="live-dot" /> LIVE</span>
                  {channel.quality && <span className="tag">{channel.quality}</span>}
                  {meta.map((m) => (
                    <span key={m} className="meta-item">
                      {m === channel.country?.[0] && flagOf(m) && (
                        <img className="flag" src={flagOf(m)} alt="" width="16" height="12" />
                      )}
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="watch-actions">
              <button
                className={`btn ${favorite ? 'fav-on' : ''}`}
                onClick={() => onToggleFavorite(channel)}
                aria-pressed={favorite}
              >
                <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
                {favorite ? 'Saved' : 'Favorite'}
              </button>
              <button className="btn" onClick={share}>
                {shared ? <Check size={17} /> : <Share2 size={17} />} {shared ? 'Link copied' : 'Share'}
              </button>
            </div>
            <p className="watch-tip">
              Swipe the video to change channel · <kbd>←</kbd> <kbd>→</kbd> zap · <kbd>F</kbd> fullscreen · <kbd>M</kbd> mute · <kbd>P</kbd> picture-in-picture · swipe down to close
            </p>
          </section>

          <AdSlot slot="player" format="auto" className="ad-player" />
        </div>

        <aside className="watch-side">
          {rail.length > 0 && (
            <section className="side-section">
              <h2 className="side-title"><History size={16} /> Recently watched</h2>
              <div className="rail">
                {rail.map((c) => (
                  <button
                    key={channelKey(c)}
                    className={`rail-item ${health(c) === 'bad' ? 'is-dead' : ''}`}
                    onClick={() => onPlay(c)}
                    title={c.name}
                  >
                    <span className="rail-thumb">
                      <Thumb channel={c} />
                      <span className="rail-play"><Play size={14} fill="currentColor" /></span>
                    </span>
                    <span className="rail-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {upNext.length > 0 && (
            <section className="side-section">
              <h2 className="side-title"><ListVideo size={16} /> Up next</h2>
              <div className="queue">
                {upNext.map((c) => (
                  <button
                    key={channelKey(c)}
                    className={`queue-item ${health(c) === 'bad' ? 'is-dead' : ''}`}
                    onClick={() => onPlay(c)}
                  >
                    <Thumb channel={c} />
                    <span className="queue-text">
                      <span className="queue-name">{c.name}</span>
                      <span className="queue-sub">
                        {health(c) === 'bad' && <AlertTriangle size={11} />}
                        {c.primary}{c.quality ? ` · ${c.quality}` : ''}
                      </span>
                    </span>
                    <Play size={16} className="queue-go" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
