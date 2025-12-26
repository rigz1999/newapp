import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Building2, User, Eye, Upload, AlertCircle } from 'lucide-react';

interface CouponCardProps {
  coupon: Coupon;
  onQuickPay: () => void;
  onViewDetails: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function CouponCard({
  coupon,
  onQuickPay,
  onViewDetails,
  isSelected,
  onToggleSelect,
}: CouponCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysText = (days: number) => {
    if (days < 0) return `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Demain';
    return `Dans ${days} jour${days > 1 ? 's' : ''}`;
  };

  const isPaid = coupon.statut_calculated === 'paye';

  return (
    <div
      className={`bg-white rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-500 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div className="pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              {/* Left: Project & Investor */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-slate-900 truncate">{coupon.projet_nom}</h4>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {coupon.tranche_nom}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {coupon.investisseur_type === 'Morale' ? (
                    <Building2 className="w-4 h-4 text-purple-600" />
                  ) : (
                    <User className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="truncate">{coupon.investisseur_nom}</span>
                </div>
              </div>

              {/* Right: Amount */}
              <div className="text-right">
                <p className="text-lg font-bold text-finixar-green whitespace-nowrap">
                  {formatCurrency(coupon.montant_net)}
                </p>
                <p className="text-xs text-slate-500">Brut: {formatCurrency(coupon.montant_coupon)}</p>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center justify-between gap-4 text-xs text-slate-600 mb-3">
              <div className="flex items-center gap-3">
                <span>{formatDate(coupon.date_echeance)}</span>
                <span className="text-slate-400">•</span>
                <span>{getDaysText(coupon.jours_restants)}</span>
                {coupon.investisseur_cgp && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="text-amber-700">CGP: {coupon.investisseur_cgp}</span>
                  </>
                )}
              </div>
            </div>

            {/* Warnings */}
            {!coupon.has_rib && !isPaid && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg mb-3">
                <AlertCircle className="w-4 h-4" />
                <span>RIB manquant</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Détails
              </button>
              {!isPaid && (
                <button
                  onClick={onQuickPay}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Enregistrer paiement
                </button>
              )}
              {isPaid && coupon.date_paiement && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                  <span>Payé le {formatDate(coupon.date_paiement)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
