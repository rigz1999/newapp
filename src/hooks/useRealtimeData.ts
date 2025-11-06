// ============================================
// Realtime Data Hooks
// Path: src/hooks/useRealtimeData.ts
//
// Specific hooks for key tables with auto-refresh
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseRealtimeDataOptions<T> {
  initialData?: T[];
  enabled?: boolean;
  onDataChange?: (data: T[]) => void;
}

interface UseRealtimeDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  isLive: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

// ============================================
// Payments Realtime Hook
// ============================================
export function useRealtimePayments(
  options: UseRealtimeDataOptions<any> = {}
): UseRealtimeDataReturn<any> {
  const { initialData = [], enabled = true, onDataChange } = options;
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: payments, error: fetchError } = await supabase
        .from('paiements')
        .select(`
          *,
          tranche:tranches(tranche_name),
          investisseur:investisseurs(nom_raison_sociale)
        `)
        .order('date_paiement', { ascending: false });

      if (fetchError) throw fetchError;
      setData(payments || []);
      if (onDataChange) onDataChange(payments || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    if (enabled) {
      fetchPayments();
    }
  }, [enabled, fetchPayments]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'paiements',
    enabled,
    onChange: () => {
      fetchPayments();
    },
  });

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchPayments,
  };
}

// ============================================
// Investors Realtime Hook
// ============================================
export function useRealtimeInvestors(
  options: UseRealtimeDataOptions<any> = {}
): UseRealtimeDataReturn<any> {
  const { initialData = [], enabled = true, onDataChange } = options;
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvestors = useCallback(async () => {
    setLoading(true);
    try {
      const { data: investors, error: fetchError } = await supabase
        .from('investisseurs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(investors || []);
      if (onDataChange) onDataChange(investors || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    if (enabled) {
      fetchInvestors();
    }
  }, [enabled, fetchInvestors]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'investisseurs',
    enabled,
    onChange: () => {
      fetchInvestors();
    },
  });

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchInvestors,
  };
}

// ============================================
// Projects Realtime Hook
// ============================================
export function useRealtimeProjects(
  options: UseRealtimeDataOptions<any> = {}
): UseRealtimeDataReturn<any> {
  const { initialData = [], enabled = true, onDataChange } = options;
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data: projects, error: fetchError } = await supabase
        .from('projets')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(projects || []);
      if (onDataChange) onDataChange(projects || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    if (enabled) {
      fetchProjects();
    }
  }, [enabled, fetchProjects]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'projets',
    enabled,
    onChange: () => {
      fetchProjects();
    },
  });

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchProjects,
  };
}

// ============================================
// Subscriptions Realtime Hook
// ============================================
export function useRealtimeSubscriptions(
  options: UseRealtimeDataOptions<any> = {}
): UseRealtimeDataReturn<any> {
  const { initialData = [], enabled = true, onDataChange } = options;
  const [data, setData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: subscriptions, error: fetchError } = await supabase
        .from('souscriptions')
        .select(`
          *,
          investisseur:investisseurs(nom_raison_sociale),
          tranche:tranches(tranche_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(subscriptions || []);
      if (onDataChange) onDataChange(subscriptions || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [onDataChange]);

  useEffect(() => {
    if (enabled) {
      fetchSubscriptions();
    }
  }, [enabled, fetchSubscriptions]);

  const { isConnected, lastUpdate } = useRealtimeSubscription({
    table: 'souscriptions',
    enabled,
    onChange: () => {
      fetchSubscriptions();
    },
  });

  return {
    data,
    loading,
    error,
    isLive: isConnected,
    lastUpdate,
    refresh: fetchSubscriptions,
  };
}
