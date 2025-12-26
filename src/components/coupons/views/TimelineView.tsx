import { useMemo, useState } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { Calendar, ChevronDown, ChevronRight, Layers, Upload, Building2, User, Eye, AlertCircle, Clock } from 'lucide-react';

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
    allPaid: boolean;
  }[];
  allPaid: boolean;
}

export function TimelineView({
  coupons,
  onPayTranche,
  onViewDetails,
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
      .map(([date, tranches]) => {
        const tranchesArray = Object.entries(tranches).map(([trancheId, coupons]) => ({
          trancheId,
          trancheName: coupons[0].tranche_nom,
          projetName: coupons[0].projet_nom,
          projetId: coupons[0].projet_id,
          coupons,
          total: coupons.reduce((sum, c) => sum + c.montant_net, 0),
          hasUnpaid: coupons.some(c => c.statut_calculated !== 'paye'),
          allPaid: coupons.every(c => c.statut_calculated === 'paye'),
        }));

        const allPaid = tranchesArray.every(t => t.allPaid);

        return {
          date,
          tranches: tranchesArray,
          allPaid,
        };
      });
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
      {groupedData.map((group) => {
        const daysUntil = getDaysUntil(group.date);
        const dateTotal = group.tranches.reduce((sum, t) => sum + t.total, 0);

        return (
          <div key={group.date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Date Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{formatDate(group.date)}</h3>
                {!group.allPaid && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
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
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Total du jour</p>
                <p className="text-base font-bold text-finixar-green">{formatCurrency(dateTotal)}</p>
                <p className="text-xs text-slate-500">
                  {group.tranches.length} tranche{group.tranches.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Tranches */}
            <div className="divide-y divide-slate-200">
              {group.tranches.map((tranche) => {
                const trancheKey = `${group.date}-${tranche.trancheId}`;
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
                                  group.date,
                                  tranche.projetName,
                                  tranche.trancheName
                                );
                              }}
                              className="px-3 py-1.5 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 text-xs font-semibold"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Payer
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
                                className="px-6 py-3 pl-20 hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
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
                                      <p className="text-sm font-semibold text-slate-900">
                                        {coupon.investisseur_nom}
                                      </p>
                                      {coupon.investisseur_cgp && (
                                        <div className="text-xs text-amber-700 font-medium mt-0.5">
                                          CGP: {coupon.investisseur_cgp}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 ml-4">
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-finixar-green">
                                        {formatCurrency(coupon.montant_net)}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Brut: {formatCurrency(coupon.montant_brut)}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badge.className} whitespace-nowrap`}
                                    >
                                      {badge.text}
                                    </span>
                                    <button
                                      onClick={() => onViewDetails(coupon)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
