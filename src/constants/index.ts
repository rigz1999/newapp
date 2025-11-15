// ============================================
// Application Constants
// Path: src/constants/index.ts
// ============================================

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAYMENTS_PAGE_SIZE: 50,
  SUBSCRIPTIONS_PAGE_SIZE: 50,
  INVESTORS_PAGE_SIZE: 25,
  PROJECTS_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File size limits (in MB)
 */
export const FILE_LIMITS = {
  DOCUMENTS: 10,
  IMAGES: 5,
  RIB: 5,
  PAYMENT_PROOF: 10,
} as const;

/**
 * Timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  FILE_UPLOAD: 60000, // 60 seconds
  DEBOUNCE_SEARCH: 300, // 300ms
  TOAST_DURATION: 5000, // 5 seconds
} as const;

/**
 * Status values
 */
export const PAYMENT_STATUS = {
  PAID: 'payé',
  PENDING: 'en_attente',
  CANCELLED: 'annulé',
} as const;

export const RIB_STATUS = {
  MISSING: 'manquant',
  PENDING: 'en_attente',
  VALIDATED: 'validé',
  REJECTED: 'rejeté',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  SIREN_LENGTH: 9,
  SIRET_LENGTH: 14,
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_NAME_LENGTH: 255,
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'DD/MM/YYYY HH:mm',
} as const;

/**
 * Cache durations (in seconds)
 */
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  ANALYZE_PAYMENT: 'analyze-payment',
  ANALYZE_PAYMENT_BATCH: 'analyze-payment-batch',
  IMPORT_REGISTRE: 'import-registre',
  REGENERATE_ECHEANCIER: 'regenerate-echeancier',
  SEND_INVITATION: 'send-invitation',
  ACCEPT_INVITATION: 'accept-invitation',
  SEND_COUPON_REMINDERS: 'send-coupon-reminders',
  CHANGE_PASSWORD: 'change-password',
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  FILTERS_PAYMENTS: 'payments-filters',
  FILTERS_SUBSCRIPTIONS: 'subscriptions-filters',
  FILTERS_INVESTORS: 'investors-filters',
  FILTERS_PROJECTS: 'projects-filters',
  RECENT_SEARCHES: 'recent-searches',
} as const;

/**
 * UI constants
 */
export const UI = {
  TOAST_POSITION: 'top-right',
  MODAL_ANIMATION_DURATION: 200,
  SKELETON_COUNT: 5,
} as const;
