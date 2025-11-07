// ============================================
// Config Module Exports
// Path: src/config/index.ts
// ============================================

import { env } from './env';

// Export environment config
export { env };

// Export Sentry config
export * from './sentry';

// Create fileUpload config alias for backward compatibility
export const fileUpload = {
  maxSizeDocuments: env.limits.maxFileSizeDocuments,
  maxSizeImages: env.limits.maxFileSizeImages,
  maxSizeRib: env.limits.maxFileSizeRib,
};

// Export storage config for easy access
export const storage = env.storage;

// Export pagination config
export const pagination = env.pagination;

// Export features config
export const features = env.features;
