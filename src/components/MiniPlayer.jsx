import { Suspense, lazy } from 'react';
import { X, Maximize2, Loader2 } from 'lucide-react';

const Player = lazy(() => import('./Player'));

// Keeps the stream going in a corner while you browse. The whole video is one
// big "expand" target; the player's own controls are hidden at this size.
export default function MiniPlayer({ channel, onExpand, onClose, onHealth }) {
  return (
    <div className="mini pop-in" role="region" aria-label={`Now playing: ${channel.name}`}>
      <div className="mini-video">
        <Suspense fallback={<div className="stage"><div className="stage-state"><Loader2 className="spin" size={22} /></div></div>}>
          <Player channel={channel} onHealth={onHealth} />
        </Suspense>
        <button className="mini-expand" onClick={onExpand} aria-label={`Expand ${channel.name}`}>
          <Maximize2 size={18} />
        </button>
      </div>
      <div className="mini-bar">
        <span className="live-dot" />
        <button className="mini-name" onClick={onExpand}>{channel.name}</button>
        <button className="icon-btn sm" onClick={onClose} aria-label="Stop playback">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
