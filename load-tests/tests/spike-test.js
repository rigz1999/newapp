/**
 * Spike Test
 *
 * Tests the system's behavior under sudden traffic spikes.
 * Useful for testing auto-scaling and recovery capabilities.
 *
 * Run with:
 *   k6 run load-tests/tests/spike-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const spikeResponseTime = new Trend('spike_response_time');

// Spike test configuration
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // Normal load
        { duration: '10s', target: 100 }, // Sudden spike!
        { duration: '1m', target: 100 }, // Stay at spike
        { duration: '10s', target: 5 }, // Quick drop
        { duration: '30s', target: 5 }, // Recovery period
        { duration: '10s', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Lenient during spike
    http_req_failed: ['rate<0.20'], // Allow some failures during spike
    error_rate: ['rate<0.25'],
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
  console.log('Spike Test initialized');

  return {
    authenticated: true,
    accessToken: authData.access_token,
    supabaseUrl,
    anonKey,
  };
}

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

  // Simulate typical user behavior during a spike
  group('Spike Load Requests', () => {
    // Dashboard-like batch request
    const startTime = Date.now();

    const responses = http.batch([
      ['GET', `${baseUrl}${endpoints.rest.projects}?select=*&limit=10`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.investors}?select=count`, { headers }],
      ['GET', `${baseUrl}${endpoints.rest.payments}?select=*&status=eq.pending&limit=10`, { headers }],
    ]);

    spikeResponseTime.add(Date.now() - startTime);

    const success = check(responses, {
      'batch requests during spike': (rs) =>
        rs.filter((r) => r.status === 200).length >= 2, // At least 2 of 3 succeed
    });

    errorRate.add(!success);
  });

  // Minimal delay during spike
  sleep(Math.random() * 0.3);
}

export function teardown() {
  console.log('Spike Test completed');
  console.log('Review metrics to assess spike handling capability');
}
