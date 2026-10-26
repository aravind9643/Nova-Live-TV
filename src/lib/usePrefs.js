import { useCallback, useEffect, useState } from 'react';

// Small persisted UI preferences (theme, hide-broken-streams).
const KEY = 'nova.prefs';
const DEFAULTS = { theme: 'system', hideDead: false };

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return DEFAULTS;
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
  }, [prefs]);

  const setPref = useCallback((k, v) => setPrefs((p) => ({ ...p, [k]: v })), []);
  return { prefs, setPref };
}
