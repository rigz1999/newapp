import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE;

export function initSentry(): void {
  // Only initialize Sentry if DSN is provided
  if (!SENTRY_DSN) {
    // Silently skip Sentry initialization if not configured
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Performance tracking for specific operations
    tracePropagationTargets: ['localhost', /^\//],

    // Session Replay
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0, // 10% in prod
    replaysOnErrorSampleRate: 1.0, // 100% on errors

    // Release tracking
    release: import.meta.env.VITE_APP_VERSION,

    // Enhanced error context
    beforeSend(event, hint) {
      // Don't send errors in development if no DSN
      if (ENVIRONMENT === 'development' && !SENTRY_DSN) {
        return null;
      }

      // Filter out non-critical errors
      if (event.exception) {
        const error = hint.originalException;

        // Skip network errors that are likely user-side issues
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          return null;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // Common user errors
      'QuotaExceededError',
    ],
  });
}

export { Sentry };
