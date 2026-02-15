import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrancheWizard } from '../tranches/TrancheWizard';
import { QuickPaymentModal } from '../coupons/QuickPaymentModal';
import { AlertModal } from '../common/Modals';
import { DashboardSkeleton } from '../common/Skeleton';
import { ExportModal } from './ExportModal';
import { DashboardStats } from './DashboardStats';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardRecentPayments } from './DashboardRecentPayments';
import { DashboardChart } from './DashboardChart';
import { toast } from '../../utils/toast';
import { useDashboardData } from '../../hooks/useDashboardData';
import type { Alert } from '../../utils/dashboardAlerts';
import { AlertCircle, X, Plus, ChevronDown } from 'lucide-react';

interface DashboardProps {
  organization: { id: string; name: string; role: string };
}

export function Dashboard({ organization }: DashboardProps): JSX.Element {
  const navigate = useNavigate();

  const {
    stats,
    recentPayments,
    upcomingCoupons,
    alerts,
    alertsDismissed,
    monthlyData,
    loading,
    error,
    selectedYear,
    startMonth,
    endMonth,
    viewMode,
    setSelectedYear,
    setStartMonth,
    setEndMonth,
    setViewMode,
    fetchData,
    handleRefresh,
    dismissAlerts,
    setError,
  } = useDashboardData(organization.id);

  // Modal state (UI-only, stays in the component)
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  // Body scroll lock when modal open
  useEffect(() => {
    if (showTrancheWizard || showQuickPayment || showExportModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showTrancheWizard, showQuickPayment, showExportModal]);

  // Alert click handler with deep linking
  const handleAlertClick = useCallback(
    (alert: Alert): void => {
      if (alert.id === 'no-alerts') {
        return;
      }

      const filters = alert.targetFilters;

      if (alert.id === 'overdue-coupons') {
        const params = new URLSearchParams();
        if (filters?.status) {
          params.set('status', filters.status);
        }
        navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
      } else if (alert.id === 'late-payments') {
        const params = new URLSearchParams();
        if (filters?.status) {
          params.set('status', filters.status);
        }
        navigate(`/paiements${params.toString() ? `?${params.toString()}` : ''}`);
      } else if (alert.id === 'upcoming-week') {
        const params = new URLSearchParams();
        if (filters?.status) {
          params.set('status', filters.status);
        }
        navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
      } else if (alert.id === 'missing-ribs') {
        const params = new URLSearchParams();
        if (filters?.ribStatus) {
          params.set('ribStatus', filters.ribStatus);
        }
        navigate(`/investisseurs${params.toString() ? `?${params.toString()}` : ''}`);
      } else if (alert.id.startsWith('deadline-')) {
        if (filters?.projectShortId && filters?.trancheShortId && filters?.dateEcheance) {
          navigate(
            `/echeance/${filters.projectShortId}/${filters.trancheShortId}/${filters.dateEcheance}?returnTo=dashboard`
          );
        } else {
          const params = new URLSearchParams();
          if (filters?.trancheName) {
            params.set('tranche', filters.trancheName);
          }
          if (filters?.dateEcheance) {
            params.set('date', filters.dateEcheance);
          }
          if (filters?.status) {
            params.set('status', filters.status);
          }
          navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
        }
      }
    },
    [navigate]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-5 xl:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showQuickActions ? 'rotate-180' : ''}`}
              />
            </button>
            {showQuickActions && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowQuickActions(false)} />
                <DashboardQuickActions
                  onNewProject={() => {
                    navigate('/projets?create=true');
                    setShowQuickActions(false);
                  }}
                  onNewTranche={() => {
                    setShowTrancheWizard(true);
                    setShowQuickActions(false);
                  }}
                  onNewPayment={() => {
                    setShowQuickPayment(true);
                    setShowQuickActions(false);
                  }}
                  onExport={() => {
                    setShowExportModal(true);
                    setShowQuickActions(false);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {error && !loading && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Erreur de chargement</h3>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  handleRefresh();
                }}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline font-medium"
              >
                Réessayer
              </button>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Fermer le message d'erreur"
              className="text-finixar-red hover:text-red-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardAlerts
            alerts={alerts}
            onAlertClick={handleAlertClick}
            onDismiss={dismissAlerts}
            dismissed={alertsDismissed}
          />

          <DashboardStats stats={stats} />

          <DashboardChart
            monthlyData={monthlyData}
            viewMode={viewMode}
            selectedYear={selectedYear}
            startMonth={startMonth}
            endMonth={endMonth}
            onViewModeChange={setViewMode}
            onYearChange={setSelectedYear}
            onRangeChange={(start, end) => {
              setStartMonth(start);
              setEndMonth(end);
            }}
          />

          <DashboardRecentPayments
            recentPayments={recentPayments}
            upcomingCoupons={upcomingCoupons}
            onViewAllPayments={() => navigate('/paiements')}
            onViewAllCoupons={() => navigate('/coupons')}
          />
        </>
      )}

      {/* Tranche wizard */}
      {showTrancheWizard && (
        <TrancheWizard
          onClose={() => setShowTrancheWizard(false)}
          onSuccess={(message, projectId) => {
            setShowTrancheWizard(false);
            if (message) {
              toast.success(message);
            } else {
              toast.success('Tranche créée avec succès');
            }
            if (projectId) {
              navigate(`/projets/${projectId}`);
            } else {
              fetchData();
            }
          }}
        />
      )}

      {/* Quick Payment Modal */}
      {showQuickPayment && (
        <QuickPaymentModal
          onClose={() => setShowQuickPayment(false)}
          onSuccess={() => {
            setShowQuickPayment(false);
            fetchData();
          }}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        organizationId={organization.id}
        dashboardData={{
          stats,
          recentPayments: recentPayments as unknown as Record<string, unknown>[],
          upcomingCoupons: upcomingCoupons as unknown as Record<string, unknown>[],
          alerts,
          monthlyData,
        }}
      />
    </div>
  );
}

export default Dashboard;
