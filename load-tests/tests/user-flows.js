/**
 * User Flows Load Test
 *
 * Tests critical user journeys through the application.
 *
 * Run with:
 *   k6 run load-tests/tests/user-flows.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, endpoints } from '../config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration');
const dashboardLoadDuration = new Trend('dashboard_load_duration');
const projectDetailDuration = new Trend('project_detail_duration');
const investorSearchDuration = new Trend('investor_search_duration');

// Test configuration
export const options = {
  scenarios: {
    user_journey: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5 }, // Ramp up slowly
        { duration: '3m', target: 10 }, // Normal load
        { duration: '1m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
    error_rate: ['rate<0.05'],
    login_duration: ['p(95)<2000'],
    dashboard_load_duration: ['p(95)<3000'],
  },
};

// Helper function to simulate think time
function thinkTime(min = 1, max = 3) {
  sleep(min + Math.random() * (max - min));
}

// Setup function
export function setup() {
  console.log('Starting User Flows Load Test');
  return {
    supabaseUrl: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
    testUser: config.testUser,
  };
}

// Main test function - simulates a complete user session
export default function (data) {
  const { supabaseUrl, anonKey, testUser } = data;
  let accessToken = null;
  let userId = null;

  // User Journey: Login -> Dashboard -> Browse Projects -> View Details -> Search Investors

  group('1. User Login', () => {
    const startTime = Date.now();

    const loginResponse = http.post(
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

    loginDuration.add(Date.now() - startTime);

    const success = check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'received access token': (r) => {
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
      const body = JSON.parse(loginResponse.body);
      accessToken = body.access_token;
      userId = body.user.id;
    }
  });

  if (!accessToken) {
    console.error('Login failed, skipping remaining tests');
    sleep(5);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  };

  thinkTime(1, 2); // User takes time after login

  group('2. Load Dashboard', () => {
    const startTime = Date.now();

    // Dashboard typically loads multiple resources in parallel
    const responses = http.batch([
      // Get user profile
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.profiles}?id=eq.${userId}`,
        { headers },
      ],
      // Get user memberships (organizations)
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.memberships}?user_id=eq.${userId}&select=*,organization:organizations(*)`,
        { headers },
      ],
      // Get recent projects
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.projects}?select=*&order=created_at.desc&limit=5`,
        { headers },
      ],
      // Get payment stats
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.payments}?select=count&status=eq.pending`,
        { headers },
      ],
      // Get upcoming coupons
      [
        'GET',
        `${supabaseUrl}${endpoints.rest.coupons}?select=*&order=date_paiement.asc&limit=10`,
        { headers },
      ],
    ]);

    dashboardLoadDuration.add(Date.now() - startTime);

    const success = check(responses, {
      'all dashboard requests successful': (rs) =>
        rs.every((r) => r.status === 200 || r.status === 204),
    });

    errorRate.add(!success);
  });

  thinkTime(2, 4); // User views dashboard

  group('3. Browse Projects List', () => {
    // Load projects with pagination
    const projectsResponse = http.get(
      `${supabaseUrl}${endpoints.rest.projects}?select=*,tranches(count)&order=created_at.desc&limit=25`,
      { headers }
    );

    const success = check(projectsResponse, {
      'projects list loaded': (r) => r.status === 200,
      'projects data is array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  });

  thinkTime(1, 3); // User browses list

  group('4. View Project Details', () => {
    // First get a project ID
    const projectsResponse = http.get(
      `${supabaseUrl}${endpoints.rest.projects}?select=id&limit=1`,
      { headers }
    );

    if (projectsResponse.status === 200) {
      try {
        const projects = JSON.parse(projectsResponse.body);
        if (projects.length > 0) {
          const projectId = projects[0].id;
          const startTime = Date.now();

          // Load project details with related data
          const responses = http.batch([
            // Project details
            [
              'GET',
              `${supabaseUrl}${endpoints.rest.projects}?id=eq.${projectId}&select=*`,
              { headers },
            ],
            // Project tranches
            [
              'GET',
              `${supabaseUrl}${endpoints.rest.tranches}?project_id=eq.${projectId}&select=*`,
              { headers },
            ],
            // Project subscriptions
            [
              'GET',
              `${supabaseUrl}${endpoints.rest.subscriptions}?project_id=eq.${projectId}&select=*,investor:investors(nom,prenom)&limit=50`,
              { headers },
            ],
            // Project coupons
            [
              'GET',
              `${supabaseUrl}${endpoints.rest.coupons}?project_id=eq.${projectId}&select=*`,
              { headers },
            ],
          ]);

          projectDetailDuration.add(Date.now() - startTime);

          const success = check(responses, {
            'project details loaded': (rs) =>
              rs.every((r) => r.status === 200 || r.status === 204),
          });

          errorRate.add(!success);
        }
      } catch (e) {
        console.error('Error parsing projects response');
      }
    }
  });

  thinkTime(3, 5); // User examines project details

  group('5. Search and Filter Investors', () => {
    const startTime = Date.now();

    // Search investors
    const searchResponse = http.get(
      `${supabaseUrl}${endpoints.rest.investors}?select=*,subscriptions(count)&order=nom.asc&limit=25`,
      { headers }
    );

    investorSearchDuration.add(Date.now() - startTime);

    const success = check(searchResponse, {
      'investors search successful': (r) => r.status === 200,
    });

    errorRate.add(!success);

    thinkTime(1, 2);

    // Apply filters
    const filteredResponse = http.get(
      `${supabaseUrl}${endpoints.rest.investors}?select=*&or=(nom.ilike.*a*,prenom.ilike.*a*)&limit=25`,
      { headers }
    );

    check(filteredResponse, {
      'filtered investors successful': (r) => r.status === 200,
    });
  });

  thinkTime(2, 4);

  group('6. View Payments', () => {
    // Load payments with filters
    const paymentsResponse = http.get(
      `${supabaseUrl}${endpoints.rest.payments}?select=*,subscription:subscriptions(*,investor:investors(*))&order=created_at.desc&limit=25`,
      { headers }
    );

    const success = check(paymentsResponse, {
      'payments loaded': (r) => r.status === 200,
    });

    errorRate.add(!success);

    thinkTime(1, 2);

    // Filter by status
    const pendingPayments = http.get(
      `${supabaseUrl}${endpoints.rest.payments}?select=*&status=eq.pending&limit=25`,
      { headers }
    );

    check(pendingPayments, {
      'pending payments loaded': (r) => r.status === 200,
    });
  });

  // End of user session - natural think time before next iteration
  thinkTime(2, 5);
}

// Teardown
export function teardown(data) {
  console.log('User Flows Load Test completed');
}
