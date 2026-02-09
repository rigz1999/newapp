import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export type MFAStatus = 'loading' | 'no_factors' | 'needs_verification' | 'verified';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>('loading');

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        setMfaStatus('no_factors');
        return;
      }

      if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
        // User has enrolled factors but hasn't verified this session
        setMfaStatus('needs_verification');
      } else if (data.currentLevel === 'aal2') {
        // Fully verified
        setMfaStatus('verified');
      } else {
        // No factors enrolled
        setMfaStatus('no_factors');
      }
    } catch {
      setMfaStatus('no_factors');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        checkAdminStatus(session.user.id);
        checkMFAStatus();
      } else {
        setMfaStatus('loading');
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only clear user state on explicit sign-out.
      // During token refresh, the session may briefly be null before the new
      // token arrives. Reacting to that would redirect the user to /login,
      // and once the refresh completes the login page redirects to /,
      // making the user lose their current page.
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsOrgAdmin(false);
        setUserRole(null);
        setMfaStatus('loading');
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        checkMFAStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      // Check if user is THE super admin (via RPC - secure)
      const { data: isSuperAdminUser } = await supabase.rpc('check_super_admin_status');

      const { data: memberships } = await supabase
        .from('memberships')
        .select('role, org_id')
        .eq('user_id', userId);

      // Check if user is an org admin (has admin role in an organization)
      const orgAdminMembership = memberships?.find(
        (m: { role: string; org_id: string | null }) => m.role === 'admin' && m.org_id !== null
      );

      // Get user's role in their organization
      const orgMembership = memberships?.find(
        (m: { role: string; org_id: string | null }) => m.org_id !== null
      );

      setIsSuperAdmin(!!isSuperAdminUser);
      setIsOrgAdmin(!!orgAdminMembership);
      setIsAdmin(!!isSuperAdminUser); // Keep for backward compatibility
      setUserRole(orgMembership?.role || null);
      setLoading(false);
    } catch (error) {
      logger.error('Failed to check admin status', error as Record<string, unknown>);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsOrgAdmin(false);
      setUserRole(null);
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    isOrgAdmin,
    userRole,
    mfaStatus,
    refreshMFA: checkMFAStatus,
  };
}
