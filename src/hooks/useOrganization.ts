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
      const { data: memberships } = await supabase
        .from('memberships')
        .select('org_id, role, organizations(id, name)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (memberships && memberships.organizations) {
        const org = memberships.organizations as any;
        setOrganization({
          id: org.id,
          name: org.name,
          role: memberships.role,
        });
      }
      setLoading(false);
    };

    fetchOrganization();
  }, [userId]);

  return { organization, loading };
}
