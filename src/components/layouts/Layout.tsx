import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Receipt,
  FolderOpen,
  Users,
  FileText,
  Euro,
  Shield,
  UserCog,
  Settings,
  Search,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { GlobalSearch } from '../dashboard/GlobalSearch';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { logger } from '../../utils/logger';
import { DashboardSkeleton } from '../common/Skeleton';
import { Tooltip } from '../common/Tooltip';

interface LayoutProps {
  organization: { id: string; name: string; role: string };
  isLoading?: boolean;
}

export function Layout({ organization, isLoading = false }: LayoutProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isOrgAdmin, isSuperAdmin, userRole, user } = useAuth();
  const isEmetteur = userRole === 'emetteur';

  // Sidebar collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Check if mobile on initial load
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return true;
    }

    // Otherwise, check localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Check if user is super admin (fallback to organization role)
  const isSuperAdminUser = isSuperAdmin || organization.role === 'super_admin';

  // Toggle sidebar function
  const toggleSidebar = (): void => {
    setIsCollapsed((prev: boolean): boolean => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      callback: () => setIsSearchOpen(true),
      description: 'Open search',
    },
    {
      key: ',',
      metaKey: true,
      callback: () => navigate('/parametres'),
      description: 'Open settings',
    },
  ]);

  // Handle responsive behavior - auto-collapse on mobile
  useEffect(() => {
    const handleResize = (): void => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  // Fetch user profile and listen for changes
  useEffect(() => {
    const fetchUserProfile = async (): Promise<void> => {
      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

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
            filter: `id=eq.${user.id}`,
          },
          payload => {
            if (payload.new && 'full_name' in payload.new) {
              setUserProfile({ full_name: payload.new.full_name as string });
            }
          }
        )
        .subscribe();

      return () => {
        profileChannel.unsubscribe();
      };
    }
  }, [user]);

  const handleLogout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(new Error('Logout error'), { error });
      }
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Unexpected logout error'));
    } finally {
      // Always navigate to login page, even if signOut fails
      navigate('/', { replace: true });
    }
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/' && !location.pathname.startsWith('/admin');
    }
    return location.pathname.startsWith(path);
  };

  // Helper component for navigation items
  const NavItem = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: LucideIcon;
    label: string;
  }): JSX.Element => {
    const active = isActive(to);
    const baseClasses = `w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
      active
        ? 'bg-finixar-brand-blue text-white'
        : 'text-slate-300 hover:bg-finixar-brand-blue hover:text-white'
    }`;

    const linkContent = (
      <Link to={to} className={`${baseClasses} ${isCollapsed ? 'justify-center' : ''}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && (
          <span className="transition-opacity duration-150 delay-75 whitespace-nowrap">
            {label}
          </span>
        )}
      </Link>
    );

    return isCollapsed ? (
      <Tooltip content={label} position="right">
        {linkContent}
      </Tooltip>
    ) : (
      linkContent
    );
  };

  return (
    <div className="h-screen bg-finixar-background flex overflow-hidden">
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-64'} bg-finixar-deep-blue text-white flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none`}
      >
        {/* Header - Compact */}
        <div className="p-4 flex-shrink-0">
          <div className="mb-3 flex items-center justify-between">
            {/* Logo */}
            {isCollapsed ? (
              <div className="w-full flex justify-center">
                <img src="/branding/icon/icon-white-192.png" alt="Finixar" className="w-10 h-10" />
              </div>
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '36px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/branding/logo/logo-full-white.png"
                  alt="Finixar"
                  style={{
                    height: '36px',
                    width: 'auto',
                    transform: 'scale(0.85)',
                    transformOrigin: 'center',
                  }}
                />
              </div>
            )}

            {/* Toggle Button */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {isCollapsed && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={toggleSidebar}
                className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Global Search Button */}
          {isCollapsed ? (
            <Tooltip content="Rechercher..." position="right">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center justify-center px-3 py-2 bg-slate-800/50 hover:bg-finixar-brand-blue rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <Search className="w-4 h-4" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-finixar-brand-blue rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">Rechercher...</span>
            </button>
          )}
        </div>

        {/* Navigation - No scroll */}
        <div className="flex-1 px-4">
          <nav className="space-y-1">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-4 h-4 rounded bg-slate-700 animate-pulse flex-shrink-0" />
                    {!isCollapsed && <div className="h-3 rounded bg-slate-700 animate-pulse flex-1" />}
                  </div>
                ))}
              </>
            ) : isEmetteur ? (
              <>
                <NavItem to="/" icon={Home} label="Mes Projets" />
                <div className="border-t border-slate-700 my-2"></div>
                <NavItem to="/parametres" icon={Settings} label="Paramètres" />
              </>
            ) : (
              <>
                <NavItem to="/" icon={Home} label="Tableau de bord" />
                <NavItem to="/coupons" icon={Receipt} label="Coupons" />
                <NavItem to="/projets" icon={FolderOpen} label="Projets" />
                <NavItem to="/investisseurs" icon={Users} label="Investisseurs" />
                <NavItem to="/souscriptions" icon={FileText} label="Souscriptions" />
                <NavItem to="/paiements" icon={Euro} label="Paiements" />

                <div className="border-t border-slate-700 my-2"></div>
                <NavItem to="/parametres" icon={Settings} label="Paramètres" />

                {isOrgAdmin && !isSuperAdminUser && (
                  <>
                    <div className="border-t border-slate-700 my-2"></div>
                    <NavItem to="/membres" icon={UserCog} label="Gestion Membres" />
                  </>
                )}

                {isSuperAdminUser && (
                  <>
                    <div className="border-t border-slate-700 my-2"></div>
                    <NavItem to="/admin" icon={Shield} label="Admin Panel" />
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Footer - Compact */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className={`flex ${isCollapsed ? 'flex-col items-center gap-2' : 'flex-col'}`}>
            {/* User Avatar and Info */}
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-2 mb-2'}`}>
              <Tooltip
                content={userProfile?.full_name || 'Utilisateur'}
                position="right"
                disabled={!isCollapsed}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                    isSuperAdminUser
                      ? 'bg-finixar-action-process'
                      : isOrgAdmin
                        ? 'bg-finixar-brand-blue'
                        : isEmetteur
                          ? 'bg-emerald-600'
                          : 'bg-finixar-text-secondary'
                  }`}
                >
                  {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              </Tooltip>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm whitespace-nowrap">
                    {userProfile?.full_name || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-slate-400 capitalize whitespace-nowrap">
                    {isLoading ? <span className="inline-block w-12 h-3 bg-slate-700 rounded animate-pulse" /> : isSuperAdminUser ? 'Super Admin' : isOrgAdmin ? 'Admin' : isEmetteur ? 'Émetteur' : 'Membre'}
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <Tooltip content="Se déconnecter" position="right" disabled={!isCollapsed}>
              <button
                onClick={handleLogout}
                className={`flex items-center justify-center text-slate-300 hover:text-white hover:bg-finixar-brand-blue rounded-lg transition-colors ${
                  isCollapsed ? 'w-8 h-8' : 'w-full px-3 py-1.5 text-xs gap-2'
                }`}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">Se déconnecter</span>}
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-finixar-background z-50">
            <DashboardSkeleton />
          </div>
        )}
        <Outlet />
      </main>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <GlobalSearch orgId={organization.id} onClose={() => setIsSearchOpen(false)} />
      )}
    </div>
  );
}
