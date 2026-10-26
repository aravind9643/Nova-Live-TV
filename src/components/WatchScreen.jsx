import { useState } from 'react';
import {
  ArrowLeft, Star, Radio, History, Play, Share2, Check, ListVideo, AlertTriangle,
} from 'lucide-react';
import { channelKey } from '../lib/useLibrary';
import AdSlot from './AdSlot';
import { useI18n } from '../lib/i18n';
import { useMediaQuery, DESKTOP_QUERY } from '../lib/useDevice';
import { logoSrc, onLogoError } from '../lib/img';
import { flagOf } from '../lib/flags';


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
  channel, recent, upNext = [], onBack, onPlay, onSlot,
  favorite, onToggleFavorite, statusOf,
}) {
  const { t } = useI18n();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
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
        <button className="icon-btn" onClick={onBack} aria-label={t('back')}>
          <ArrowLeft size={22} />
        </button>
        <span className="watch-bar-title">{channel.name}</span>
      </header>

      <div className="watch-layout">
        <div className="watch-primary">
          {/* The shared <PlayerHost> video is positioned over this slot. */}
          <div className="stage-wrap">
            <div className="stage-slot" ref={onSlot} />
          </div>

          <section className="watch-info">
            <div className="watch-id">
              <Thumb channel={channel} size={26} />
              <div className="watch-title">
                <h1>{channel.name}</h1>
                <div className="watch-meta">
                  <span className="live-badge"><span className="live-dot" /> {t('liveBadge')}</span>
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
                {favorite ? t('saved') : t('favorite')}
              </button>
              <button className="btn" onClick={share}>
                {shared ? <Check size={17} /> : <Share2 size={17} />} {shared ? t('linkCopied') : t('share')}
              </button>
            </div>
            <p className="watch-tip">
              {t('watchTip')}
            </p>
          </section>

          {/* Desktop: beside the queue. Phones: after it (see below), so the ad
              never sits between the video and the next channels. */}
          {isDesktop && <AdSlot slot="player" format="auto" className="ad-player" />}
        </div>

        <aside className="watch-side">
          {rail.length > 0 && (
            <section className="side-section">
              <h2 className="side-title"><History size={16} /> {t('recentlyWatched')}</h2>
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
              <h2 className="side-title"><ListVideo size={16} /> {t('upNext')}</h2>
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
          {!isDesktop && <AdSlot slot="player" format="auto" className="ad-player" />}
        </aside>
      </div>
    </div>
  );
}
