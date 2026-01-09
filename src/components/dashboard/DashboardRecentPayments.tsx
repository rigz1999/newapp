import { ArrowRight, AlertCircle, Users } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Payment, UpcomingCoupon } from '../../utils/dashboardAlerts';

interface DashboardRecentPaymentsProps {
  recentPayments: Payment[];
  upcomingCoupons: UpcomingCoupon[];
  onViewAllPayments: () => void;
  onViewAllCoupons: () => void;
}

export function DashboardRecentPayments({
  recentPayments,
  upcomingCoupons,
  onViewAllPayments,
  onViewAllCoupons,
}: DashboardRecentPaymentsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Coupons à venir</h2>
          <button
            onClick={onViewAllCoupons}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {upcomingCoupons.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Aucun coupon à venir</p>
        ) : (
          <div className="space-y-3">
            {upcomingCoupons.map(coupon => {
              const daysUntil = Math.ceil(
                (new Date(coupon.prochaine_date_coupon).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 7;

              return (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900">
                        {formatCurrency(parseFloat(coupon.coupon_brut.toString()))}
                      </p>
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          En retard
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          Urgent
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {coupon.tranche?.projet?.projet || 'Projet'} •{' '}
                      {coupon.tranche?.tranche_name || 'Tranche'}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      {coupon.investor_count || 0} investisseur
                      {(coupon.investor_count || 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatDate(coupon.prochaine_date_coupon)}
                    </p>
                    <p
                      className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}
                    >
                      {daysUntil === 0
                        ? "Aujourd'hui"
                        : isOverdue
                          ? `Retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}`
                          : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Derniers paiements</h2>
          <button
            onClick={onViewAllPayments}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Aucun paiement récent</p>
        ) : (
          <div className="space-y-3">
            {recentPayments.map(payment => {
              const daysAgo = Math.floor(
                (new Date().getTime() - new Date(payment.date_paiement).getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900">{formatCurrency(payment.montant)}</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          payment.statut?.toLowerCase() === 'payé' ||
                          payment.statut?.toLowerCase() === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : payment.statut?.toLowerCase() === 'en attente'
                              ? 'bg-yellow-100 text-yellow-700'
                              : payment.statut?.toLowerCase() === 'en retard'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payment.statut?.charAt(0).toUpperCase() +
                          payment.statut?.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {payment.tranche?.projet?.projet || 'Projet'} •{' '}
                      {payment.tranche?.tranche_name || 'Tranche'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{payment.type || 'Coupon'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-700">
                      {formatDate(payment.date_paiement)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {daysAgo === 0
                        ? "Aujourd'hui"
                        : daysAgo === 1
                          ? 'Hier'
                          : `Il y a ${daysAgo} jours`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
