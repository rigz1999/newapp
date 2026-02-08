// ============================================
// Logger Utility with Sentry Integration
// Path: src/utils/logger.ts
// ============================================

import * as Sentry from '@sentry/react';

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) {
      console.log('[App]', ...args);
    }
  },

  error: (error: Error | string, context?: Record<string, unknown>) => {
    // Always log to console in development
    if (isDev) {
      console.error('[Error]', error, context);
    }

    // Send to Sentry in all environments (if configured)
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context,
        level: 'error',
      });
    } else {
      Sentry.captureMessage(String(error), {
        extra: context,
        level: 'error',
      });
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[Warning]', ...args);
    }

    // Also send warnings to Sentry (lower priority)
    const message = args
      .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join(' ');

    Sentry.captureMessage(message, {
      level: 'warning',
    });
  },

  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) {
      console.info('[Info]', ...args);
    }
  },

  debug: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) {
      console.debug('[Debug]', ...args);
    }
  },

  // New method: Add breadcrumb for context
  addBreadcrumb: (message: string, data?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({
      message,
      data,
      level: 'info',
    });
  },
};
