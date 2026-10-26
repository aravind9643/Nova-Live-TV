import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

// The corner box the shared player docks into while you browse. The video
// itself is rendered by <PlayerHost>, positioned over `slot`.
export default function MiniPlayer({ channel, onSlot, onExpand, onClose }) {
  const { t } = useI18n();
  return (
    <div className="mini pop-in" role="region" aria-label={t('nowPlaying', { name: channel.name })}>
      <div className="mini-video" ref={onSlot} />
      <div className="mini-bar">
        <span className="live-dot" />
        <button className="mini-name" onClick={onExpand}>{channel.name}</button>
        <button className="icon-btn sm" onClick={onClose} aria-label={t('stop')}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
