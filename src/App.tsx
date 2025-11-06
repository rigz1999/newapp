import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { InvitationAccept } from './components/InvitationAccept';
import { supabase } from './lib/supabase';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Projects = lazy(() => import('./components/Projects'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const Coupons = lazy(() => import('./components/Coupons'));
const Investors = lazy(() => import('./components/Investors'));
const Subscriptions = lazy(() => import('./components/Subscriptions'));
const Payments = lazy(() => import('./components/Payments'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Members = lazy(() => import('./components/Members'));
const Settings = lazy(() => import('./components/Settings'));
const TestToast = lazy(() => import('./pages/TestToast'));

function App() {
  const { user, loading: authLoading, isAdmin, isOrgAdmin } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading || (!isAdmin && orgLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
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

  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-slate-600">Chargement...</p>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route - Invitation Accept (no auth required) */}
        <Route path="/invitation/accept" element={<InvitationAccept />} />

        {/* Test Routes - Development only */}
        <Route path="/test/toast" element={
          <Suspense fallback={<LoadingFallback />}>
            <TestToast />
          </Suspense>
        } />

        {/* Main App Routes - Inside Layout (with sidebar) */}
        <Route path="/" element={<Layout organization={effectiveOrg} />}>
          <Route
            index
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="projets"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Projects organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="projets/:projectId"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ProjectDetail organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="coupons"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Coupons organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="investisseurs"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Investors organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="souscriptions"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Subscriptions organization={effectiveOrg} />
              </Suspense>
            }
          />
          <Route
            path="paiements"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Payments organization={effectiveOrg} />
              </Suspense>
            }
          />

          {/* Settings - For all users */}
          <Route
            path="parametres"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Settings />
              </Suspense>
            }
          />

          {/* Members Management - For Organization Admins */}
          <Route
            path="membres"
            element={
              isOrgAdmin ? (
                <Suspense fallback={<LoadingFallback />}>
                  <Members />
                </Suspense>
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
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPanel />
                </Suspense>
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
  );
}

export default App;