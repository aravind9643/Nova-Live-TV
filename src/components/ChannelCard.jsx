import { memo } from 'react';
import { Play, Radio, Star, AlertTriangle } from 'lucide-react';

function ChannelCard({ channel, onPlay, favorite, onToggleFavorite, health = 'unknown' }) {
  return (
    <button
      className={`card ${health === 'bad' ? 'is-dead' : ''}`}
      onClick={() => onPlay(channel)}
      title={health === 'bad' ? `${channel.name} — didn't load last time` : channel.name}
    >
      <div className="card-thumb">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            decoding="async"
            width="160"
            height="110"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="card-fallback" style={{ display: channel.logo ? 'none' : 'flex' }}>
          <Radio size={26} />
        </div>

        <div className="card-hover">
          <span className="card-play"><Play size={20} fill="currentColor" /></span>
        </div>

        {channel.quality && <span className="card-q">{channel.quality}</span>}
        {health === 'good' && <span className="card-ok" title="Played successfully before" />}
        {health === 'bad' && (
          <span className="card-dead" title="Didn't load last time">
            <AlertTriangle size={11} />
          </span>
        )}

        <span
          role="button"
          tabIndex={0}
          className={`card-fav ${favorite ? 'on' : ''}`}
          title={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); e.stopPropagation(); onToggleFavorite(channel);
            }
          }}
        >
          <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
        </span>
      </div>

      <div className="card-meta">
        <span className="card-name">{channel.name}</span>
        <span className="card-group">{channel.primary}</span>
      </div>
    </button>
  );
}

export default memo(ChannelCard);
