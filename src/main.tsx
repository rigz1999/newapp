import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry, Sentry } from './config/sentry';
import { initWebVitals } from './utils/webVitals';

// Catch unhandled promise rejections globally
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  Sentry.captureException(error);
  if (import.meta.env.DEV) {
    console.error('Unhandled promise rejection:', event.reason);
  }
});

// Initialize error tracking only if user has previously consented (RGPD)
// For new users, Sentry will be initialized after consent via the cookie banner
initSentry();
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
