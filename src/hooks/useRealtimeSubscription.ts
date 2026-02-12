// ============================================
// Realtime Subscription Hook
// Path: src/hooks/useRealtimeSubscription.ts
//
// Generic hook for Supabase realtime subscriptions
// Auto-subscribes/unsubscribes to table changes
// ============================================

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { features } from '../config';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions<
  T extends { [key: string]: unknown } = Record<string, unknown>,
> {
  table: string;
  event?: RealtimeEvent;
  filter?: string; // e.g., "project_id=eq.123"
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

interface UseRealtimeSubscriptionReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: Error | null;
}

export function useRealtimeSubscription<
  T extends { [key: string]: unknown } = Record<string, unknown>,
>(options: UseRealtimeSubscriptionOptions<T>): UseRealtimeSubscriptionReturn {
  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Store callbacks in refs so the subscription doesn't churn on every render
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;
  onChangeRef.current = onChange;

  useEffect(() => {
    // Check if realtime is enabled in config
    if (!features.enableRealtimeUpdates || !enabled) {
      return;
    }

    // Create channel
    const channelName = `${table}-changes-${Math.random().toString(36).substr(2, 9)}`;
    const newChannel = supabase.channel(channelName);

    // Build filter string
    let _subscriptionFilter = `public:${table}`;
    if (filter) {
      _subscriptionFilter += `:${filter}`;
    }

    // Subscribe to changes
    const subscription = newChannel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      {
        event,
        schema: 'public',
        table,
        filter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      (payload: RealtimePostgresChangesPayload<T>) => {
        setLastUpdate(new Date());

        // Call specific handlers via refs (stable references)
        if (payload.eventType === 'INSERT' && onInsertRef.current) {
          onInsertRef.current(payload);
        } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
          onUpdateRef.current(payload);
        } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
          onDeleteRef.current(payload);
        }

        // Call generic handler via ref
        if (onChangeRef.current) {
          onChangeRef.current(payload);
        }
      }
    );

    // Subscribe to the channel
    subscription.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CLOSED') {
        setIsConnected(false);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error('Channel subscription error'));
      }
    });

    // Cleanup on unmount
    return () => {
      newChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [table, event, filter, enabled]);

  return {
    isConnected,
    lastUpdate,
    error,
  };
}
