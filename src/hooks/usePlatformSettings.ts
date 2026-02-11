import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlatformSettings() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'mfa_enabled')
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setMfaEnabled(data.value === true);
        }
        setLoading(false);
      });
  }, []);

  return { mfaEnabled, loading };
}
