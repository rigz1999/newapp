/**
 * Smoke Test
 *
 * Quick validation test to verify the system is working correctly.
 * Run this before other load tests to ensure basic functionality.
 *
 * Run with:
 *   k6 run load-tests/tests/smoke-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');

// Smoke test configuration - minimal load, strict thresholds
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(99)<3000'], // All requests under 3s
    http_req_failed: ['rate<0.01'], // Less than 1% failures
    error_rate: ['rate<0.01'],
  },
};

export function setup() {
  console.log('Starting Smoke Test...');
  console.log(`Supabase URL: ${config.supabaseUrl}`);

  return {
    supabaseUrl: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
    testUser: config.testUser,
  };
}

export default function (data) {
  const { supabaseUrl, anonKey, testUser } = data;

  // Test 1: Health Check - verify Supabase is reachable
  group('Health Check', () => {
    const response = http.get(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
      },
    });

    const success = check(response, {
      'Supabase API is reachable': (r) =>
        r.status === 200 || r.status === 401 || r.status === 404,
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 2: Authentication
  let accessToken = null;

  group('Authentication', () => {
    const authResponse = http.post(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
        },
      }
    );

    const success = check(authResponse, {
      'login successful': (r) => r.status === 200,
      'access token received': (r) => {
        try {
          const body = JSON.parse(r.body);
          if (body.access_token) {
            accessToken = body.access_token;
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);

    if (!success) {
      console.error('Authentication failed!');
      console.error(`Status: ${authResponse.status}`);
      console.error(`Response: ${authResponse.body}`);
    }
  });

  if (!accessToken) {
    console.error('Cannot continue smoke test without authentication');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  };

  sleep(1);

  // Test 3: Core API Endpoints
  group('Projects Endpoint', () => {
    const response = http.get(
      `${supabaseUrl}${endpoints.rest.projects}?select=*&limit=5`,
      { headers }
    );

    const success = check(response, {
      'projects endpoint returns 200': (r) => r.status === 200,
      'projects returns valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  group('Investors Endpoint', () => {
    const response = http.get(
      `${supabaseUrl}${endpoints.rest.investors}?select=*&limit=5`,
      { headers }
    );

    const success = check(response, {
      'investors endpoint returns 200': (r) => r.status === 200,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  group('Payments Endpoint', () => {
    const response = http.get(
      `${supabaseUrl}${endpoints.rest.payments}?select=*&limit=5`,
      { headers }
    );

    const success = check(response, {
      'payments endpoint returns 200': (r) => r.status === 200,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  group('Subscriptions Endpoint', () => {
    const response = http.get(
      `${supabaseUrl}${endpoints.rest.subscriptions}?select=*&limit=5`,
      { headers }
    );

    const success = check(response, {
      'subscriptions endpoint returns 200': (r) => r.status === 200,
    });

    errorRate.add(!success);
  });

  sleep(0.5);

  // Test 4: Complex Query (with joins)
  group('Complex Query', () => {
    const response = http.get(
      `${supabaseUrl}${endpoints.rest.subscriptions}?select=*,investor:investors(nom,prenom),project:projects(nom)&limit=5`,
      { headers }
    );

    const success = check(response, {
      'complex query returns 200': (r) => r.status === 200,
      'complex query returns valid data': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 5: Batch request (simulating dashboard)
  group('Dashboard Batch Load', () => {
    const responses = http.batch([
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.projects}?select=count`,
        { headers },
      ],
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.investors}?select=count`,
        { headers },
      ],
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.payments}?select=count`,
        { headers },
      ],
    ]);

    const success = check(responses, {
      'all batch requests successful': (rs) =>
        rs.every((r) => r.status === 200),
    });

    errorRate.add(!success);
  });

  sleep(2);
}

export function teardown() {
  console.log('Smoke Test completed');
  console.log('If all checks passed, the system is ready for load testing');
}
