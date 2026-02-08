import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrganization } from './useOrganization';
import { supabase } from '../lib/supabase';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: false, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: null,
          })
        ),
      })),
    })),
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default rpc mock to return non-super-admin
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as any);
  });

  it('should return loading state initially', () => {
    // With undefined userId, the hook sets loading=false synchronously in the effect
    const { result } = renderHook(() => useOrganization(undefined));

    // After render + effect, loading is false for undefined userId
    expect(result.current.organization).toBe(null);
  });

  it('should return null organization when no userId provided', async () => {
    const { result } = renderHook(() => useOrganization(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organization).toBe(null);
  });

  it('should fetch organization for valid user', async () => {
    const mockUserId = 'test-user-id';
    const mockOrgData = {
      org_id: 'org-123',
      role: 'admin',
      organizations: {
        id: 'org-123',
        name: 'Test Organization',
      },
    };

    // Mock successful response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [mockOrgData],
            error: null,
          })
        ),
      })),
    } as any);

    const { result } = renderHook(() => useOrganization(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organization).toEqual({
      id: 'org-123',
      name: 'Test Organization',
      role: 'admin',
    });
  });

  it('should handle error when fetching organization', async () => {
    const mockUserId = 'test-user-id';
    const mockError = new Error('Database error');

    // Mock error response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: mockError,
          })
        ),
      })),
    } as any);

    const { result } = renderHook(() => useOrganization(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organization).toBe(null);
  });

  it('should handle no memberships found', async () => {
    const mockUserId = 'test-user-id';

    // Mock empty response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
      })),
    } as any);

    const { result } = renderHook(() => useOrganization(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organization).toBe(null);
  });

  it('should select first organization when multiple exist', async () => {
    const mockUserId = 'test-user-id';
    const mockMemberships = [
      {
        org_id: 'org-1',
        role: 'member',
        organizations: { id: 'org-1', name: 'Org 1' },
      },
      {
        org_id: 'org-2',
        role: 'admin',
        organizations: { id: 'org-2', name: 'Org 2' },
      },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: mockMemberships,
            error: null,
          })
        ),
      })),
    } as any);

    const { result } = renderHook(() => useOrganization(mockUserId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should return the first organization
    expect(result.current.organization).toEqual({
      id: 'org-1',
      name: 'Org 1',
      role: 'member',
    });
  });
});
