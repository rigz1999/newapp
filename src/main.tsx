import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './config/sentry';
import { initWebVitals } from './utils/webVitals';

// Initialize error tracking only if user has previously consented (RGPD)
// For new users, Sentry will be initialized after consent via the cookie banner
initSentry();
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
