import { memo } from 'react';
import { Play, Radio, Star, AlertTriangle } from 'lucide-react';
import { logoSrc, onLogoError } from '../lib/img';
import { flagOf } from '../lib/flags';

function ChannelCard({ channel, onPlay, favorite, onToggleFavorite, health = 'unknown' }) {
  const country = channel.country?.[0];
  const sub = [channel.primary, country].filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  const flag = flagOf(country);

  return (
    <div className={`card ${health === 'bad' ? 'is-dead' : ''}`}>
      <button
        className="card-hit"
        onClick={() => onPlay(channel)}
        title={health === 'bad' ? `${channel.name} — didn't load last time` : channel.name}
      >
        <span className="card-thumb">
          {channel.logo ? (
            <img
              src={logoSrc(channel.logo)}
              alt=""
              loading="lazy"
              decoding="async"
              width="160"
              height="100"
              onError={(e) => onLogoError(e, channel.logo, (img) => {
                img.style.display = 'none';
                img.nextSibling.style.display = 'grid';
              })}
            />
          ) : null}
          <span className="card-fallback" style={{ display: channel.logo ? 'none' : 'grid' }}>
            <Radio size={26} />
          </span>
          <span className="card-play" aria-hidden><Play size={18} fill="currentColor" /></span>
          {channel.quality && <span className="tag card-q">{channel.quality}</span>}
          {health === 'good' && <span className="card-ok" title="Played successfully before" />}
          {health === 'bad' && (
            <span className="card-dead" title="Didn't load last time"><AlertTriangle size={11} /></span>
          )}
        </span>
        <span className="card-meta">
          <span className="card-name">{channel.name}</span>
          <span className="card-sub">{flag && <img className="flag" src={flag} alt="" loading="lazy" width="16" height="12" />}{sub}</span>
        </span>
      </button>

      <button
        className={`card-fav ${favorite ? 'on' : ''}`}
        aria-label={favorite ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`}
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(channel)}
      >
        <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export default memo(ChannelCard);
