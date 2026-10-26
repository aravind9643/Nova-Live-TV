import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './lib/i18n';
// Self-hosted fonts: no request to Google (GDPR), no extra origin, no reflow.
import './fonts.css';
import './styles.css';
import { initErrorReporting } from './lib/errors';
import { inject as injectAnalytics } from '@vercel/analytics';

initErrorReporting();
// Cookie-less page analytics; a no-op until enabled in the Vercel dashboard.
if (import.meta.env.PROD) injectAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);

// Register the offline shell in production only — a SW in dev fights Vite's HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* unsupported / blocked — the app works fine without it */
    });
  });
}
