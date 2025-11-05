import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { supabase } from './lib/supabase';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Projects = lazy(() => import('./components/Projects'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const Coupons = lazy(() => import('./components/Coupons'));
const Investors = lazy(() => import('./components/Investors'));
const Subscriptions = lazy(() => import('./components/Subscriptions'));
const Payments = lazy(() => import('./components/Payments'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function App() {
  const { user, loading: authLoading, isAdmin } = useAuth();
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Aucune organisation</h2>
          <p className="text-slate-600 mb-6">
            Vous n'êtes membre d'aucune organisation. Contactez votre administrateur.
          </p>
          <button
            onClick={handleLogout}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Se déconnecter
          </button>
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
        {/* Admin Panel - Outside Layout (no sidebar) */}
        <Route 
          path="/admin" 
          element={
            <Suspense fallback={<LoadingFallback />}>
              <AdminPanel />
            </Suspense>
          } 
        />

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;