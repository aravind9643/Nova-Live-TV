import { useCallback, useEffect, useState } from 'react';

// Desktop layout breakpoint — must match the 1024px query in styles.css.
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

// navigator.onLine, kept live.
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// The PWA install prompt (Chromium only). `install` is null until the browser
// says the app is installable, and again once it's installed.
export function useInstallPrompt() {
  const [event, setEvent] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvent(e); };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    event.prompt();
    await event.userChoice.catch(() => {});
    setEvent(null); // a prompt can only be used once
  }, [event]);

  return event ? install : null;
}
