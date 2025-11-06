import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_STORAGE_BUCKET_PAYMENT_PROOFS: 'payment-proofs',
    VITE_STORAGE_BUCKET_PAYMENT_PROOFS_TEMP: 'payment-proofs-temp',
    VITE_STORAGE_BUCKET_RIBS: 'ribs',
    VITE_MAX_FILE_SIZE_DOCUMENTS: '10',
    VITE_MAX_FILE_SIZE_IMAGES: '5',
    VITE_MAX_FILE_SIZE_RIB: '5',
    VITE_ITEMS_PER_PAGE: '25',
    VITE_ENABLE_REALTIME_UPDATES: 'true',
    VITE_ENABLE_ADVANCED_FILTERS: 'true',
    DEV: false,
  },
  writable: true,
});
