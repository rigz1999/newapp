import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Coins, TrendingUp, ChevronRight, ChevronDown, User, Building2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ExcelJS from 'exceljs';

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
    coupon_brut: number;
    coupon_net: number;
    montant_investi: number;
    investisseur: {
      nom_raison_sociale: string;
      type: string;
    };
    tranche: {
      tranche_name: string;
      date_echeance_finale: string;
    };
  };
  isLastEcheance: boolean;
}

interface DateGroup {
  date: string;
  echeances: Echeance[];
  totalBrut: number;
  totalNet: number;
  totalNominal: number;
  count: number;
  isLastEcheance: boolean;
}

interface TrancheGroup {
  trancheName: string;
  dateGroups: DateGroup[];
  totalBrut: number;
  totalNet: number;
  totalCount: number;
}

function EcheancierModalContent({ projectId, onClose, formatCurrency, formatDate }: EcheancierModalProps) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'a_venir' | 'paye'>('all');
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEcheances();
  }, [projectId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('ESC pressed in EcheancierModal');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose]);

  const fetchEcheances = async () => {
    setLoading(true);
    try {
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('souscriptions')
        .select(`
          id,
          id_souscription,
          coupon_brut,
          coupon_net,
          montant_investi,
          investisseur:investisseurs(nom_raison_sociale, type),
          tranche:tranches(tranche_name, date_echeance_finale)
        `)
        .eq('projet_id', projectId);

      if (subsError) throw subsError;

      const subscriptionIds = subscriptionsData?.map((s: any) => s.id) || [];

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

      const enrichedEcheances = (echeancesData || []).map((ech: any) => {
        const sub = subscriptionsData?.find((s: any) => s.id === ech.souscription_id);
        const isLastEcheance = sub?.tranche?.date_echeance_finale === ech.date_echeance;
        
        return {
          ...ech,
          souscription: {
            id_souscription: sub?.id_souscription || '',
            coupon_brut: sub?.coupon_brut || 0,
            coupon_net: sub?.coupon_net || 0,
            montant_investi: sub?.montant_investi || 0,
            investisseur: sub?.investisseur || { nom_raison_sociale: '', type: 'Physique' },
            tranche: sub?.tranche || { tranche_name: '', date_echeance_finale: '' }
          },
          isLastEcheance
        };
      });

      setEcheances(enrichedEcheances);
    } catch {
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

  const toggleDate = (key: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDates(newExpanded);
  };

  const handleExportExcel = async () => {
    const exportData = filteredEcheances.map(e => ({
      'Date Échéance': formatDate(e.date_echeance),
      'Tranche': e.souscription.tranche.tranche_name,
      'Investisseur': e.souscription.investisseur.nom_raison_sociale,
      'Type': e.souscription.investisseur.type,
      'Coupon Brut': e.souscription.coupon_brut,
      'Coupon Net': e.souscription.coupon_net,
      'Remboursement Nominal': e.isLastEcheance ? e.souscription.montant_investi : 0,
      'Total à Payer': e.isLastEcheance 
        ? e.souscription.coupon_net + e.souscription.montant_investi 
        : e.souscription.coupon_net,
      'Statut': e.statut === 'paye' ? 'Payé' : 'À venir',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Échéancier');

    // Add headers with custom column widths
    worksheet.columns = [
      { header: 'Date Échéance', key: 'Date Échéance', width: 15 },
      { header: 'Tranche', key: 'Tranche', width: 20 },
      { header: 'Investisseur', key: 'Investisseur', width: 25 },
      { header: 'Type', key: 'Type', width: 10 },
      { header: 'Coupon Brut', key: 'Coupon Brut', width: 12 },
      { header: 'Coupon Net', key: 'Coupon Net', width: 12 },
      { header: 'Remboursement Nominal', key: 'Remboursement Nominal', width: 20 },
      { header: 'Total à Payer', key: 'Total à Payer', width: 15 },
      { header: 'Statut', key: 'Statut', width: 10 }
    ];

    // Add data rows
    exportData.forEach(row => worksheet.addRow(row));

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Echeancier_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEcheances = echeances.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'a_venir') return e.statut === 'a_venir' || e.statut === 'en_attente';
    if (filter === 'paye') return e.statut === 'paye';
    return true;
  });

  // Grouper par tranche puis par date
  const trancheGroups: TrancheGroup[] = Object.values(
    filteredEcheances.reduce((acc, echeance) => {
      const trancheName = echeance.souscription.tranche.tranche_name;
      const date = echeance.date_echeance;
      
      if (!acc[trancheName]) {
        acc[trancheName] = {
          trancheName,
          dateGroups: [],
          totalBrut: 0,
          totalNet: 0,
          totalCount: 0
        };
      }
      
      let dateGroup = acc[trancheName].dateGroups.find(dg => dg.date === date);
      if (!dateGroup) {
        dateGroup = {
          date,
          echeances: [],
          totalBrut: 0,
          totalNet: 0,
          totalNominal: 0,
          count: 0,
          isLastEcheance: false
        };
        acc[trancheName].dateGroups.push(dateGroup);
      }
      
      dateGroup.echeances.push(echeance);
      dateGroup.totalBrut += echeance.souscription.coupon_brut;
      dateGroup.totalNet += echeance.souscription.coupon_net;
      if (echeance.isLastEcheance) {
        dateGroup.totalNominal += echeance.souscription.montant_investi;
        dateGroup.isLastEcheance = true;
      }
      dateGroup.count += 1;
      
      acc[trancheName].totalBrut += echeance.souscription.coupon_brut;
      acc[trancheName].totalNet += echeance.souscription.coupon_net;
      acc[trancheName].totalCount += 1;
      
      return acc;
    }, {} as Record<string, TrancheGroup>)
  );

  trancheGroups.forEach(group => {
    group.dateGroups.sort((a, b) => a.date.localeCompare(b.date));
  });

  const stats = {
    total: echeances.length,
    aVenir: echeances.filter((e) => e.statut === 'a_venir' || e.statut === 'en_attente').length,
    paye: echeances.filter((e) => e.statut === 'paye').length,
    montantTotal: echeances.reduce((sum, e) => sum + e.souscription.coupon_net, 0),
    montantAVenir: echeances
      .filter((e) => e.statut === 'a_venir' || e.statut === 'en_attente')
      .reduce((sum, e) => sum + e.souscription.coupon_net, 0),
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] m-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Échéancier Complet des Coupons</h3>
              <p className="text-sm text-slate-600 mt-1">Tous les paiements de coupons du projet</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter Excel
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
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
                <Coins className="w-4 h-4 text-finixar-green" />
                <p className="text-xs font-medium text-green-900">Payés</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.paye}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-900">Montant Total Net</p>
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
                  ? 'bg-finixar-green text-white'
                  : 'bg-green-50 text-finixar-green hover:bg-green-100'
              }`}
            >
              Payés ({stats.paye})
            </button>
          </div>
        </div>

        {/* Content - Groupé par Tranche puis Date */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
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
                const isTrancheExpanded = expandedTranches.has(group.trancheName);
                
                return (
                  <div key={group.trancheName} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Header de tranche - Cliquable */}
                    <button
                      onClick={() => toggleTranche(group.trancheName)}
                      className="w-full px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isTrancheExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                          <h4 className="text-base font-bold text-slate-900">{group.trancheName}</h4>
                          <span className="text-sm text-slate-600">
                            ({group.dateGroups.length} échéance{group.dateGroups.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{group.totalCount}</span> coupon{group.totalCount > 1 ? 's' : ''}
                          </div>
                          <div className="text-right">
                            <div className="text-base font-bold text-finixar-green">
                              {formatCurrency(group.totalNet)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Brut: {formatCurrency(group.totalBrut)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Dropdown - Dates d'échéance */}
                    {isTrancheExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50">
                        <div className="space-y-2 p-4">
                          {group.dateGroups.map((dateGroup) => {
                            const dateKey = `${group.trancheName}-${dateGroup.date}`;
                            const isDateExpanded = expandedDates.has(dateKey);
                            
                            return (
                              <div key={dateKey} className={`border rounded-lg overflow-hidden bg-white ${
                                dateGroup.isLastEcheance ? 'border-amber-300 shadow-sm' : 'border-slate-200'
                              }`}>
                                {/* Header de date - Cliquable */}
                                <button
                                  onClick={() => toggleDate(dateKey)}
                                  className="w-full px-4 py-3 hover:bg-slate-50 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isDateExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                      )}
                                      <Calendar className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-semibold text-slate-900">
                                        {formatDate(dateGroup.date)}
                                      </span>
                                      {dateGroup.isLastEcheance && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                          <AlertCircle className="w-3 h-3" />
                                          Échéance finale + Remboursement
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-xs text-slate-600">
                                        {dateGroup.count} investisseur{dateGroup.count > 1 ? 's' : ''}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-finixar-green">
                                          {formatCurrency(dateGroup.totalNet + dateGroup.totalNominal)}
                                        </div>
                                        {dateGroup.isLastEcheance ? (
                                          <div className="text-xs text-slate-500">
                                            Coupon: {formatCurrency(dateGroup.totalNet)} + Nominal: {formatCurrency(dateGroup.totalNominal)}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-slate-500">
                                            Brut: {formatCurrency(dateGroup.totalBrut)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>

                                {/* Dropdown - Liste des investisseurs */}
                                {isDateExpanded && (
                                  <div className="border-t border-slate-200 bg-slate-50">
                                    <table className="w-full">
                                      <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                            Investisseur
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                                            Coupon
                                          </th>
                                          {dateGroup.isLastEcheance && (
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                                              Remboursement
                                            </th>
                                          )}
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                                            Total à Payer
                                          </th>
                                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                                            Statut
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 bg-white">
                                        {dateGroup.echeances.map((echeance) => (
                                          <tr key={echeance.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2">
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
                                            <td className="px-4 py-2 text-right">
                                              <div className="text-base font-bold text-finixar-green">
                                                {formatCurrency(echeance.souscription.coupon_net)}
                                              </div>
                                              <div className="text-xs text-slate-500">
                                                Brut: {formatCurrency(echeance.souscription.coupon_brut)}
                                              </div>
                                            </td>
                                            {echeance.isLastEcheance && (
                                              <td className="px-4 py-2 text-right">
                                                <div className="text-base font-bold text-blue-600">
                                                  {formatCurrency(echeance.souscription.montant_investi)}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                  Nominal
                                                </div>
                                              </td>
                                            )}
                                            <td className="px-4 py-2 text-right">
                                              <div className="text-lg font-bold text-slate-900">
                                                {formatCurrency(
                                                  echeance.souscription.coupon_net + 
                                                  (echeance.isLastEcheance ? echeance.souscription.montant_investi : 0)
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              <span
                                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
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
                                )}
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
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              {trancheGroups.length} tranche{trancheGroups.length > 1 ? 's' : ''} • {filteredEcheances.length} coupon{filteredEcheances.length > 1 ? 's' : ''}
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