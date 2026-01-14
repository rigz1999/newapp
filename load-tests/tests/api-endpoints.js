/**
 * API Endpoints Load Test
 *
 * Tests the main REST API endpoints for performance under load.
 *
 * Run with:
 *   k6 run load-tests/tests/api-endpoints.js
 *
 * With environment variables:
 *   k6 run -e SUPABASE_URL=https://xxx.supabase.co -e SUPABASE_ANON_KEY=xxx load-tests/tests/api-endpoints.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const requestsPerEndpoint = new Counter('requests_per_endpoint');
const projectsLatency = new Trend('projects_latency');
const investorsLatency = new Trend('investors_latency');
const paymentsLatency = new Trend('payments_latency');
const dashboardLatency = new Trend('dashboard_latency');

// Test configuration
export const options = {
  scenarios: {
    api_load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // Ramp up
        { duration: '2m', target: 10 }, // Steady state
        { duration: '30s', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.05'],
  },
};

// Setup function - runs once before the test
export function setup() {
  const supabaseUrl = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

  // Authenticate test user
  const authResponse = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: config.testUser.email,
      password: config.testUser.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
    }
  );

  if (authResponse.status !== 200) {
    console.error('Authentication failed. Make sure test user exists.');
    console.error(`Status: ${authResponse.status}`);
    console.error(`Response: ${authResponse.body}`);
    return { authenticated: false, supabaseUrl, anonKey };
  }

  const authData = JSON.parse(authResponse.body);
  console.log(`Authenticated as: ${authData.user.email}`);

  return {
    authenticated: true,
    accessToken: authData.access_token,
    userId: authData.user.id,
    supabaseUrl,
    anonKey,
  };
}

// Main test function
export default function (data) {
  if (!data.authenticated) {
    console.error('Skipping test - not authenticated');
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: data.anonKey,
    Authorization: `Bearer ${data.accessToken}`,
  };

  const baseUrl = data.supabaseUrl;

  // Test Groups
  group('Projects API', () => {
    // List projects
    const startTime = Date.now();
    const listResponse = http.get(
      `${baseUrl}${endpoints.rest.projects}?select=*&limit=25`,
      { headers }
    );
    projectsLatency.add(Date.now() - startTime);
    requestsPerEndpoint.add(1, { endpoint: 'projects_list' });

    const listSuccess = check(listResponse, {
      'projects list status 200': (r) => r.status === 200,
      'projects list returns array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!listSuccess);

    sleep(0.5);

    // Get projects with filters
    const filterResponse = http.get(
      `${baseUrl}${endpoints.rest.projects}?select=*&status=eq.active&limit=10`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'projects_filtered' });

    check(filterResponse, {
      'filtered projects status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  group('Investors API', () => {
    const startTime = Date.now();
    const listResponse = http.get(
      `${baseUrl}${endpoints.rest.investors}?select=*&limit=25`,
      { headers }
    );
    investorsLatency.add(Date.now() - startTime);
    requestsPerEndpoint.add(1, { endpoint: 'investors_list' });

    const success = check(listResponse, {
      'investors list status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);

    sleep(0.5);

    // Search investors
    const searchResponse = http.get(
      `${baseUrl}${endpoints.rest.investors}?select=*&or=(nom.ilike.*test*,prenom.ilike.*test*)&limit=10`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'investors_search' });

    check(searchResponse, {
      'investors search status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  group('Payments API', () => {
    const startTime = Date.now();
    const listResponse = http.get(
      `${baseUrl}${endpoints.rest.payments}?select=*&limit=25`,
      { headers }
    );
    paymentsLatency.add(Date.now() - startTime);
    requestsPerEndpoint.add(1, { endpoint: 'payments_list' });

    const success = check(listResponse, {
      'payments list status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);

    sleep(0.5);

    // Get payments with status filter
    const pendingResponse = http.get(
      `${baseUrl}${endpoints.rest.payments}?select=*&status=eq.pending&limit=25`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'payments_pending' });

    check(pendingResponse, {
      'pending payments status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  group('Dashboard Stats Query', () => {
    // Simulate dashboard load - multiple parallel queries
    const startTime = Date.now();

    const responses = http.batch([
      ['GET', `${baseUrl}${endpoints.rest.projects}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.investors}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.payments}?select=count`, { headers }],
      [
        'GET',
        `${baseUrl}${endpoints.rest.subscriptions}?select=count`,
        { headers },
      ],
    ]);

    dashboardLatency.add(Date.now() - startTime);
    requestsPerEndpoint.add(4, { endpoint: 'dashboard_stats' });

    const success = check(responses, {
      'all dashboard queries successful': (rs) =>
        rs.every((r) => r.status === 200),
    });
    errorRate.add(!success);
  });

  sleep(1);

  group('Subscriptions API', () => {
    const listResponse = http.get(
      `${baseUrl}${endpoints.rest.subscriptions}?select=*,investor:investors(*),project:projects(*)&limit=25`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'subscriptions_with_relations' });

    const success = check(listResponse, {
      'subscriptions with relations status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  });

  sleep(1);

  group('Coupons and Echeances', () => {
    const couponsResponse = http.get(
      `${baseUrl}${endpoints.rest.coupons}?select=*&limit=25`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'coupons_list' });

    check(couponsResponse, {
      'coupons list status 200': (r) => r.status === 200,
    });

    sleep(0.5);

    const echeancesResponse = http.get(
      `${baseUrl}${endpoints.rest.echeances}?select=*,coupon:coupons(*)&limit=25`,
      { headers }
    );
    requestsPerEndpoint.add(1, { endpoint: 'echeances_list' });

    check(echeancesResponse, {
      'echeances list status 200': (r) => r.status === 200,
    });
  });

  // Think time between iterations
  sleep(Math.random() * 2 + 1);
}

// Teardown function
export function teardown(data) {
  if (data.authenticated) {
    console.log('Test completed successfully');
  } else {
    console.log('Test completed with authentication issues');
  }
}
