// ============================================
// Realtime Subscription Hook
// Path: src/hooks/useRealtimeSubscription.ts
//
// Generic hook for Supabase realtime subscriptions
// Auto-subscribes/unsubscribes to table changes
// ============================================

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { features } from '../config';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions<T extends { [key: string]: any } = any> {
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

export function useRealtimeSubscription<T extends { [key: string]: any } = any>(
  options: UseRealtimeSubscriptionOptions<T>
): UseRealtimeSubscriptionReturn {
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

  useEffect(() => {
    // Check if realtime is enabled in config
    if (!features.enableRealtimeUpdates || !enabled) {
      return;
    }

    // Create channel
    const channelName = `${table}-changes-${Math.random().toString(36).substr(2, 9)}`;
    const newChannel = supabase.channel(channelName);

    // Build filter string
    let subscriptionFilter = `public:${table}`;
    if (filter) {
      subscriptionFilter += `:${filter}`;
    }

    // Subscribe to changes
    const subscription = newChannel.on(
      'postgres_changes' as any,
      {
        event,
        schema: 'public',
        table,
        filter,
      } as any,
      (payload: RealtimePostgresChangesPayload<T>) => {
        setLastUpdate(new Date());

        // Call specific handlers
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload);
        }

        // Call generic handler
        if (onChange) {
          onChange(payload);
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
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange, enabled]);

  return {
    isConnected,
    lastUpdate,
    error,
  };
}
