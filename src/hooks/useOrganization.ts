import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface Organization {
  id: string;
  name: string;
  role: string;
}

export function useOrganization(userId: string | undefined) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.log('useOrganization - userId:', userId);

    if (!userId) {
      logger.log('useOrganization - No userId, stopping');
      setLoading(false);
      return;
    }

    const fetchOrganization = async () => {
      logger.log('useOrganization - Fetching memberships for userId:', userId);

      // Fetch ALL memberships (not just one)
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('org_id, role, organizations(id, name)')
        .eq('user_id', userId);

      logger.log('useOrganization - Memberships result:', { memberships, error });

      if (error) {
        logger.error('useOrganization - Error fetching memberships:', error);
        setOrganization(null);
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        logger.log('useOrganization - No memberships found');
        setOrganization(null);
        setLoading(false);
        return;
      }

      // Check if user is super admin (org_id = NULL)
      const superAdminMembership = memberships.find(
        m => m.role === 'super_admin' && m.org_id === null
      );

      if (superAdminMembership) {
        logger.log('useOrganization - Super admin detected');
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
      logger.log('useOrganization - Regular membership found:', regularMembership);

      if (regularMembership && regularMembership.organizations) {
        const org = regularMembership.organizations as any;
        logger.log('useOrganization - Setting organization:', {
          id: org.id,
          name: org.name,
          role: regularMembership.role,
        });
        setOrganization({
          id: org.id,
          name: org.name,
          role: regularMembership.role,
        });
      } else {
        logger.log('useOrganization - No valid organization found in membership');
        setOrganization(null);
      }

      setLoading(false);
    };

    fetchOrganization();
  }, [userId]);

  return { organization, loading };
}