import { AlertTriangle, AlertCircle, ArrowRight, X } from 'lucide-react';
import type { Alert } from '../../utils/dashboardAlerts';

interface DashboardAlertsProps {
  alerts: Alert[];
  onAlertClick: (alertId: string) => void;
  onDismiss: () => void;
}

export function DashboardAlerts({ alerts, onAlertClick, onDismiss }: DashboardAlertsProps) {
  // Reserve space even when no alerts to prevent layout shift
  if (alerts.length === 0) {
    return <div className="mb-6 mt-6" aria-hidden="true" />;
  }

  return (
    <div className="mb-6 mt-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-slate-900">Alertes et Actions Requises</h3>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer les alertes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => onAlertClick(alert.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                alert.type === 'late_payment'
                  ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                  : alert.type === 'upcoming_coupons'
                    ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    : 'bg-orange-50 hover:bg-orange-100 border border-orange-200'
              } ${
                alert.id !== 'no-alerts'
                  ? 'cursor-pointer hover:shadow-md transform hover:scale-[1.01]'
                  : ''
              }`}
              role={alert.id !== 'no-alerts' ? 'button' : undefined}
              tabIndex={alert.id !== 'no-alerts' ? 0 : undefined}
            >
              <AlertCircle
                className={`w-5 h-5 flex-shrink-0 ${
                  alert.type === 'late_payment'
                    ? 'text-finixar-red'
                    : alert.type === 'upcoming_coupons'
                      ? 'text-blue-600'
                      : 'text-orange-600'
                }`}
                aria-hidden="true"
              />

              <p
                className={`text-sm font-medium flex-1 ${
                  alert.type === 'late_payment'
                    ? 'text-red-900'
                    : alert.type === 'upcoming_coupons'
                      ? 'text-blue-900'
                      : 'text-orange-900'
                }`}
              >
                {alert.message}
              </p>

              {alert.id !== 'no-alerts' && (
                <ArrowRight
                  className={`w-4 h-4 ${
                    alert.type === 'late_payment'
                      ? 'text-finixar-red'
                      : alert.type === 'upcoming_coupons'
                        ? 'text-blue-600'
                        : 'text-orange-600'
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
