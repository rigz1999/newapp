import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface Organization {
  id: string;
  name: string;
  role: string;
}

interface OrganizationData {
  id: string;
  name: string;
}

interface MembershipData {
  org_id: string | null;
  role: string;
  organizations: OrganizationData | OrganizationData[] | null;
}

// Type guard to validate organization data
function isValidOrganization(org: unknown): org is OrganizationData {
  return (
    typeof org === 'object' &&
    org !== null &&
    'id' in org &&
    'name' in org &&
    typeof (org as OrganizationData).id === 'string' &&
    typeof (org as OrganizationData).name === 'string'
  );
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
      setLoading(true); // Reset loading state when starting to fetch
      logger.log('useOrganization - Fetching memberships for userId:', userId);

      try {
        // First check if user is superadmin via profile
        const { data: isSuperAdmin } = await supabase.rpc('check_super_admin_status');

        if (isSuperAdmin) {
          logger.log('useOrganization - Super admin detected via profile');
          setOrganization({
            id: 'super_admin',
            name: 'Super Admin',
            role: 'super_admin',
          });
          setLoading(false);
          return;
        }

        // Fetch ALL memberships (not just one)
        const { data: memberships, error } = await supabase
          .from('memberships')
          .select('org_id, role, organizations(id, name)')
          .eq('user_id', userId);

        logger.log('useOrganization - Memberships result:', { memberships, error });

        if (error) {
          logger.error(
            'useOrganization - Error fetching memberships:',
            error as unknown as Record<string, unknown>
          );
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

        // Check if user is super admin (org_id = NULL) via membership
        const superAdminMembership = memberships.find(
          (m: MembershipData) =>
            (m.role === 'super_admin' || m.role === 'superadmin') && m.org_id === null
        );

        if (superAdminMembership) {
          logger.log('useOrganization - Super admin detected via membership');
          // Super admin - return special org object
          setOrganization({
            id: 'super_admin',
            name: 'Super Admin',
            role: 'super_admin',
          });
          setLoading(false);
          return;
        }

        // Regular user - get their first organization
        const regularMembership = memberships.find(
          (m: MembershipData) => m.org_id !== null && m.organizations
        );
        logger.log('useOrganization - Regular membership found:', regularMembership);

        if (regularMembership && regularMembership.organizations) {
          // Handle both single object and array responses
          const orgData = Array.isArray(regularMembership.organizations)
            ? regularMembership.organizations[0]
            : regularMembership.organizations;

          // Validate the organization data before using it
          if (isValidOrganization(orgData)) {
            logger.log('useOrganization - Setting organization:', {
              id: orgData.id,
              name: orgData.name,
              role: regularMembership.role,
            });
            setOrganization({
              id: orgData.id,
              name: orgData.name,
              role: regularMembership.role,
            });
          } else {
            logger.error('useOrganization - Invalid organization data:', orgData);
            setOrganization(null);
          }
        } else {
          logger.log('useOrganization - No valid organization found in membership');
          setOrganization(null);
        }
      } catch (error) {
        logger.error('useOrganization - Unexpected error:', error as Record<string, unknown>);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [userId]);

  return { organization, loading };
}
