import { useState, useMemo } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Building2, User, Eye, Upload, AlertCircle, Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface TableViewProps {
  coupons: Coupon[];
  onQuickPay: (coupon: Coupon) => void;
  onViewDetails: (coupon: Coupon) => void;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
  onToggleSelectAll: () => void;
}

interface GroupedData {
  date: string;
  coupons: Coupon[];
  total: number;
}

export function TableView({
  coupons,
  onQuickPay,
  onViewDetails,
  selectedCoupons,
  onToggleSelect,
}: TableViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (coupon.statut_calculated === 'paye') {
      return { text: 'Payé', className: 'bg-green-100 text-green-800' };
    }
    const daysUntil = getDaysUntil(coupon.date_echeance);
    if (daysUntil < 0) {
      return { text: 'En retard', className: 'bg-red-100 text-red-800' };
    }
    if (daysUntil <= 7) {
      return { text: 'Urgent', className: 'bg-orange-100 text-orange-800' };
    }
    if (daysUntil <= 30) {
      return { text: 'À venir', className: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Prévu', className: 'bg-blue-100 text-blue-800' };
  };

  // Group by date
  const groupedData = useMemo<GroupedData[]>(() => {
    const grouped: { [date: string]: Coupon[] } = {};

    coupons.forEach((coupon) => {
      const date = coupon.date_echeance;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(coupon);
    });

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, coupons]) => ({
        date,
        coupons,
        total: coupons.reduce((sum, c) => sum + c.montant_net, 0),
      }));
  }, [coupons]);

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  if (coupons.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon</h3>
        <p className="text-slate-600">Aucun coupon ne correspond aux filtres</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date Échéance
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Projet / Tranche
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Investisseur
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Montant
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group) => {
              const isExpanded = expandedDates.has(group.date);
              const daysUntil = getDaysUntil(group.date);

              return (
                <>
                  {/* Date Header Row */}
                  <tr
                    key={`date-${group.date}`}
                    className="bg-slate-50 border-b border-slate-200 hover:bg-slate-100 cursor-pointer"
                    onClick={() => toggleDate(group.date)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <div className="font-bold text-slate-900">{formatDate(group.date)}</div>
                      <div className="text-xs text-slate-600">
                        {daysUntil < 0
                          ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}`
                          : daysUntil === 0
                          ? "Aujourd'hui"
                          : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" colSpan={4}>
                      <div className="flex items-center justify-end gap-4">
                        <div>
                          <div className="text-sm font-bold text-finixar-green">
                            {formatCurrency(group.total)}
                          </div>
                          <div className="text-xs text-slate-600">
                            {group.coupons.length} coupon{group.coupons.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Investor Rows */}
                  {isExpanded &&
                    group.coupons.map((coupon) => {
                      const badge = getStatusBadge(coupon);

                      return (
                        <tr
                          key={coupon.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            selectedCoupons.has(coupon.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3 pl-12">
                            <input
                              type="checkbox"
                              checked={selectedCoupons.has(coupon.id)}
                              onChange={() => onToggleSelect(coupon.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-500">{formatDate(coupon.date_echeance)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900">{coupon.projet_nom}</div>
                            <div className="text-xs text-slate-500">{coupon.tranche_nom}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {coupon.investisseur_type === 'Morale' ? (
                                <Building2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              ) : (
                                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {coupon.investisseur_nom}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>{coupon.investisseur_id_display}</span>
                                  {coupon.investisseur_cgp && (
                                    <span className="text-amber-700">CGP: {coupon.investisseur_cgp}</span>
                                  )}
                                  {!coupon.has_rib && coupon.statut_calculated !== 'paye' && (
                                    <span className="flex items-center gap-1 text-red-600">
                                      <AlertCircle className="w-3 h-3" />
                                      RIB manquant
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm font-bold text-finixar-green">
                              {formatCurrency(coupon.montant_net)}
                            </div>
                            <div className="text-xs text-slate-500">Brut: {formatCurrency(coupon.montant_coupon)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onViewDetails(coupon)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {coupon.statut_calculated !== 'paye' && (
                                <button
                                  onClick={() => onQuickPay(coupon)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-colors"
                                  title="Enregistrer paiement"
                                >
                                  <Upload className="w-3 h-3" />
                                  Payer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
