/**
 * Load Testing Configuration
 *
 * Configure your Supabase credentials and test parameters here.
 * Copy this to config.local.js and fill in your actual values.
 */

// Default configuration - override in config.local.js
export const config = {
  // Supabase Configuration
  supabaseUrl: __ENV.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseAnonKey: __ENV.SUPABASE_ANON_KEY || 'your-anon-key',

  // Test User Credentials (create a test user for load testing)
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
    password: __ENV.TEST_USER_PASSWORD || 'loadtest123',
  },

  // Test Thresholds
  thresholds: {
    // HTTP request duration thresholds
    http_req_duration_p95: 2000, // 95% of requests should be below 2s
    http_req_duration_p99: 5000, // 99% of requests should be below 5s

    // Error rate threshold
    http_req_failed_rate: 0.01, // Less than 1% of requests should fail
  },

  // Default test scenarios
  scenarios: {
    // Smoke test - minimal load to verify system works
    smoke: {
      vus: 1,
      duration: '30s',
    },

    // Load test - normal expected load
    load: {
      stages: [
        { duration: '1m', target: 10 }, // Ramp up to 10 users
        { duration: '3m', target: 10 }, // Stay at 10 users
        { duration: '1m', target: 0 }, // Ramp down
      ],
    },

    // Stress test - beyond normal capacity
    stress: {
      stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 50 }, // Peak load
        { duration: '2m', target: 100 }, // Stress load
        { duration: '5m', target: 100 }, // Stay at stress
        { duration: '2m', target: 0 }, // Ramp down
      ],
    },

    // Spike test - sudden traffic spike
    spike: {
      stages: [
        { duration: '10s', target: 100 }, // Sudden spike
        { duration: '1m', target: 100 }, // Stay at spike
        { duration: '10s', target: 0 }, // Quick drop
      ],
    },

    // Soak test - extended duration
    soak: {
      stages: [
        { duration: '5m', target: 20 }, // Ramp up
        { duration: '30m', target: 20 }, // Extended duration
        { duration: '5m', target: 0 }, // Ramp down
      ],
    },
  },
};

// API Endpoints for testing
export const endpoints = {
  // Auth endpoints
  auth: {
    signIn: '/auth/v1/token?grant_type=password',
    signUp: '/auth/v1/signup',
    signOut: '/auth/v1/logout',
    user: '/auth/v1/user',
  },

  // REST API endpoints (PostgREST)
  rest: {
    // Core tables
    organizations: '/rest/v1/organizations',
    projects: '/rest/v1/projects',
    investors: '/rest/v1/investors',
    subscriptions: '/rest/v1/subscriptions',
    payments: '/rest/v1/payments',
    coupons: '/rest/v1/coupons',
    echeances: '/rest/v1/echeances',
    tranches: '/rest/v1/tranches',
    profiles: '/rest/v1/profiles',
    memberships: '/rest/v1/memberships',
  },

  // Edge Functions
  functions: {
    analyzePayment: '/functions/v1/analyze-payment',
    analyzePaymentBatch: '/functions/v1/analyze-payment-batch',
    sendCouponReminders: '/functions/v1/send-coupon-reminders',
    regenerateEcheancier: '/functions/v1/regenerate-echeancier',
    importRegistre: '/functions/v1/import-registre',
  },
};
