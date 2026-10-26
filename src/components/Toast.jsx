import { useEffect } from 'react';

const DURATION = 4000;

// A single transient message with an optional action (e.g. Undo).
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, DURATION);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;
  return (
    <div className="toast pop-in" role="status" aria-live="polite" key={toast.id}>
      <span>{toast.message}</span>
      {toast.action && (
        <button className="link-btn" onClick={() => { toast.action.run(); onDone(); }}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
