import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_PFU_RATE = 0.314;

export function usePlatformSettings(userId: string | undefined) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [pfuRate, setPfuRate] = useState(DEFAULT_PFU_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMfaEnabled(false);
      setPfuRate(DEFAULT_PFU_RATE);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['mfa_enabled', 'default_tax_rate_physical'])
      .then(({ data, error }) => {
        if (!error && data) {
          for (const row of data) {
            if (row.key === 'mfa_enabled') {
              setMfaEnabled(row.value === true);
            } else if (row.key === 'default_tax_rate_physical') {
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

  return { mfaEnabled, pfuRate, loading };
}
