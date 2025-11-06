import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/auth/Login';
import { Layout } from './components/layouts/Layout';
import { InvitationAccept } from './components/auth/InvitationAccept';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardSkeleton } from './components/common/Skeleton';
import { supabase } from './lib/supabase';

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Projects = lazy(() => import('./components/projects/Projects'));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail'));
const Coupons = lazy(() => import('./components/coupons/Coupons'));
const Investors = lazy(() => import('./components/investors/Investors'));
const Subscriptions = lazy(() => import('./components/subscriptions/Subscriptions'));
const Payments = lazy(() => import('./components/payments/Payments'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const Members = lazy(() => import('./components/admin/Members'));
const Settings = lazy(() => import('./components/admin/Settings'));

function App() {
  const { user, loading: authLoading, isAdmin, isOrgAdmin } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  

  if (authLoading || (!isAdmin && orgLoading)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Login />;
  }

  if (!isAdmin && !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Demande en cours de traitement
          </h2>

          {/* Message */}
          <p className="text-slate-600 mb-6 leading-relaxed">
            Votre compte a été créé avec succès ! 🎉
            <br /><br />
            Un administrateur doit maintenant valider votre accès. Vous recevrez un email de confirmation dès que votre compte sera activé.
          </p>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              <strong>💡 Que faire en attendant ?</strong>
              <br />
              • Vérifiez vos emails (inbox et spam)
              <br />
              • Le traitement prend généralement 24-48h
              <br />
              • Vous pouvez vous reconnecter plus tard
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Se déconnecter
            </button>
            
            <a 
              href="mailto:support@investflow.com" 
              className="block text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Besoin d'aide ? Contactez le support →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const effectiveOrg = organization || { id: 'admin', name: 'Admin', role: 'admin' };

  const LoadingFallback = () => <DashboardSkeleton />;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Route - Invitation Accept (no auth required) */}
          <Route path="/invitation/accept" element={<InvitationAccept />} />

        {/* Main App Routes - Inside Layout (with sidebar) */}
        <Route path="/" element={<Layout organization={effectiveOrg} />}>
          <Route
            index
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Dashboard organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projets"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Projects organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projets/:projectId"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <ProjectDetail organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="coupons"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Coupons organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="investisseurs"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Investors organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="souscriptions"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Subscriptions organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="paiements"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Payments organization={effectiveOrg} />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* Settings - For all users */}
          <Route
            path="parametres"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Settings />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* Members Management - For Organization Admins */}
          <Route
            path="membres"
            element={
              isOrgAdmin ? (
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Members />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Admin Panel - For Super Admins - MUST be before wildcard route */}
          <Route
            path="admin"
            element={
              isAdmin ? (
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminPanel />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Wildcard must be LAST */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;