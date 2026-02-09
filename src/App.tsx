import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useOrganization } from './hooks/useOrganization';
import { Login } from './components/auth/Login';
import { Layout } from './components/layouts/Layout';
import { InvitationAccept } from './components/auth/InvitationAccept';
import { ResetPassword } from './components/auth/ResetPassword';
import { MFAEnroll } from './components/auth/MFAEnroll';
import { MFAChallenge } from './components/auth/MFAChallenge';
import { EmailOAuthCallback } from './components/auth/EmailOAuthCallback';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardSkeleton } from './components/common/Skeleton';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { ThemeProvider } from './context/ThemeContext';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { LandingPage } from './components/landing/LandingPage';
import { DemoRequest } from './components/landing/DemoRequest';
import { MentionsLegales } from './components/legal/MentionsLegales';

const PolitiqueConfidentialite = lazy(() =>
  import('./components/legal/PolitiqueConfidentialite').then(m => ({
    default: m.PolitiqueConfidentialite,
  }))
);

const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const Projects = lazy(() => import('./components/projects/Projects'));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail'));
const ProjectActualitesPage = lazy(() =>
  import('./components/projects/ProjectActualitesPage').then(m => ({
    default: m.ProjectActualitesPage,
  }))
);
const TrancheEditPage = lazy(() =>
  import('./components/tranches/TrancheEditPage').then(m => ({ default: m.TrancheEditPage }))
);
const EcheancierPage = lazy(() =>
  import('./components/coupons/EcheancierPage').then(m => ({ default: m.EcheancierPage }))
);
const EcheanceDetailPage = lazy(() =>
  import('./components/coupons/EcheanceDetailPage').then(m => ({ default: m.EcheanceDetailPage }))
);
const Coupons = lazy(() => import('./components/coupons/CouponsPageNew'));
const Investors = lazy(() => import('./components/investors/Investors'));
const Subscriptions = lazy(() => import('./components/subscriptions/Subscriptions'));
const Payments = lazy(() => import('./components/payments/Payments'));
const PaymentDetailPage = lazy(() =>
  import('./components/payments/PaymentDetailPage').then(m => ({ default: m.PaymentDetailPage }))
);
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const FormatProfiles = lazy(() => import('./components/admin/FormatProfiles'));
const Members = lazy(() => import('./components/admin/Members'));
const Settings = lazy(() => import('./components/admin/Settings'));
const EmetteurDashboard = lazy(() => import('./components/emetteur/EmetteurDashboard'));
const EmetteurProjectView = lazy(() => import('./components/emetteur/EmetteurProjectView'));
const AuditLogPage = lazy(() => import('./components/audit/AuditLogPage'));

// Default organization for super admin users
const DEFAULT_ORG = { id: 'admin', name: 'Admin', role: 'admin' } as const;

function App(): JSX.Element {
  const {
    user,
    loading: authLoading,
    isAdmin,
    isOrgAdmin,
    userRole,
    mfaStatus,
    refreshMFA,
  } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(user?.id);
  const isEmetteur = userRole === 'emetteur';

  const LoadingFallback = (): JSX.Element => <DashboardSkeleton />;

  // Check if we're on the main domain (finixar.com) or app subdomain (app.finixar.com)
  const hostname = window.location.hostname;
  const isMainDomain = hostname === 'finixar.com' || hostname === 'www.finixar.com';

  // Show landing page on main domain, app on subdomain or localhost
  if (isMainDomain) {
    // Simple router for main domain
    const pathname = window.location.pathname;
    const isDemoPage = pathname === '/demo' || pathname === '/demo/';
    const isMentionsLegales = pathname === '/mentions-legales' || pathname === '/mentions-legales/';
    const isPolitiqueConfidentialite =
      pathname === '/politique-de-confidentialite' || pathname === '/politique-de-confidentialite/';

    let pageContent: React.ReactNode;
    if (isDemoPage) {
      pageContent = <DemoRequest />;
    } else if (isMentionsLegales) {
      pageContent = <MentionsLegales />;
    } else if (isPolitiqueConfidentialite) {
      pageContent = (
        <Suspense fallback={<DashboardSkeleton />}>
          <PolitiqueConfidentialite />
        </Suspense>
      );
    } else {
      pageContent = <LandingPage />;
    }

    return (
      <ThemeProvider>
        <ErrorBoundary>
          {pageContent}
          <CookieConsentBanner />
        </ErrorBoundary>
      </ThemeProvider>
    );
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
                authLoading ? (
                  <DashboardSkeleton />
                ) : user && (isAdmin || organization) ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route path="/invitation/accept" element={<InvitationAccept />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route
              path="/politique-de-confidentialite"
              element={
                <Suspense fallback={<DashboardSkeleton />}>
                  <PolitiqueConfidentialite />
                </Suspense>
              }
            />
            <Route
              path="/diagnostic"
              element={
                authLoading ? (
                  <DashboardSkeleton />
                ) : user ? (
                  <DiagnosticPage />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* OAuth Callback Routes - Require authentication */}
            <Route
              path="/auth/callback/microsoft"
              element={
                authLoading ? (
                  <DashboardSkeleton />
                ) : user ? (
                  <EmailOAuthCallback />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/auth/callback/google"
              element={
                authLoading ? (
                  <DashboardSkeleton />
                ) : user ? (
                  <EmailOAuthCallback />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Protected Routes - Authentication + MFA required */}
            <Route
              path="/*"
              element={
                authLoading ? (
                  <Layout organization={DEFAULT_ORG} isLoading={true} />
                ) : user ? (
                  // MFA enforcement: mandatory for all roles
                  mfaStatus === 'loading' ? (
                    <Layout organization={DEFAULT_ORG} isLoading={true} />
                  ) : mfaStatus === 'needs_verification' ? (
                    <MFAChallenge onVerified={() => refreshMFA()} />
                  ) : mfaStatus === 'no_factors' ? (
                    <MFAEnroll onComplete={() => refreshMFA()} />
                  ) : isAdmin || organization || orgLoading ? (
                    <Layout organization={organization || DEFAULT_ORG} isLoading={orgLoading} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              {/* Emetteur-specific routes */}
              {isEmetteur ? (
                <>
                  <Route
                    index
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurDashboard />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="emetteur"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurDashboard />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="emetteur/projets/:projectId"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurProjectView />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="projets/:projectId"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurProjectView />
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
                    path="echeance/:projectId/:trancheId/:date"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EcheanceDetailPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="projets/:projectId/actualites"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <ProjectActualitesPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="projets/:projectId/:slug/actualites"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <ProjectActualitesPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="tranches/:trancheId/edit"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <TrancheEditPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  <Route
                    index
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <Dashboard organization={organization || DEFAULT_ORG} />
                        </Suspense>
                      </ErrorBoundary>
                    }
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
                    path="echeance/:projectId/:trancheId/:date"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EcheanceDetailPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="projets/:projectId/actualites"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <ProjectActualitesPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="projets/:projectId/:slug/actualites"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <ProjectActualitesPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="tranches/:trancheId/edit"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <TrancheEditPage />
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
                  <Route
                    path="paiements/:paymentId"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <PaymentDetailPage />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="historique"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <AuditLogPage organization={organization || DEFAULT_ORG} />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="emetteur"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurDashboard />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="emetteur/projets/:projectId"
                    element={
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                          <EmetteurProjectView />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                </>
              )}

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
                  isOrgAdmin || isAdmin ? (
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
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Format Profiles - For Super Admins */}
              <Route
                path="admin/profils-format"
                element={
                  isAdmin ? (
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback />}>
                        <FormatProfiles />
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              {/* Removed wildcard redirect - it was causing page refreshes to redirect to dashboard */}
            </Route>
          </Routes>
        </BrowserRouter>
        <CookieConsentBanner />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
