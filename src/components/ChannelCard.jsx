import { memo } from 'react';
import { Play, Radio, Star } from 'lucide-react';

function ChannelCard({ channel, onPlay, favorite, onToggleFavorite }) {
  return (
    <button className="card" onClick={() => onPlay(channel)}>
      <div className="card-thumb">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="card-fallback" style={{ display: channel.logo ? 'none' : 'flex' }}>
          <Radio size={28} />
        </div>

        <div className="card-hover">
          <span className="card-play"><Play size={22} fill="currentColor" /></span>
        </div>

        {channel.quality && <span className="card-q">{channel.quality}</span>}

        <span
          role="button"
          tabIndex={0}
          className={`card-fav ${favorite ? 'on' : ''}`}
          title={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleFavorite(channel); } }}
        >
          <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
        </span>
      </div>

      <div className="card-meta">
        <span className="card-name" title={channel.name}>{channel.name}</span>
        <span className="card-group">{channel.group}</span>
      </div>
    </button>
  );
}

export default memo(ChannelCard);
