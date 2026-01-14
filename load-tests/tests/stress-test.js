/**
 * Stress Test
 *
 * Tests the system's behavior under extreme load conditions.
 * Identifies breaking points and system limits.
 *
 * Run with:
 *   k6 run load-tests/tests/stress-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTimes = new Trend('response_times');
const requestCount = new Counter('total_requests');
const failedRequests = new Counter('failed_requests');

// Stress test configuration - gradually increases load to find breaking point
export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Warm up
        { duration: '5m', target: 25 }, // Normal load
        { duration: '5m', target: 50 }, // High load
        { duration: '5m', target: 75 }, // Very high load
        { duration: '5m', target: 100 }, // Stress level
        { duration: '5m', target: 150 }, // Breaking point test
        { duration: '3m', target: 0 }, // Recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // More lenient for stress test
    http_req_failed: ['rate<0.10'], // Allow up to 10% failures at stress
    error_rate: ['rate<0.15'],
  },
};

// Setup
export function setup() {
  const supabaseUrl = config.supabaseUrl;
  const anonKey = config.supabaseAnonKey;

  // Authenticate
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
    console.error('Authentication failed');
    return { authenticated: false, supabaseUrl, anonKey };
  }

  const authData = JSON.parse(authResponse.body);
  console.log('Stress Test starting - authenticated');

  return {
    authenticated: true,
    accessToken: authData.access_token,
    supabaseUrl,
    anonKey,
  };
}

// Main stress test
export default function (data) {
  if (!data.authenticated) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: data.anonKey,
    Authorization: `Bearer ${data.accessToken}`,
  };

  const baseUrl = data.supabaseUrl;

  // Rapid-fire requests to stress the system
  group('High Volume Reads', () => {
    // Multiple quick requests
    const endpoints_to_test = [
      `${baseUrl}${endpoints.rest.projects}?select=*&limit=50`,
      `${baseUrl}${endpoints.rest.investors}?select=*&limit=50`,
      `${baseUrl}${endpoints.rest.payments}?select=*&limit=50`,
      `${baseUrl}${endpoints.rest.subscriptions}?select=*&limit=50`,
    ];

    for (const url of endpoints_to_test) {
      const startTime = Date.now();
      const response = http.get(url, { headers });
      responseTimes.add(Date.now() - startTime);
      requestCount.add(1);

      const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 5s': (r) => r.timings.duration < 5000,
      });

      if (!success) {
        failedRequests.add(1);
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    }
  });

  sleep(0.1); // Minimal delay between request batches

  group('Complex Queries Under Load', () => {
    // Test with joins and filters
    const complexQueries = [
      `${baseUrl}${endpoints.rest.subscriptions}?select=*,investor:investors(*),project:projects(*)&limit=25`,
      `${baseUrl}${endpoints.rest.coupons}?select=*,echeances(*)&limit=25`,
      `${baseUrl}${endpoints.rest.payments}?select=*,subscription:subscriptions(*,investor:investors(*))&limit=25`,
    ];

    for (const url of complexQueries) {
      const startTime = Date.now();
      const response = http.get(url, { headers });
      responseTimes.add(Date.now() - startTime);
      requestCount.add(1);

      const success = check(response, {
        'complex query successful': (r) => r.status === 200,
      });

      if (!success) {
        failedRequests.add(1);
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    }
  });

  sleep(0.1);

  group('Concurrent Batch Requests', () => {
    // Simulate concurrent dashboard load
    const responses = http.batch([
      ['GET', `${baseUrl}${endpoints.rest.projects}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.investors}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.payments}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.coupons}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.subscriptions}?select=count`, { headers }],
    ]);

    requestCount.add(5);

    const success = check(responses, {
      'all batch requests successful': (rs) =>
        rs.every((r) => r.status === 200),
    });

    if (!success) {
      const failed = responses.filter((r) => r.status !== 200).length;
      failedRequests.add(failed);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  // Very short sleep to maximize stress
  sleep(Math.random() * 0.5);
}

// Teardown
export function teardown(data) {
  console.log('Stress Test completed');
  console.log('Check the summary for breaking point analysis');
}
