import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://test.supabase.co';

// Mock Supabase Auth endpoints
export const handlers = [
  // Sign in with password
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json();

    // Mock successful login
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2025-01-01T00:00:00Z',
        },
      });
    }

    // Mock failed login
    return HttpResponse.json(
      {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      },
      { status: 400 }
    );
  }),

  // Get session
  http.get(`${SUPABASE_URL}/auth/v1/user`, () =>
    HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2025-01-01T00:00:00Z',
    })
  ),

  // Sign out
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => HttpResponse.json({}, { status: 204 })),

  // Get memberships (for role checking)
  http.get(`${SUPABASE_URL}/rest/v1/memberships`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (userId === 'eq.user-123') {
      return HttpResponse.json([
        {
          id: 'membership-1',
          user_id: 'user-123',
          org_id: 'org-1',
          role: 'admin',
          created_at: '2025-01-01T00:00:00Z',
        },
      ]);
    }

    return HttpResponse.json([]);
  }),

  // Get organizations
  http.get(`${SUPABASE_URL}/rest/v1/organizations`, () =>
    HttpResponse.json([
      {
        id: 'org-1',
        name: 'Test Organization',
        created_at: '2025-01-01T00:00:00Z',
      },
    ])
  ),

  // Get projects
  http.get(`${SUPABASE_URL}/rest/v1/projects`, () =>
    HttpResponse.json([
      {
        id: 'project-1',
        projet: 'Test Project',
        emetteur: 'Test Company',
        created_at: '2025-01-01T00:00:00Z',
      },
    ])
  ),

  // Get investors
  http.get(`${SUPABASE_URL}/rest/v1/investors`, () =>
    HttpResponse.json([
      {
        id: 'investor-1',
        nom: 'Doe',
        prenom: 'John',
        email: 'john.doe@example.com',
        created_at: '2025-01-01T00:00:00Z',
      },
    ])
  ),

  // Get subscriptions
  http.get(`${SUPABASE_URL}/rest/v1/subscriptions`, () =>
    HttpResponse.json([
      {
        id: 'subscription-1',
        investor_id: 'investor-1',
        tranche_id: 'tranche-1',
        montant_investi: 10000,
        created_at: '2025-01-01T00:00:00Z',
      },
    ])
  ),

  // Get payments
  http.get(`${SUPABASE_URL}/rest/v1/payments`, () =>
    HttpResponse.json([
      {
        id: 'payment-1',
        subscription_id: 'subscription-1',
        montant: 500,
        statut: 'paid',
        created_at: '2025-01-01T00:00:00Z',
      },
    ])
  ),

  // POST handlers for creating resources
  http.post(`${SUPABASE_URL}/rest/v1/projects`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        ...body,
        id: 'new-project-id',
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  http.post(`${SUPABASE_URL}/rest/v1/investors`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        ...body,
        id: 'new-investor-id',
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Storage endpoints
  http.post(`${SUPABASE_URL}/storage/v1/object/*`, () =>
    HttpResponse.json({
      Key: 'mock-file-key',
      Id: 'mock-file-id',
    })
  ),

  http.delete(`${SUPABASE_URL}/storage/v1/object/*`, () => HttpResponse.json({}, { status: 200 })),
];
