import { useState, useMemo } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Building2, User, Eye, Upload, AlertCircle, Calendar, ChevronDown, ChevronRight, CheckCircle2, Clock, XCircle } from 'lucide-react';

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
  totalBrut: number;
  totalNet: number;
  paidCount: number;
  totalCount: number;
  status: 'all_paid' | 'partial' | 'all_late' | 'all_pending' | 'mixed';
  hasUnpaid: boolean;
}

export function TableView({
  coupons,
  onQuickPay,
  onViewDetails,
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
      return { text: 'Payé', className: 'bg-green-100 text-green-800 border-green-200' };
    }
    const daysUntil = getDaysUntil(coupon.date_echeance);
    if (daysUntil < 0) {
      return { text: 'En retard', className: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (daysUntil <= 7) {
      return { text: 'Urgent', className: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    if (daysUntil <= 30) {
      return { text: 'À venir', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
    return { text: 'Prévu', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  };

  // Group by date with aggregated status
  const groupedData = useMemo<GroupedData[]>(() => {
    const grouped: { [date: string]: Coupon[] } = {};

    coupons.forEach((coupon) => {
      const date = coupon.date_echeance;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(coupon);
    });

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, coupons]) => {
        const paidCount = coupons.filter(c => c.statut_calculated === 'paye').length;
        const lateCount = coupons.filter(c => c.statut_calculated === 'en_retard').length;
        const totalCount = coupons.length;

        let status: GroupedData['status'];
        if (paidCount === totalCount) {
          status = 'all_paid';
        } else if (paidCount > 0) {
          status = 'partial';
        } else if (lateCount === totalCount) {
          status = 'all_late';
        } else if (lateCount > 0) {
          status = 'mixed';
        } else {
          status = 'all_pending';
        }

        return {
          date,
          coupons,
          totalBrut: coupons.reduce((sum, c) => sum + c.montant_brut, 0),
          totalNet: coupons.reduce((sum, c) => sum + c.montant_net, 0),
          paidCount,
          totalCount,
          status,
          hasUnpaid: paidCount < totalCount,
        };
      });
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

  const getEcheanceStatusDisplay = (group: GroupedData) => {
    if (group.status === 'all_paid') {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        text: 'Tous payés',
        className: 'bg-green-50 text-green-700 border-green-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    if (group.status === 'partial') {
      return {
        icon: <Clock className="w-5 h-5 text-orange-600" />,
        text: 'Partiellement payé',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    if (group.status === 'all_late') {
      return {
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        text: 'Tous en retard',
        className: 'bg-red-50 text-red-700 border-red-200',
        progressText: `0/${group.totalCount} payés`,
      };
    }
    if (group.status === 'mixed') {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
        text: 'En retard',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    return {
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      text: 'En attente',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      progressText: `0/${group.totalCount} payés`,
    };
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
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Date Échéance
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Montant Total (Net)
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group) => {
              const isExpanded = expandedDates.has(group.date);
              const daysUntil = getDaysUntil(group.date);
              const statusDisplay = getEcheanceStatusDisplay(group);

              return (
                <>
                  {/* Échéance Header Row */}
                  <tr
                    key={`date-${group.date}`}
                    className={`border-b-2 border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${
                      group.status === 'all_paid' ? 'bg-green-50/30' :
                      group.status === 'all_late' ? 'bg-red-50/30' :
                      group.status === 'partial' ? 'bg-orange-50/30' :
                      'bg-white'
                    }`}
                    onClick={() => toggleDate(group.date)}
                  >
                    <td className="px-4 py-4">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-lg text-slate-900">{formatDate(group.date)}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          {daysUntil < 0 ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>En retard de {Math.abs(daysUntil)} jour{Math.abs(daysUntil) > 1 ? 's' : ''}</span>
                            </>
                          ) : daysUntil === 0 ? (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>Aujourd'hui</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-sm ${statusDisplay.className} w-fit`}>
                          {statusDisplay.icon}
                          <span>{statusDisplay.text}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          {statusDisplay.progressText}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xl font-bold text-finixar-green">
                          {formatCurrency(group.totalNet)}
                        </div>
                        <div className="text-xs text-slate-600">
                          Brut: {formatCurrency(group.totalBrut)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {group.totalCount} coupon{group.totalCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {group.hasUnpaid && (
                          <button
                            onClick={() => {
                              // Pay the entire échéance - get first unpaid coupon to extract project/tranche info
                              const firstCoupon = group.coupons[0];
                              onQuickPay(firstCoupon);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-all shadow-sm hover:shadow-md"
                            title="Payer toute l'échéance"
                          >
                            <Upload className="w-4 h-4" />
                            Payer l'échéance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Investor Detail Rows */}
                  {isExpanded &&
                    group.coupons.map((coupon, idx) => {
                      const badge = getStatusBadge(coupon);
                      const isLast = idx === group.coupons.length - 1;

                      return (
                        <tr
                          key={coupon.id}
                          className={`${isLast ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'} hover:bg-slate-50/50 bg-slate-50/20 transition-colors`}
                        >
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 pl-4">
                              {coupon.investisseur_type === 'Morale' ? (
                                <Building2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                              ) : (
                                <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {coupon.investisseur_nom}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
                                  <span className="font-medium">{coupon.projet_nom}</span>
                                  <span className="text-slate-400">•</span>
                                  <span>{coupon.tranche_nom}</span>
                                  {coupon.investisseur_cgp && (
                                    <>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-amber-700 font-medium">CGP: {coupon.investisseur_cgp}</span>
                                    </>
                                  )}
                                  {!coupon.has_rib && coupon.statut_calculated !== 'paye' && (
                                    <>
                                      <span className="text-slate-400">•</span>
                                      <span className="flex items-center gap-1 text-red-600 font-semibold">
                                        <AlertCircle className="w-3 h-3" />
                                        RIB manquant
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="text-base font-bold text-finixar-green">
                                {formatCurrency(coupon.montant_net)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Brut: {formatCurrency(coupon.montant_brut)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onViewDetails(coupon)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
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
