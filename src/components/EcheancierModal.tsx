import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Coins, TrendingUp, ChevronRight, ChevronDown, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EcheancierModalProps {
  projectId: string;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null) => string;
}

interface Echeance {
  id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  souscription: {
    id_souscription: string;
    investisseur: {
      nom_raison_sociale: string;
      type: string;
    };
    tranche: {
      tranche_name: string;
    };
  };
}

interface TrancheGroup {
  trancheName: string;
  echeances: Echeance[];
  total: number;
  count: number;
}

function EcheancierModalContent({ projectId, onClose, formatCurrency, formatDate }: EcheancierModalProps) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'a_venir' | 'paye'>('all');
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEcheances();
  }, [projectId]);

  const fetchEcheances = async () => {
    setLoading(true);
    try {
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('souscriptions')
        .select(`
          id,
          id_souscription,
          investisseur:investisseurs(nom_raison_sociale, type),
          tranche:tranches(tranche_name)
        `)
        .eq('projet_id', projectId);

      if (subsError) throw subsError;

      const subscriptionIds = subscriptionsData?.map(s => s.id) || [];
      
      if (subscriptionIds.length === 0) {
        setEcheances([]);
        setLoading(false);
        return;
      }

      const { data: echeancesData, error: echError } = await supabase
        .from('coupons_echeances')
        .select('*')
        .in('souscription_id', subscriptionIds)
        .order('date_echeance', { ascending: true });

      if (echError) throw echError;

      const enrichedEcheances = (echeancesData || []).map(ech => {
        const sub = subscriptionsData?.find(s => s.id === ech.souscription_id);
        return {
          ...ech,
          souscription: {
            id_souscription: sub?.id_souscription || '',
            investisseur: sub?.investisseur || { nom_raison_sociale: '', type: 'Physique' },
            tranche: sub?.tranche || { tranche_name: '' }
          }
        };
      });

      setEcheances(enrichedEcheances as any);
    } catch (err) {
      console.error('Error fetching echeances:', err);
      setEcheances([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTranche = (trancheName: string) => {
    const newExpanded = new Set(expandedTranches);
    if (newExpanded.has(trancheName)) {
      newExpanded.delete(trancheName);
    } else {
      newExpanded.add(trancheName);
    }
    setExpandedTranches(newExpanded);
  };

  const filteredEcheances = echeances.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'a_venir') return e.statut === 'a_venir' || e.statut === 'en_attente';
    if (filter === 'paye') return e.statut === 'paye';
    return true;
  });

  // Grouper par tranche
  const trancheGroups: TrancheGroup[] = Object.values(
    filteredEcheances.reduce((acc, echeance) => {
      const trancheName = echeance.souscription.tranche.tranche_name;
      if (!acc[trancheName]) {
        acc[trancheName] = {
          trancheName,
          echeances: [],
          total: 0,
          count: 0
        };
      }
      acc[trancheName].echeances.push(echeance);
      acc[trancheName].total += echeance.montant_coupon;
      acc[trancheName].count += 1;
      return acc;
    }, {} as Record<string, TrancheGroup>)
  );

  const stats = {
    total: echeances.length,
    aVenir: echeances.filter((e) => e.statut === 'a_venir' || e.statut === 'en_attente').length,
    paye: echeances.filter((e) => e.statut === 'paye').length,
    montantTotal: echeances.reduce((sum, e) => sum + e.montant_coupon, 0),
    montantAVenir: echeances
      .filter((e) => e.statut === 'a_venir' || e.statut === 'en_attente')
      .reduce((sum, e) => sum + e.montant_coupon, 0),
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Échéancier Complet des Coupons</h3>
              <p className="text-sm text-slate-600 mt-1">Tous les paiements de coupons du projet</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">Total Échéances</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-medium text-orange-900">À Venir</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.aVenir}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-green-900">Payés</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.paye}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-900">Montant Total</p>
              </div>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(stats.montantTotal)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              onClick={() => setFilter('a_venir')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'a_venir'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
              }`}
            >
              À venir ({stats.aVenir})
            </button>
            <button
              onClick={() => setFilter('paye')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'paye'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              Payés ({stats.paye})
            </button>
          </div>
        </div>

        {/* Content - Groupé par Tranche */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : trancheGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucune échéance à afficher</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trancheGroups.map((group) => {
                const isExpanded = expandedTranches.has(group.trancheName);
                
                return (
                  <div key={group.trancheName} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Header de tranche - Cliquable */}
                    <button
                      onClick={() => toggleTranche(group.trancheName)}
                      className="w-full px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                          <h4 className="text-base font-bold text-slate-900">{group.trancheName}</h4>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{group.count}</span> coupon{group.count > 1 ? 's' : ''}
                          </div>
                          <div className="text-base font-bold text-green-600">
                            {formatCurrency(group.total)}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Dropdown - Détail des souscriptions */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-100 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Investisseur
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  ID Souscription
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Montant
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                  Statut
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {group.echeances.map((echeance) => (
                                <tr key={echeance.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                    {formatDate(echeance.date_echeance)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {echeance.souscription.investisseur.type === 'Morale' ? (
                                        <Building2 className="w-4 h-4 text-purple-600" />
                                      ) : (
                                        <User className="w-4 h-4 text-blue-600" />
                                      )}
                                      <span className="text-sm text-slate-900">
                                        {echeance.souscription.investisseur.nom_raison_sociale}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">
                                    {echeance.souscription.id_souscription}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                                    {formatCurrency(echeance.montant_coupon)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                                        echeance.statut === 'paye'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-orange-100 text-orange-700'
                                      }`}
                                    >
                                      {echeance.statut === 'paye' ? 'Payé' : 'À venir'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              {trancheGroups.length} tranche{trancheGroups.length > 1 ? 's' : ''} • {filteredEcheances.length} échéance{filteredEcheances.length > 1 ? 's' : ''}
              {filter === 'a_venir' && (
                <span className="ml-2 font-medium text-orange-600">
                  • Montant total à venir: {formatCurrency(stats.montantAVenir)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EcheancierModal(props: EcheancierModalProps) {
  return createPortal(
    <EcheancierModalContent {...props} />,
    document.body
  );
}