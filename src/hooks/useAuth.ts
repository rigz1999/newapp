import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      // Check if user is super admin
      const { data: memberships } = await supabase
        .from('memberships')
        .select('role, org_id')
        .eq('user_id', userId);

      console.log('🔍 DEBUG - memberships:', memberships); // DEBUG

      // User is admin if they have super_admin role with org_id = NULL
      const isSuperAdmin = memberships?.some(
        m => m.role === 'super_admin' && m.org_id === null
      ) ?? false;

      console.log('🔍 DEBUG - isSuperAdmin calculated:', isSuperAdmin); // DEBUG

      setIsAdmin(isSuperAdmin);
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  return { user, loading, isAdmin };
}
```

---

**After updating, refresh and check the console again. You should see:**
```
🔍 DEBUG - memberships: [{ role: 'super_admin', org_id: null }]
🔍 DEBUG - isSuperAdmin calculated: true
🔍 DEBUG - isAdmin: true