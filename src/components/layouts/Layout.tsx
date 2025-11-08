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

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single() as any;

      if (profile) {
        setUserProfile(profile);
      }
    };

    fetchUserProfile();
  }, [user]);

  const fetchPendingCount = async () => {
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id') as any;

    // Fetch memberships with org_id (users who have an organization)
    const { data: membershipsData } = await supabase
      .from('memberships')
      .select('user_id, role, org_id') as any;

    if (profilesData && membershipsData) {
      // Users with organization
      const userIdsWithOrg = new Set(
        membershipsData
          .filter((m: any) => m.org_id !== null)
          .map((m: any) => m.user_id)
      );

      // Super admin is identified by email
      const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
      const superAdminIds = new Set(
        profilesData
          .filter((p: any) => p.email === superAdminEmail)
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
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' && !location.pathname.startsWith('/admin');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-screen">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">InvestFlow</span>
          </div>

          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 mb-6 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Rechercher...</span>
          </button>

          <nav className="space-y-2">
            <Link
              to="/"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/coupons"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/coupons') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>Tous les Coupons</span>
            </Link>
            <Link
              to="/projets"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/projets') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span>Projets</span>
            </Link>
            <Link
              to="/investisseurs"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/investisseurs') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Investisseurs</span>
            </Link>
            <Link
              to="/souscriptions"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/souscriptions') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Souscriptions</span>
            </Link>
            <Link
              to="/paiements"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/paiements') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>Paiements</span>
            </Link>

            {/* Settings Link */}
            <div className="border-t border-slate-700 my-4"></div>
            <Link
              to="/parametres"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/parametres') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Paramètres</span>
            </Link>

            {/* Members Management Link - Only for Organization Admins */}
            {isOrgAdmin && !isSuperAdminUser && (
              <>
                <div className="border-t border-slate-700 my-4"></div>
                <Link
                  to="/membres"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/membres') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                  <span>Gestion Membres</span>
                </Link>
              </>
            )}

            {/* Admin Panel Link - Only for Super Admins */}
            {isSuperAdminUser && (
              <>
                <div className="border-t border-slate-700 my-4"></div>
                <Link
                  to="/admin"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive('/admin') ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-purple-600 hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                  {pendingCount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              isSuperAdminUser ? 'bg-purple-600' : isOrgAdmin ? 'bg-blue-600' : 'bg-green-600'
            }`}>
              {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {userProfile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-slate-400 capitalize">
                {isSuperAdminUser ? 'Super Admin' : isOrgAdmin ? 'Administrateur' : 'Membre'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto ml-64">
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