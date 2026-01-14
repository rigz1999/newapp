/**
 * Load Testing Utility Functions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const apiDuration = new Trend('api_duration');

/**
 * Generate request headers for Supabase API
 */
export function getHeaders(accessToken = null, anonKey) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${anonKey}`,
  };
  return headers;
}

/**
 * Make an authenticated API request
 */
export function apiRequest(method, url, body = null, headers = {}) {
  const params = { headers };
  let response;

  const startTime = Date.now();

  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, params);
      break;
    case 'POST':
      response = http.post(url, body ? JSON.stringify(body) : null, params);
      break;
    case 'PUT':
      response = http.put(url, body ? JSON.stringify(body) : null, params);
      break;
    case 'PATCH':
      response = http.patch(url, body ? JSON.stringify(body) : null, params);
      break;
    case 'DELETE':
      response = http.del(url, params);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  const duration = Date.now() - startTime;
  apiDuration.add(duration);

  return response;
}

/**
 * Authenticate a user and return tokens
 */
export function authenticateUser(supabaseUrl, anonKey, email, password) {
  const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;

  const response = http.post(
    authUrl,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
    }
  );

  const success = check(response, {
    'authentication successful': (r) => r.status === 200,
    'access token received': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    const body = JSON.parse(response.body);
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      user: body.user,
    };
  }

  return null;
}

/**
 * Check response status and record metrics
 */
export function checkResponse(response, checks) {
  const success = check(response, checks);
  errorRate.add(!success);
  return success;
}

/**
 * Random sleep between requests (simulates user think time)
 */
export function thinkTime(minSeconds = 1, maxSeconds = 3) {
  const duration = minSeconds + Math.random() * (maxSeconds - minSeconds);
  sleep(duration);
}

/**
 * Generate random data for testing
 */
export const randomData = {
  email: () => `loadtest_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
  name: () => `LoadTest User ${Math.random().toString(36).substring(7)}`,
  amount: () => Math.floor(Math.random() * 100000) + 1000,
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }),
};

/**
 * Pagination helper for list endpoints
 */
export function paginatedRequest(baseUrl, headers, page = 0, limit = 25) {
  const offset = page * limit;
  const url = `${baseUrl}?offset=${offset}&limit=${limit}`;
  return apiRequest('GET', url, null, headers);
}

/**
 * Build query string from filters
 */
export function buildQueryString(filters) {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}
