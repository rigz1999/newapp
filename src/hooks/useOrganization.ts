import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Organization {
  id: string;
  name: string;
  role: string;
}

export function useOrganization(userId: string | undefined) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchOrganization = async () => {
      // Fetch ALL memberships (not just one)
      const { data: memberships } = await supabase
        .from('memberships')
        .select('org_id, role, organizations(id, name)')
        .eq('user_id', userId);

      if (!memberships || memberships.length === 0) {
        setOrganization(null);
        setLoading(false);
        return;
      }

      // Check if user is super admin (org_id = NULL)
      const superAdminMembership = memberships.find(
        m => m.role === 'super_admin' && m.org_id === null
      );

      if (superAdminMembership) {
        // Super admin - return special org object
        setOrganization({
          id: 'super_admin',
          name: 'Super Admin',
          role: 'super_admin'
        });
        setLoading(false);
        return;
      }

      // Regular user - get their first organization
      const regularMembership = memberships.find(m => m.org_id !== null && m.organizations);

      if (regularMembership && regularMembership.organizations) {
        const org = regularMembership.organizations as any;
        setOrganization({
          id: org.id,
          name: org.name,
          role: regularMembership.role,
        });
      } else {
        setOrganization(null);
      }

      setLoading(false);
    };

    fetchOrganization();
  }, [userId]);

  return { organization, loading };
}