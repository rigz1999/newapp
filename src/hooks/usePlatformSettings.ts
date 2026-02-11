import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlatformSettings(userId: string | undefined) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMfaEnabled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'mfa_enabled')
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setMfaEnabled(data.value === true);
        } else {
          setMfaEnabled(false);
        }
        setLoading(false);
      });
  }, [userId]);

  return { mfaEnabled, loading };
}
