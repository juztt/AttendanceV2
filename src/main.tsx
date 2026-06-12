import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker (vite-plugin-pwa will inject the registration).
// Wrapped in try/catch so a missing virtual module in dev doesn't break the app.
if ('serviceWorker' in navigator) {
  try {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    }).catch(() => { /* ignore */ });
  } catch { /* ignore */ }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
