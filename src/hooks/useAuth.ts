import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsOrgAdmin(false);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data: memberships } = await (supabase
        .from('memberships')
        .select('role, org_id')
        .eq('user_id', userId) as any);

      const superAdmin = memberships?.some(
        (m: any) => m.role === 'super_admin' && m.org_id === null
      ) ?? false;

      // Check if user is an org admin (has admin role in an organization)
      const orgAdminMembership = memberships?.find(
        (m: any) => m.role === 'admin' && m.org_id !== null
      );

      // Get user's role in their organization (not super_admin)
      const orgMembership = memberships?.find((m: any) => m.org_id !== null);

      setIsSuperAdmin(superAdmin);
      setIsOrgAdmin(!!orgAdminMembership);
      setIsAdmin(superAdmin); // Keep for backward compatibility
      setUserRole(orgMembership?.role || null);
      setLoading(false);
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsOrgAdmin(false);
      setUserRole(null);
      setLoading(false);
    }
  };

  return { user, loading, isAdmin, isSuperAdmin, isOrgAdmin, userRole };
}