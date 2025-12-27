import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/auth/Login';
import { Layout } from './components/layouts/Layout';
import { InvitationAccept } from './components/auth/InvitationAccept';
import { EmailOAuthCallback } from './components/auth/EmailOAuthCallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardSkeleton } from './components/common/Skeleton';
import { ThemeProvider } from './context/ThemeContext';
import { DiagnosticPage } from './pages/DiagnosticPage';

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Projects = lazy(() => import('./components/projects/Projects'));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail'));
const ProjectCommentsPage = lazy(() => import('./components/projects/ProjectCommentsPage').then(m => ({ default: m.ProjectCommentsPage })));
const EcheancierPage = lazy(() => import('./components/coupons/EcheancierPage').then(m => ({ default: m.EcheancierPage })));
const Coupons = lazy(() => import('./components/coupons/CouponsPageNew'));
const Investors = lazy(() => import('./components/investors/Investors'));
const Subscriptions = lazy(() => import('./components/subscriptions/Subscriptions'));
const Payments = lazy(() => import('./components/payments/Payments'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const Members = lazy(() => import('./components/admin/Members'));
const Settings = lazy(() => import('./components/admin/Settings'));

// Default organization for super admin users
const DEFAULT_ORG = { id: 'admin', name: 'Admin', role: 'admin' } as const;

function App() {
  const { user, loading: authLoading, isAdmin, isOrgAdmin } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);

  const LoadingFallback = () => <DashboardSkeleton />;

  // Loading state
  if (authLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
        <Routes>
          {/* Public Routes - No authentication required */}
          <Route
            path="/login"
            element={
              user && (isAdmin || organization) ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route path="/invitation/accept" element={<InvitationAccept />} />
          <Route path="/diagnostic" element={user ? <DiagnosticPage /> : <Navigate to="/login" replace />} />

          {/* OAuth Callback Routes - Require authentication */}
          <Route path="/auth/callback/microsoft" element={user ? <EmailOAuthCallback /> : <Navigate to="/login" replace />} />
          <Route path="/auth/callback/google" element={user ? <EmailOAuthCallback /> : <Navigate to="/login" replace />} />

          {/* Protected Routes - Authentication required */}
          <Route
            path="/*"
            element={
              user ? (
                orgLoading || authLoading ? (
                  <DashboardSkeleton />
                ) : (isAdmin || organization) ? (
                  <Layout organization={organization || DEFAULT_ORG} />
                ) : (
                  <Navigate to="/login" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          >
            <Route
              path="dashboard"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Dashboard organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              index
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="projets"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Projects organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projets/:projectId"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ProjectDetail organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projets/:projectId/echeancier"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <EcheancierPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="projets/:projectId/comments"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ProjectCommentsPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="coupons"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Coupons organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="investisseurs"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Investors organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="souscriptions"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Subscriptions organization={organization || DEFAULT_ORG} />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="paiements"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <Payments organization={organization || DEFAULT_ORG} />
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

            {/* Members Management - For Organization Admins and Super Admin */}
            <Route
              path="membres"
              element={
                (isOrgAdmin || isAdmin) ? (
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <Members />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            {/* Admin Panel - For Super Admins */}
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
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            {/* Removed wildcard redirect - it was causing page refreshes to redirect to dashboard */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
