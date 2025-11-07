// ============================================
// Logger Utility
// Path: src/utils/logger.ts
// ============================================

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log('[App]', ...args);
  },
  error: (..._args: any[]) => {
    // Errors silently ignored in production
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn('[Warning]', ...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info('[Info]', ...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug('[Debug]', ...args);
  }
};
