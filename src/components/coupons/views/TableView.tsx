import { useState, useMemo, useEffect } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { TaxInfoTooltip } from '../../common/TaxInfoTooltip';
import {
  Building2,
  User,
  Upload,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  XCircle,
  MoreVertical,
  FileText,
} from 'lucide-react';

interface TableViewProps {
  coupons: Coupon[];
  onQuickPay: (coupon: Coupon) => void;
  onViewDetails: (coupon: Coupon) => void;
  onMarkAsUnpaid?: (coupon: Coupon) => void;
  onMarkGroupAsUnpaid?: (date: string, coupons: Coupon[]) => void;
  markingUnpaid?: string | null;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
  onToggleSelectAll: () => void;
}

interface GroupedData {
  key: string; // unique key: date|tranche_id
  date: string;
  coupons: Coupon[];
  totalBrut: number;
  totalNet: number;
  totalNominal: number;
  paidCount: number;
  totalCount: number;
  status: 'all_paid' | 'partial' | 'all_late' | 'all_pending' | 'mixed';
  hasUnpaid: boolean;
  projectName: string;
  trancheName: string;
  isLastEcheance: boolean;
}

export function TableView({
  coupons,
  onQuickPay,
  onViewDetails,
  onMarkAsUnpaid,
  onMarkGroupAsUnpaid,
  markingUnpaid,
}: TableViewProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

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
    return { text: 'Prévu', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  };

  // Group by date + project + tranche (not just date!)
  const groupedData = useMemo<GroupedData[]>(() => {
    const grouped: { [key: string]: Coupon[] } = {};

    coupons.forEach(coupon => {
      // Use date + tranche_id as key to avoid mixing different projects/tranches
      const key = `${coupon.date_echeance}|${coupon.tranche_id}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(coupon);
    });

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, coupons]) => {
        // Extract actual date from first coupon (key is date|tranche_id)
        const date = coupons[0].date_echeance;
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

        // Calculate nominal reimbursement for last echeance
        const isLastEcheance = coupons.some(c => c.is_last_echeance);
        const totalNominal = isLastEcheance
          ? coupons.filter(c => c.is_last_echeance).reduce((sum, c) => sum + c.montant_investi, 0)
          : 0;

        return {
          key, // unique key for expand/collapse
          date,
          coupons,
          totalBrut: coupons.reduce((sum, c) => sum + c.montant_brut, 0),
          totalNet: coupons.reduce((sum, c) => sum + c.montant_net, 0),
          totalNominal,
          paidCount,
          totalCount,
          status,
          hasUnpaid: paidCount < totalCount,
          projectName: coupons[0].projet_nom,
          trancheName: coupons[0].tranche_nom,
          isLastEcheance,
        };
      });
  }, [coupons]);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDates(newExpanded);
  };

  const getEcheanceStatusDisplay = (group: GroupedData) => {
    if (group.status === 'all_paid') {
      return {
        text: 'Tous payés',
        className: 'bg-green-100 text-green-800 border-green-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    if (group.status === 'partial') {
      return {
        text: 'Partiellement payé',
        className: 'bg-orange-100 text-orange-800 border-orange-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    if (group.status === 'all_late') {
      return {
        text: 'En retard',
        className: 'bg-red-100 text-red-800 border-red-200',
        progressText: `0/${group.totalCount} payés`,
      };
    }
    if (group.status === 'mixed') {
      return {
        text: 'En retard',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        progressText: `${group.paidCount}/${group.totalCount} payés`,
      };
    }
    return {
      text: 'Prévu',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
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
                Projet / Tranche
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
            {groupedData.map(group => {
              const isExpanded = expandedDates.has(group.key);
              const daysUntil = getDaysUntil(group.date);
              const statusDisplay = getEcheanceStatusDisplay(group);

              return (
                <>
                  {/* Échéance Header Row */}
                  <tr
                    key={`date-${group.date}`}
                    className={`border-b-2 border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${
                      group.status === 'all_paid'
                        ? 'bg-green-50/30'
                        : group.status === 'all_late'
                          ? 'bg-red-50/30'
                          : group.status === 'partial'
                            ? 'bg-orange-50/30'
                            : 'bg-white'
                    }`}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-base text-slate-900 leading-tight">
                          {formatDate(group.date)}
                        </div>
                        {group.status !== 'all_paid' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            {daysUntil < 0 ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                                <span>
                                  En retard de {Math.abs(daysUntil)} jour
                                  {Math.abs(daysUntil) > 1 ? 's' : ''}
                                </span>
                              </>
                            ) : daysUntil === 0 ? (
                              <>
                                <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span>Aujourd'hui</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                <span>
                                  Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-sm text-slate-900 leading-tight">
                          {group.projectName}
                        </div>
                        <div className="text-xs text-slate-600">{group.trancheName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md border font-semibold text-xs leading-tight ${statusDisplay.className} w-fit`}
                        >
                          {statusDisplay.text}
                        </span>
                        <div className="text-xs font-medium text-slate-700">
                          {statusDisplay.progressText}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right align-middle">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          {group.isLastEcheance && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              + Nominal
                            </span>
                          )}
                          <div className="text-base font-bold text-finixar-green leading-tight">
                            {formatCurrency(group.totalNet + group.totalNominal)}
                          </div>
                        </div>
                        {group.isLastEcheance ? (
                          <div className="text-xs text-slate-600 leading-tight">
                            Coupon: {formatCurrency(group.totalNet)} + Nominal: {formatCurrency(group.totalNominal)}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600 leading-tight">
                            Brut: {formatCurrency(group.totalBrut)}
                          </div>
                        )}
                        <div className="text-xs text-slate-500 font-medium leading-tight">
                          {group.totalCount} coupon{group.totalCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {group.hasUnpaid && (
                          <button
                            onClick={() => {
                              // Pay the entire échéance - get first unpaid coupon to extract project/tranche info
                              const firstCoupon = group.coupons[0];
                              onQuickPay(firstCoupon);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-all shadow-sm hover:shadow-md"
                            title="Payer toute l'échéance"
                          >
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            Payer
                          </button>
                        )}
                        {group.paidCount > 0 && onMarkGroupAsUnpaid && (
                          <button
                            onClick={() => {
                              const paidCoupons = group.coupons.filter(
                                c => c.statut_calculated === 'paye'
                              );
                              onMarkGroupAsUnpaid(group.date, paidCoupons);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all shadow-sm hover:shadow-md"
                            title="Marquer tous les coupons de cette échéance comme impayés"
                          >
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            Marquer impayé
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
                          <td className="px-4 py-3 align-middle" colSpan={2}>
                            <div className="flex items-start gap-2 pl-4">
                              {coupon.investisseur_type === 'Morale' ? (
                                <Building2 className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                              ) : (
                                <User className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                                  {coupon.investisseur_nom}
                                </div>
                                {coupon.investisseur_cgp && (
                                  <div className="text-xs text-amber-700 font-medium mt-1">
                                    CGP: {coupon.investisseur_cgp}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border leading-tight ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                {coupon.is_last_echeance && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                    + Nominal
                                  </span>
                                )}
                                <TaxInfoTooltip
                                  couponBrut={coupon.montant_brut}
                                  couponNet={coupon.montant_net}
                                  investorType={coupon.investisseur_type || 'physique'}
                                />
                                <div className="text-sm font-bold text-finixar-green leading-tight">
                                  {formatCurrency(coupon.montant_net + (coupon.is_last_echeance ? coupon.montant_investi : 0))}
                                </div>
                              </div>
                              {coupon.is_last_echeance ? (
                                <div className="text-xs text-slate-500 leading-tight">
                                  Coupon: {formatCurrency(coupon.montant_net)} + Nominal: {formatCurrency(coupon.montant_investi)}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 leading-tight">
                                  Brut: {formatCurrency(coupon.montant_brut)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center justify-end relative">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === coupon.id ? null : coupon.id);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4 flex-shrink-0" />
                              </button>

                              {openDropdown === coupon.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setOpenDropdown(null);
                                      onViewDetails(coupon);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                    <span>Voir détails</span>
                                  </button>

                                  {coupon.statut_calculated === 'paye' && onMarkAsUnpaid && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenDropdown(null);
                                        onMarkAsUnpaid(coupon);
                                      }}
                                      disabled={markingUnpaid === coupon.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                      <XCircle
                                        className={`w-4 h-4 text-finixar-red flex-shrink-0 ${markingUnpaid === coupon.id ? 'animate-pulse' : ''}`}
                                      />
                                      <span>Marquer impayé</span>
                                    </button>
                                  )}

                                  {coupon.statut_calculated !== 'paye' && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setOpenDropdown(null);
                                        onQuickPay(coupon);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                      <Upload className="w-4 h-4 text-green-600 flex-shrink-0" />
                                      <span>Payer</span>
                                    </button>
                                  )}
                                </div>
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
