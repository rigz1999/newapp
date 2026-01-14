/**
 * Soak Test (Endurance Test)
 *
 * Tests the system's behavior under sustained load over an extended period.
 * Identifies memory leaks, connection pool exhaustion, and other issues.
 *
 * Run with:
 *   k6 run load-tests/tests/soak-test.js
 *
 * Note: This test runs for 1 hour by default. Adjust duration as needed.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTimes = new Trend('response_times');
const totalRequests = new Counter('total_requests');

// Soak test configuration - sustained moderate load
export const options = {
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 20 }, // Ramp up
        { duration: '50m', target: 20 }, // Sustained load for ~50 minutes
        { duration: '5m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'],
    error_rate: ['rate<0.05'],
  },
};

export function setup() {
  const supabaseUrl = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

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
    return { authenticated: false, supabaseUrl, anonKey };
  }

  const authData = JSON.parse(authResponse.body);
  console.log('Soak Test starting - will run for approximately 1 hour');

  return {
    authenticated: true,
    accessToken: authData.access_token,
    supabaseUrl,
    anonKey,
  };
}

export default function (data) {
  if (!data.authenticated) {
    sleep(5);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: data.anonKey,
    Authorization: `Bearer ${data.accessToken}`,
  };

  const baseUrl = data.supabaseUrl;

  // Simulate realistic user patterns over time
  const iteration = __ITER;

  // Vary the request patterns to simulate realistic usage
  if (iteration % 5 === 0) {
    // Dashboard load (most common)
    group('Dashboard Pattern', () => {
      const startTime = Date.now();
      const responses = http.batch([
        ['GET', `${baseUrl}${endpoints.rest.projects}?select=*&limit=10`, { headers }],
        ['GET', `${baseUrl}${endpoints.rest.payments}?select=count&status=eq.pending`, { headers }],
        ['GET', `${baseUrl}${endpoints.rest.coupons}?select=*&order=date_paiement.asc&limit=5`, { headers }],
      ]);
      responseTimes.add(Date.now() - startTime);
      totalRequests.add(3);

      const success = check(responses, {
        'dashboard load successful': (rs) => rs.every((r) => r.status === 200),
      });
      errorRate.add(!success);
    });
  } else if (iteration % 5 === 1) {
    // Project browsing
    group('Project Browsing', () => {
      const startTime = Date.now();
      const response = http.get(
        `${baseUrl}${endpoints.rest.projects}?select=*,tranches(count)&limit=25`,
        { headers }
      );
      responseTimes.add(Date.now() - startTime);
      totalRequests.add(1);

      const success = check(response, {
        'projects list successful': (r) => r.status === 200,
      });
      errorRate.add(!success);
    });
  } else if (iteration % 5 === 2) {
    // Investor lookup
    group('Investor Lookup', () => {
      const startTime = Date.now();
      const response = http.get(
        `${baseUrl}${endpoints.rest.investors}?select=*,subscriptions(count)&limit=25`,
        { headers }
      );
      responseTimes.add(Date.now() - startTime);
      totalRequests.add(1);

      const success = check(response, {
        'investors list successful': (r) => r.status === 200,
      });
      errorRate.add(!success);
    });
  } else if (iteration % 5 === 3) {
    // Payment review
    group('Payment Review', () => {
      const startTime = Date.now();
      const response = http.get(
        `${baseUrl}${endpoints.rest.payments}?select=*,subscription:subscriptions(*,investor:investors(*))&limit=25`,
        { headers }
      );
      responseTimes.add(Date.now() - startTime);
      totalRequests.add(1);

      const success = check(response, {
        'payments with details successful': (r) => r.status === 200,
      });
      errorRate.add(!success);
    });
  } else {
    // Complex query
    group('Complex Query', () => {
      const startTime = Date.now();
      const response = http.get(
        `${baseUrl}${endpoints.rest.subscriptions}?select=*,investor:investors(*),project:projects(*)&limit=20`,
        { headers }
      );
      responseTimes.add(Date.now() - startTime);
      totalRequests.add(1);

      const success = check(response, {
        'complex query successful': (r) => r.status === 200,
      });
      errorRate.add(!success);
    });
  }

  // Realistic think time
  sleep(2 + Math.random() * 3);
}

export function teardown() {
  console.log('Soak Test completed');
  console.log('Review metrics for degradation patterns over time');
}
