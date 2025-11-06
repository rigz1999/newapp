// ============================================
// Environment Variable Validation
// Path: src/config/env.ts
// ============================================

/**
 * Validates required environment variables on app startup
 * Throws an error if any required variables are missing
 */

interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  storage: {
    bucketPaymentProofs: string;
    bucketPaymentProofsTemp: string;
    bucketRibs: string;
  };
  limits: {
    maxFileSizeDocuments: number;
    maxFileSizeImages: number;
    maxFileSizeRib: number;
  };
  pagination: {
    itemsPerPage: number;
  };
  features: {
    enableRealtimeUpdates: boolean;
    enableAdvancedFilters: boolean;
  };
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = import.meta.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please ensure ${key} is set in your .env file.\n` +
      `See .env.example for reference.`
    );
  }

  return value || '';
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}: ${value}. Using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

function getEnvVarAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (!value) return defaultValue;

  return value === 'true' || value === '1';
}

// Validate and export environment configuration
export const env: EnvConfig = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  storage: {
    bucketPaymentProofs: getEnvVar('VITE_STORAGE_BUCKET_PAYMENT_PROOFS', false) || 'payment-proofs',
    bucketPaymentProofsTemp: getEnvVar('VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP', false) || 'payment-proofs-temp',
    bucketRibs: getEnvVar('VITE_STORAGE_BUCKET_RIBS', false) || 'ribs',
  },
  limits: {
    maxFileSizeDocuments: getEnvVarAsNumber('VITE_MAX_FILE_SIZE_DOCUMENTS', 10),
    maxFileSizeImages: getEnvVarAsNumber('VITE_MAX_FILE_SIZE_IMAGES', 5),
    maxFileSizeRib: getEnvVarAsNumber('VITE_MAX_FILE_SIZE_RIB', 5),
  },
  pagination: {
    itemsPerPage: getEnvVarAsNumber('VITE_ITEMS_PER_PAGE', 25),
  },
  features: {
    enableRealtimeUpdates: getEnvVarAsBoolean('VITE_ENABLE_REALTIME_UPDATES', true),
    enableAdvancedFilters: getEnvVarAsBoolean('VITE_ENABLE_ADVANCED_FILTERS', true),
  },
};

// Log configuration in development (without sensitive data)
if (import.meta.env.DEV) {
  console.log('Environment configuration loaded:', {
    supabase: {
      url: env.supabase.url,
      anonKey: '***' + env.supabase.anonKey.slice(-8),
    },
    storage: env.storage,
    limits: env.limits,
    pagination: env.pagination,
    features: env.features,
  });
}
