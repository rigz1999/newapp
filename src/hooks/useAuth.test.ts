import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should set user when session exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            role: 'admin',
            org_id: 'org-1',
          },
        ],
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should detect super admin role', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            role: 'super_admin',
            org_id: null,
          },
        ],
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isAdmin).toBe(true);
    });
  });

  it('should detect organization admin role', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'org-admin@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            role: 'admin',
            org_id: 'org-1',
          },
        ],
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isOrgAdmin).toBe(true);
      expect(result.current.userRole).toBe('admin');
    });
  });

  it('should handle user with no memberships', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'newuser@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOrgAdmin).toBe(false);
      expect(result.current.userRole).toBe(null);
    });
  });

  it('should handle auth state changes', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    let authCallback: any;

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      authCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ role: 'admin', org_id: 'org-1' }],
      }),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate sign-in
    authCallback('SIGNED_IN', { session: { user: mockUser } });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Simulate sign-out
    authCallback('SIGNED_OUT', { session: null });

    await waitFor(() => {
      expect(result.current.user).toBe(null);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  it('should handle errors gracefully', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      },
    });

    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockRejectedValue(new Error('Database error')),
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOrgAdmin).toBe(false);
    });
  });
});
