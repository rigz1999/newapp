// ============================================
// Realtime Data Hooks with Pagination
// Path: src/hooks/useRealtimeData.ts
//
// Specific hooks for key tables with auto-refresh and pagination
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeDataOptions<T> {
  initialData?: T[];
  enabled?: boolean;
  onDataChange?: (data: T[]) => void;
  pageSize?: number;
  page?: number;
}

interface UseRealtimeDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  isLive: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

// ============================================
// Payments Realtime Hook with Pagination
// ============================================
export function useRealtimePayments(
  options: UseRealtimeDataOptions<Record<string, unknown>> = {}
): UseRealtimeDataReturn<Record<string, unknown>> {
  const {
    initialData = [],
    enabled = true,
    onDataChange,
    pageSize: initialPageSize = 50,
    page: initialPage = 1,
  } = options;

  const [data, setData] = useState<Record<string, unknown>[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPayments = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const {
          data: payments,
          error: fetchError,
          count,
        } = await supabase
          .from('paiements')
          .select(
            `
          *,
          tranche:tranches(tranche_name),
          investisseur:investisseurs(nom_raison_sociale)
        `,
            { count: 'exact' }
          )
          .order('date_paiement', { ascending: false })
          .range(start, end)
          .abortSignal(signal!);

        if (signal?.aborted) {
          return;
        }
        if (fetchError) {
          throw fetchError;
        }
        setData(payments || []);
        setTotalCount(count || 0);
        if (onDataChange) {
          onDataChange(payments || []);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setError(err as Error);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, pageSize, onDataChange]
  );

  useEffect(() => {
    if (enabled) {
      const abortController = new AbortController();
      fetchPayments(abortController.signal);
      return () => abortController.abort();
    }
  }, [enabled, fetchPayments]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'paiements',
    enabled,
    onChange: () => {
      fetchPayments();
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchPayments,
    // Pagination
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1); // Reset to first page when changing page size
    },
    nextPage: () => setPage((prev: number) => Math.min(prev + 1, totalPages)),
    prevPage: () => setPage((prev: number) => Math.max(prev - 1, 1)),
  };
}

// ============================================
// Investors Realtime Hook with Pagination
// ============================================
export function useRealtimeInvestors(
  options: UseRealtimeDataOptions<Record<string, unknown>> = {}
): UseRealtimeDataReturn<Record<string, unknown>> {
  const {
    initialData = [],
    enabled = true,
    onDataChange,
    pageSize: initialPageSize = 50,
    page: initialPage = 1,
  } = options;

  const [data, setData] = useState<Record<string, unknown>[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvestors = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const {
          data: investors,
          error: fetchError,
          count,
        } = await supabase
          .from('investisseurs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(start, end)
          .abortSignal(signal!);

        if (signal?.aborted) {
          return;
        }
        if (fetchError) {
          throw fetchError;
        }
        setData(investors || []);
        setTotalCount(count || 0);
        if (onDataChange) {
          onDataChange(investors || []);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setError(err as Error);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, pageSize, onDataChange]
  );

  useEffect(() => {
    if (enabled) {
      const abortController = new AbortController();
      fetchInvestors(abortController.signal);
      return () => abortController.abort();
    }
  }, [enabled, fetchInvestors]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'investisseurs',
    enabled,
    onChange: () => {
      fetchInvestors();
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchInvestors,
    // Pagination
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    nextPage: () => setPage((prev: number) => Math.min(prev + 1, totalPages)),
    prevPage: () => setPage((prev: number) => Math.max(prev - 1, 1)),
  };
}

// ============================================
// Projects Realtime Hook with Pagination
// ============================================
export function useRealtimeProjects(
  options: UseRealtimeDataOptions<Record<string, unknown>> = {}
): UseRealtimeDataReturn<Record<string, unknown>> {
  const {
    initialData = [],
    enabled = true,
    onDataChange,
    pageSize: initialPageSize = 50,
    page: initialPage = 1,
  } = options;

  const [data, setData] = useState<Record<string, unknown>[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProjects = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const {
          data: projects,
          error: fetchError,
          count,
        } = await supabase
          .from('projets')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(start, end)
          .abortSignal(signal!);

        if (signal?.aborted) {
          return;
        }
        if (fetchError) {
          throw fetchError;
        }
        setData(projects || []);
        setTotalCount(count || 0);
        if (onDataChange) {
          onDataChange(projects || []);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setError(err as Error);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, pageSize, onDataChange]
  );

  useEffect(() => {
    if (enabled) {
      const abortController = new AbortController();
      fetchProjects(abortController.signal);
      return () => abortController.abort();
    }
  }, [enabled, fetchProjects]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'projets',
    enabled,
    onChange: () => {
      fetchProjects();
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchProjects,
    // Pagination
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    nextPage: () => setPage((prev: number) => Math.min(prev + 1, totalPages)),
    prevPage: () => setPage((prev: number) => Math.max(prev - 1, 1)),
  };
}

// ============================================
// Subscriptions Realtime Hook with Pagination
// ============================================
export function useRealtimeSubscriptions(
  options: UseRealtimeDataOptions<Record<string, unknown>> = {}
): UseRealtimeDataReturn<Record<string, unknown>> {
  const {
    initialData = [],
    enabled = true,
    onDataChange,
    pageSize: initialPageSize = 50,
    page: initialPage = 1,
  } = options;

  const [data, setData] = useState<Record<string, unknown>[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSubscriptions = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const {
          data: subscriptions,
          error: fetchError,
          count,
        } = await supabase
          .from('souscriptions')
          .select(
            `
          *,
          investisseur:investisseurs(nom_raison_sociale),
          tranche:tranches(tranche_name)
        `,
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .range(start, end)
          .abortSignal(signal!);

        if (signal?.aborted) {
          return;
        }
        if (fetchError) {
          throw fetchError;
        }
        setData(subscriptions || []);
        setTotalCount(count || 0);
        if (onDataChange) {
          onDataChange(subscriptions || []);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setError(err as Error);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, pageSize, onDataChange]
  );

  useEffect(() => {
    if (enabled) {
      const abortController = new AbortController();
      fetchSubscriptions(abortController.signal);
      return () => abortController.abort();
    }
  }, [enabled, fetchSubscriptions]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'souscriptions',
    enabled,
    onChange: () => {
      fetchSubscriptions();
    },
  });

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchSubscriptions,
    // Pagination
    page,
    pageSize,
    totalCount,
    totalPages,
    hasMore,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    nextPage: () => setPage((prev: number) => Math.min(prev + 1, totalPages)),
    prevPage: () => setPage((prev: number) => Math.max(prev - 1, 1)),
  };
}
