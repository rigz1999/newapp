import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_PFU_RATE = 0.314;

export function usePlatformSettings(userId: string | undefined) {
  const [pfuRate, setPfuRate] = useState(DEFAULT_PFU_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPfuRate(DEFAULT_PFU_RATE);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('platform_settings')
      .select('key, value')
      .eq('key', 'default_tax_rate_physical')
      .then(({ data, error }) => {
        if (!error && data) {
          for (const row of data) {
            if (row.key === 'default_tax_rate_physical') {
              const parsed = typeof row.value === 'number' ? row.value : parseFloat(String(row.value));
              if (!isNaN(parsed) && parsed > 0 && parsed < 1) {
                setPfuRate(parsed);
              }
            }
          }
        }
        setLoading(false);
      });
  }, [userId]);

  return { pfuRate, loading };
}
