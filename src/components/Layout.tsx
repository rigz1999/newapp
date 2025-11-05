import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Receipt, FolderOpen, Users, TrendingUp, FileText, DollarSign, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface LayoutProps {
  organization: { id: string; name: string; role: string };
}

export function Layout({ organization }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  // Check if user is super admin
  const isSuperAdmin = organization.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
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
  }, [isSuperAdmin]);

  const fetchPendingCount = async () => {
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id');

    // Fetch memberships with org_id
    const { data: membershipsData } = await supabase
      .from('memberships')
      .select('user_id')
      .not('org_id', 'is', null);

    if (profilesData && membershipsData) {
      const userIdsWithOrg = new Set(membershipsData.map(m => m.user_id));
      const pending = profilesData.filter(p => !userIdsWithOrg.has(p.id));
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
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">InvestFlow</span>
          </div>

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

            {/* Admin Panel Link - Only for Super Admins */}
            {isSuperAdmin && (
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
              isSuperAdmin ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {isSuperAdmin ? 'SA' : organization.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {isSuperAdmin ? 'Super Admin' : organization.name}
              </p>
              <p className="text-sm text-slate-400 capitalize">
                {isSuperAdmin ? 'Accès Total' : organization.role}
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
    </div>
  );
}