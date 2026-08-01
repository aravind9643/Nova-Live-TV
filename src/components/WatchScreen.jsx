import { Suspense, lazy } from 'react';
import { ArrowLeft, Star, Radio, History, Play, Loader2 } from 'lucide-react';
import { channelKey } from '../lib/useLibrary';

const Player = lazy(() => import('./Player'));

// A dedicated "watch" screen: the video plus a rail of recently-watched
// channels underneath, so zapping doesn't mean going back to the grid.
export default function WatchScreen({
  channel, recent, onBack, onPrev, onNext, onPlay,
  favorite, onToggleFavorite, onHealth, statusOf,
}) {
  // Don't show the channel you're already watching in the rail.
  const rail = recent.filter((c) => channelKey(c) !== channelKey(channel));

  return (
    <div className="watch">
      <header className="watch-bar">
        <button className="watch-back" onClick={onBack} aria-label="Back to channels">
          <ArrowLeft size={20} />
        </button>
        <div className="watch-heading">
          <div className="watch-name">{channel.name}</div>
          <div className="watch-sub">
            <span className="live-dot" /> LIVE · {channel.primary}
            {channel.quality && <span className="q-tag">{channel.quality}</span>}
          </div>
        </div>
        <button
          className={`watch-fav ${favorite ? 'on' : ''}`}
          onClick={() => onToggleFavorite(channel)}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
        >
          <Star size={20} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </header>

      <Suspense fallback={
        <div className="stage stage-fallback">
          <div className="stage-state">
            <Loader2 className="spin" size={34} />
            <span>Starting player…</span>
          </div>
        </div>
      }>
        <Player
          channel={channel}
          onPrev={onPrev}
          onNext={onNext}
          onHealth={onHealth}
          onBack={onBack}
        />
      </Suspense>

      <div className="watch-body">
        {rail.length > 0 ? (
          <section className="rail-section">
            <h2 className="rail-title"><History size={15} /> Recently watched</h2>
            <div className="rail">
              {rail.map((c) => {
                const health = statusOf ? statusOf(c.url) : 'unknown';
                return (
                  <button
                    key={channelKey(c)}
                    className={`rail-item ${health === 'bad' ? 'is-dead' : ''}`}
                    onClick={() => onPlay(c)}
                    title={c.name}
                  >
                    <span className="rail-thumb">
                      {c.logo
                        ? <img src={c.logo} alt="" loading="lazy" decoding="async" width="120" height="72" />
                        : <Radio size={20} />}
                      <span className="rail-play"><Play size={16} fill="currentColor" /></span>
                    </span>
                    <span className="rail-name">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="watch-hint">
            Channels you watch will appear here for quick access.
          </p>
        )}

        <p className="watch-tip">
          Swipe the video left or right to change channel · <kbd>←</kbd> <kbd>→</kbd> to zap ·
          {' '}<kbd>F</kbd> fullscreen · <kbd>M</kbd> mute
        </p>
      </div>
    </div>
  );
}
