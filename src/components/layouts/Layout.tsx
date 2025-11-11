import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Receipt, FolderOpen, Users, TrendingUp, FileText, DollarSign, Shield, UserCog, Settings, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { GlobalSearch } from '../dashboard/GlobalSearch';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface LayoutProps {
  organization: { id: string; name: string; role: string };
}

export function Layout({ organization }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isOrgAdmin, isSuperAdmin, user } = useAuth();

  // Check if user is super admin (fallback to organization role)
  const isSuperAdminUser = isSuperAdmin || organization.role === 'super_admin';

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      callback: () => setIsSearchOpen(true),
      description: 'Open search'
    },
    {
      key: ',',
      metaKey: true,
      callback: () => navigate('/parametres'),
      description: 'Open settings'
    }
  ]);

  useEffect(() => {
    if (isSuperAdminUser) {
      fetchPendingCount();

      // Subscribe to changes in profiles and memberships
      const profilesSubscription = supabase
        .channel('profiles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchPendingCount();
        })
        .subscribe();

      const membershipsSubscription = supabase
        .channel('memberships-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => {
          fetchPendingCount();
        })
        .subscribe();

      return () => {
        profilesSubscription.unsubscribe();
        membershipsSubscription.unsubscribe();
      };
    }
  }, [isSuperAdminUser]);

  // Fetch user profile and listen for changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }
    };

    fetchUserProfile();

    // Subscribe to profile changes for real-time updates
    if (user) {
      const profileChannel = supabase
        .channel(`profile-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            if (payload.new) {
              setUserProfile({ full_name: (payload.new as any).full_name });
            }
          }
        )
        .subscribe();

      return () => {
        profileChannel.unsubscribe();
      };
    }
  }, [user]);

  const fetchPendingCount = async () => {
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, is_superadmin');

    // Fetch memberships with org_id (users who have an organization)
    const { data: membershipsData } = await supabase
      .from('memberships')
      .select('user_id, role, org_id');

    if (profilesData && membershipsData) {
      // Users with organization
      const userIdsWithOrg = new Set(
        membershipsData
          .filter((m: any) => m.org_id !== null)
          .map((m: any) => m.user_id)
      );

      // Super admin is identified by is_superadmin column
      const superAdminIds = new Set(
        profilesData
          .filter((p: any) => p.is_superadmin === true)
          .map((p: any) => p.id)
      );

      // Pending users = profiles without org and not super admin
      const pending = profilesData.filter(
        (p: any) => !userIdsWithOrg.has(p.id) && !superAdminIds.has(p.id)
      );

      setPendingCount(pending.length);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
    } finally {
      // Always navigate to login page, even if signOut fails
      navigate('/', { replace: true });
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' && !location.pathname.startsWith('/admin');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-finixar-background flex overflow-hidden">
      <aside className="w-64 bg-finixar-deep-blue text-white flex flex-col flex-shrink-0">
        {/* Header - Compact */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-finixar-brand-blue p-1.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Finixar</span>
          </div>

          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-finixar-brand-blue rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Rechercher...</span>
          </button>
        </div>

        {/* Navigation - No scroll */}
        <div className="flex-1 px-4">
          <nav className="space-y-1">
            <Link
              to="/"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/coupons"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/coupons') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Coupons</span>
            </Link>
            <Link
              to="/projets"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/projets') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Projets</span>
            </Link>
            <Link
              to="/investisseurs"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/investisseurs') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Investisseurs</span>
            </Link>
            <Link
              to="/souscriptions"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/souscriptions') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Souscriptions</span>
            </Link>
            <Link
              to="/paiements"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/paiements') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Paiements</span>
            </Link>

            {/* Settings Link */}
            <div className="border-t border-slate-700 my-2"></div>
            <Link
              to="/parametres"
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive('/parametres') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </Link>

            {/* Members Management Link - Only for Organization Admins */}
            {isOrgAdmin && !isSuperAdminUser && (
              <>
                <div className="border-t border-slate-700 my-2"></div>
                <Link
                  to="/membres"
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive('/membres') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>Gestion Membres</span>
                </Link>
              </>
            )}

            {/* Admin Panel Link - Only for Super Admins */}
            {isSuperAdminUser && (
              <>
                <div className="border-t border-slate-700 my-2"></div>
                <Link
                  to="/admin"
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm relative ${
                    isActive('/admin') ? 'bg-finixar-brand-blue text-white' : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Panel</span>
                  {pendingCount > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-finixar-action-delete text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer - Compact */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
              isSuperAdminUser ? 'bg-finixar-action-process' : isOrgAdmin ? 'bg-finixar-brand-blue' : 'bg-finixar-text-secondary'
            }`}>
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">
                {userProfile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-xs text-slate-400 capitalize">
                {isSuperAdminUser ? 'Super Admin' : isOrgAdmin ? 'Admin' : 'Membre'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-finixar-brand-blue rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <GlobalSearch
          orgId={organization.id}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}