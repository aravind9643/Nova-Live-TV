// Opt-in error reporting. Set VITE_SENTRY_DSN to enable; without it nothing is
// loaded and no data leaves the browser. The SDK is fetched lazily so it never
// weighs on first paint.

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initErrorReporting() {
  if (!DSN || !import.meta.env.PROD) return;
  import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        release: import.meta.env.VITE_RELEASE,
        sampleRate: 1,
        // Dead/geo-blocked streams are expected, not bugs — and ad/extension
        // noise isn't ours to fix.
        ignoreErrors: [/adsbygoogle/i, /ResizeObserver loop/i, /NotAllowedError/i, /AbortError/i],
        denyUrls: [/pagead2\.googlesyndication\.com/, /extensions\//, /^chrome-extension:\/\//],
      });
    })
    .catch(() => { /* blocked by an extension — fine */ });
}
