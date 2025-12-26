import { useState } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Building2, User, Eye, Upload, AlertCircle, ArrowUp, ArrowDown, Calendar } from 'lucide-react';

interface TableViewProps {
  coupons: Coupon[];
  onQuickPay: (coupon: Coupon) => void;
  onViewDetails: (coupon: Coupon) => void;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
  onToggleSelectAll: () => void;
}

type SortField = 'date_echeance' | 'projet_nom' | 'investisseur_nom' | 'montant_net' | 'statut_calculated';
type SortDirection = 'asc' | 'desc';

export function TableView({
  coupons,
  onQuickPay,
  onViewDetails,
  selectedCoupons,
  onToggleSelect,
  onToggleSelectAll,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('date_echeance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCoupons = [...coupons].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'date_echeance') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUp className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'paye':
        return { text: 'Payé', className: 'bg-green-100 text-green-800' };
      case 'en_retard':
        return { text: 'En retard', className: 'bg-red-100 text-red-800' };
      case 'en_attente':
        return { text: 'En attente', className: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: statut, className: 'bg-slate-100 text-slate-800' };
    }
  };

  const allSelected = coupons.length > 0 && coupons.every(c => selectedCoupons.has(c.id));
  const someSelected = coupons.some(c => selectedCoupons.has(c.id)) && !allSelected;

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
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </th>
              <th
                onClick={() => handleSort('date_echeance')}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Date échéance
                  <SortIcon field="date_echeance" />
                </div>
              </th>
              <th
                onClick={() => handleSort('projet_nom')}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Projet / Tranche
                  <SortIcon field="projet_nom" />
                </div>
              </th>
              <th
                onClick={() => handleSort('investisseur_nom')}
                className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Investisseur
                  <SortIcon field="investisseur_nom" />
                </div>
              </th>
              <th
                onClick={() => handleSort('montant_net')}
                className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-2">
                  Montant
                  <SortIcon field="montant_net" />
                </div>
              </th>
              <th
                onClick={() => handleSort('statut_calculated')}
                className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-center gap-2">
                  Statut
                  <SortIcon field="statut_calculated" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedCoupons.map((coupon) => {
              const badge = getStatusBadge(coupon.statut_calculated);
              const isPaid = coupon.statut_calculated === 'paye';

              return (
                <tr
                  key={coupon.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    selectedCoupons.has(coupon.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCoupons.has(coupon.id)}
                      onChange={() => onToggleSelect(coupon.id)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{formatDate(coupon.date_echeance)}</div>
                    <div className="text-xs text-slate-500">
                      {coupon.jours_restants < 0
                        ? `Retard de ${Math.abs(coupon.jours_restants)}j`
                        : coupon.jours_restants === 0
                        ? 'Aujourd\'hui'
                        : `Dans ${coupon.jours_restants}j`}
                    </div>
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
                          {!coupon.has_rib && !isPaid && (
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
                    <div className="text-sm font-bold text-finixar-green">{formatCurrency(coupon.montant_net)}</div>
                    <div className="text-xs text-slate-500">Brut: {formatCurrency(coupon.montant_coupon)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
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
                      {!isPaid && (
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
