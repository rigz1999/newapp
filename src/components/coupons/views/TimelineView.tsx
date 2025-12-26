import { useMemo, useState } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Calendar, ChevronDown, ChevronRight, Layers, Upload, Building2, User, Eye, AlertCircle } from 'lucide-react';

interface TimelineViewProps {
  coupons: Coupon[];
  onPayTranche: (projectId: string, trancheId: string, echeanceDate: string, projectName: string, trancheName: string) => void;
  onViewDetails: (coupon: Coupon) => void;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
}

interface GroupedData {
  date: string;
  tranches: {
    trancheId: string;
    trancheName: string;
    projetName: string;
    projetId: string;
    coupons: Coupon[];
    total: number;
    hasUnpaid: boolean;
  }[];
}

export function TimelineView({
  coupons,
  onPayTranche,
  onViewDetails,
  selectedCoupons,
  onToggleSelect,
}: TimelineViewProps) {
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());

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

  // Group by Date → Tranche → Investors
  const groupedData = useMemo<GroupedData[]>(() => {
    const grouped: { [date: string]: { [trancheId: string]: Coupon[] } } = {};

    coupons.forEach((coupon) => {
      const date = coupon.date_echeance;
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][coupon.tranche_id]) grouped[date][coupon.tranche_id] = [];
      grouped[date][coupon.tranche_id].push(coupon);
    });

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, tranches]) => ({
        date,
        tranches: Object.entries(tranches).map(([trancheId, coupons]) => ({
          trancheId,
          trancheName: coupons[0].tranche_nom,
          projetName: coupons[0].projet_nom,
          projetId: coupons[0].projet_id,
          coupons,
          total: coupons.reduce((sum, c) => sum + c.montant_net, 0),
          hasUnpaid: coupons.some(c => c.statut_calculated !== 'paye'),
        })),
      }));
  }, [coupons]);

  const toggleTranche = (key: string) => {
    const newExpanded = new Set(expandedTranches);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTranches(newExpanded);
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
    <div className="space-y-6">
      {groupedData.map(({ date, tranches }) => {
        const daysUntil = getDaysUntil(date);
        const dateTotal = tranches.reduce((sum, t) => sum + t.total, 0);

        return (
          <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Date Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{formatDate(date)}</h3>
                <p className="text-sm text-slate-600">
                  {daysUntil < 0
                    ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}`
                    : daysUntil === 0
                    ? "Aujourd'hui"
                    : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Total du jour</p>
                <p className="text-lg font-bold text-finixar-green">{formatCurrency(dateTotal)}</p>
                <p className="text-xs text-slate-500">
                  {tranches.length} tranche{tranches.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Tranches */}
            <div className="divide-y divide-slate-200">
              {tranches.map((tranche) => {
                const trancheKey = `${date}-${tranche.trancheId}`;
                const isExpanded = expandedTranches.has(trancheKey);

                return (
                  <div key={tranche.trancheId}>
                    {/* Tranche Header */}
                    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleTranche(trancheKey)}
                          className="flex items-center gap-3 flex-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Layers className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-900">{tranche.projetName}</p>
                            <p className="text-xs text-slate-600">{tranche.trancheName}</p>
                          </div>
                          {tranche.hasUnpaid && (
                            <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                              Non payé
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-finixar-green">{formatCurrency(tranche.total)}</p>
                            <p className="text-xs text-slate-500">
                              {tranche.coupons.length} investisseur{tranche.coupons.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          {tranche.hasUnpaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPayTranche(
                                  tranche.projetId,
                                  tranche.trancheId,
                                  date,
                                  tranche.projetName,
                                  tranche.trancheName
                                );
                              }}
                              className="px-3 py-1.5 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs font-medium"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Enregistrer Paiement
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded - Investors */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200">
                        <div className="divide-y divide-slate-100">
                          {tranche.coupons.map((coupon) => {
                            const badge = getStatusBadge(coupon);

                            return (
                              <div
                                key={coupon.id}
                                className="px-6 py-4 pl-20 hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedCoupons.has(coupon.id)}
                                      onChange={() => onToggleSelect(coupon.id)}
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div
                                      className={`p-2 rounded-lg ${
                                        coupon.investisseur_type === 'Morale'
                                          ? 'bg-purple-100'
                                          : 'bg-blue-100'
                                      }`}
                                    >
                                      {coupon.investisseur_type === 'Morale' ? (
                                        <Building2 className="w-4 h-4 text-purple-600" />
                                      ) : (
                                        <User className="w-4 h-4 text-blue-600" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-slate-900">
                                        {coupon.investisseur_nom}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span>{coupon.investisseur_id_display}</span>
                                        {coupon.investisseur_cgp && (
                                          <>
                                            <span>•</span>
                                            <span className="text-amber-700">
                                              CGP: {coupon.investisseur_cgp}
                                            </span>
                                          </>
                                        )}
                                        {!coupon.has_rib && (
                                          <>
                                            <span>•</span>
                                            <span className="text-finixar-red flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" />
                                              RIB manquant
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 ml-4">
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-finixar-green">
                                        {formatCurrency(coupon.montant_net)}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Brut: {formatCurrency(coupon.montant_coupon)}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className} whitespace-nowrap`}
                                    >
                                      {badge.text}
                                    </span>
                                    <button
                                      onClick={() => onViewDetails(coupon)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Voir détails"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
