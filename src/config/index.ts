// ============================================
// Application Configuration
// Path: src/config/index.ts
//
// Centralizes all environment variables and configuration
// with type-safe access and fallback defaults
// ============================================

interface AppConfig {
  // Supabase
  supabase: {
    url: string;
    anonKey: string;
  };

  // Storage
  storage: {
    buckets: {
      paymentProofs: string;
      paymentProofsTemp: string;
      ribs: string;
    };
  };

  // File Upload Limits (in MB)
  fileUpload: {
    maxSizeDocuments: number;
    maxSizeImages: number;
    maxSizeRib: number;
  };

  // Pagination
  pagination: {
    itemsPerPage: number;
  };

  // Feature Flags
  features: {
    enableRealtimeUpdates: boolean;
    enableAdvancedFilters: boolean;
  };
}

const getEnv = (key: string, defaultValue: string): string => {
  return import.meta.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

export const config: AppConfig = {
  supabase: {
    url: getEnv('VITE_SUPABASE_URL', ''),
    anonKey: getEnv('VITE_SUPABASE_ANON_KEY', ''),
  },

  storage: {
    buckets: {
      paymentProofs: getEnv('VITE_STORAGE_BUCKET_PAYMENT_PROOFS', 'payment-proofs'),
      paymentProofsTemp: getEnv('VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP', 'payment-proofs-temp'),
      ribs: getEnv('VITE_STORAGE_BUCKET_RIBS', 'ribs'),
    },
  },

  fileUpload: {
    maxSizeDocuments: getEnvNumber('VITE_MAX_FILE_SIZE_DOCUMENTS', 10),
    maxSizeImages: getEnvNumber('VITE_MAX_FILE_SIZE_IMAGES', 5),
    maxSizeRib: getEnvNumber('VITE_MAX_FILE_SIZE_RIB', 5),
  },

  pagination: {
    itemsPerPage: getEnvNumber('VITE_ITEMS_PER_PAGE', 25),
  },

  features: {
    enableRealtimeUpdates: getEnvBoolean('VITE_ENABLE_REALTIME_UPDATES', true),
    enableAdvancedFilters: getEnvBoolean('VITE_ENABLE_ADVANCED_FILTERS', true),
  },
};

// Export individual configs for convenience
export const { supabase, storage, fileUpload, pagination, features } = config;
