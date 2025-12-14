import { useState, useEffect } from 'react';
import { Calendar, Coins, TrendingUp, ChevronRight, ChevronDown, User, Building2, Download, AlertCircle, Upload, Eye, FileText, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ExcelJS from 'exceljs';
import { PaymentWizard } from '../payments/PaymentWizard';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { AlertModal } from '../common/Modals';

interface EcheancierContentProps {
  projectId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null) => string;
  onOpenFullPage?: () => void;
  isFullPage?: boolean;
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

export function EcheancierContent({
  projectId,
  formatCurrency,
  formatDate,
  onOpenFullPage,
  isFullPage = false
}: EcheancierContentProps) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'a_venir' | 'paye' | 'en_retard'>('all');
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [selectedPaymentForProof, setSelectedPaymentForProof] = useState<any>(null);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [markingUnpaid, setMarkingUnpaid] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

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

  const isOverdue = (echeance: Echeance) => {
    if (echeance.statut === 'paye') return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const echeanceDate = new Date(echeance.date_echeance);
    echeanceDate.setHours(0, 0, 0, 0);
    return echeanceDate < now;
  };

  const getEcheanceStatus = (echeance: Echeance) => {
    if (echeance.statut === 'paye') return 'paye';
    if (isOverdue(echeance)) return 'en_retard';
    return 'a_venir';
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

  const handleViewPaymentProof = async (echeance: Echeance) => {
    // First, we need to find the paiement_id from the echeance
    const { data: echeanceData, error: echeanceError } = await supabase
      .from('coupons_echeances')
      .select('paiement_id, souscription_id')
      .eq('id', echeance.id)
      .single();

    console.log('Écheance data:', echeanceData, 'Error:', echeanceError);

    if (!echeanceData?.paiement_id) {
      console.warn('No paiement_id found for écheance:', echeance.id);
      // Try to find payment by matching subscription and date
      const { data: paymentByMatch } = await supabase
        .from('paiements')
        .select(`
          *,
          tranche:tranches(tranche_name),
          investisseur:investisseurs(nom_raison_sociale)
        `)
        .eq('souscription_id', echeanceData?.souscription_id || echeance.souscription_id)
        .eq('date_paiement', echeance.date_echeance)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentByMatch) {
        console.log('Found payment by matching:', paymentByMatch);
        const { data: proofsData } = await supabase
          .from('payment_proofs')
          .select('*')
          .eq('paiement_id', paymentByMatch.id)
          .order('validated_at', { ascending: false });

        setSelectedPaymentForProof(paymentByMatch);
        setPaymentProofs(proofsData || []);
      }
      return;
    }

    // Fetch the payment with its related data
    const { data: paymentData } = await supabase
      .from('paiements')
      .select(`
        *,
        tranche:tranches(tranche_name),
        investisseur:investisseurs(nom_raison_sociale)
      `)
      .eq('id', echeanceData.paiement_id)
      .single();

    console.log('Payment data:', paymentData);

    if (!paymentData) return;

    // Fetch payment proofs
    const { data: proofsData } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('paiement_id', echeanceData.paiement_id)
      .order('validated_at', { ascending: false });

    console.log('Proofs data:', proofsData);

    setSelectedPaymentForProof(paymentData);
    setPaymentProofs(proofsData || []);
  };

  const handleMarkAsUnpaid = async (echeance: Echeance) => {
    if (markingUnpaid) return;

    setMarkingUnpaid(echeance.id);
    try {
      // Update the echeance to remove payment link and status
      const { error: echeanceError } = await supabase
        .from('coupons_echeances')
        .update({
          statut: null,
          paiement_id: null
        } as never)
        .eq('id', echeance.id);

      if (echeanceError) throw echeanceError;

      // Refresh the echeances list
      await fetchEcheances();

      setAlertModalConfig({
        title: 'Succès',
        message: 'L\'échéance a été marquée comme non payée.',
        type: 'success'
      });
      setShowAlertModal(true);
    } catch (err: any) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour: ' + err.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setMarkingUnpaid(null);
    }
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
      'Statut': e.statut === 'paye' ? 'Payé' : (isOverdue(e) ? 'En retard' : 'À venir'),
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Échéancier');

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

    exportData.forEach(row => worksheet.addRow(row));

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
    if (filter === 'paye') return e.statut === 'paye';
    if (filter === 'en_retard') return getEcheanceStatus(e) === 'en_retard';
    if (filter === 'a_venir') return getEcheanceStatus(e) === 'a_venir';
    return true;
  });

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
    paye: echeances.filter((e) => e.statut === 'paye').length,
    enRetard: echeances.filter((e) => getEcheanceStatus(e) === 'en_retard').length,
    aVenir: echeances.filter((e) => getEcheanceStatus(e) === 'a_venir').length,
    montantTotal: echeances.reduce((sum, e) => sum + e.souscription.coupon_net, 0),
    montantEnRetard: echeances
      .filter((e) => getEcheanceStatus(e) === 'en_retard')
      .reduce((sum, e) => sum + e.souscription.coupon_net, 0),
    montantAVenir: echeances
      .filter((e) => getEcheanceStatus(e) === 'a_venir')
      .reduce((sum, e) => sum + e.souscription.coupon_net, 0),
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex justify-between items-start">
          {!isFullPage && (
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Échéancier complet des coupons</h3>
              <p className="text-sm text-slate-600 mt-1">Tous les paiements de coupons du projet</p>
            </div>
          )}
          <div className={`flex items-center gap-2 ${isFullPage ? 'w-full justify-end' : ''}`}>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter Excel
            </button>
            <button
              onClick={() => setShowPaymentWizard(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer virements
            </button>
            {!isFullPage && onOpenFullPage && (
              <button
                onClick={onOpenFullPage}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-finixar-brand-blue rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ouvrir en pleine page
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Total échéances</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-900">À venir</p>
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
              <p className="text-xs font-medium text-purple-900">Montant total net</p>
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
            onClick={() => setFilter('en_retard')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'en_retard'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            En retard ({stats.enRetard})
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

              const trancheEcheances = group.dateGroups.flatMap(dg => dg.echeances);
              const totalCoupons = trancheEcheances.length;
              const paidCoupons = trancheEcheances.filter(e => e.statut === 'paye').length;
              const overdueCoupons = trancheEcheances.filter(e => getEcheanceStatus(e) === 'en_retard').length;
              const progressPercentage = totalCoupons > 0 ? (paidCoupons / totalCoupons) * 100 : 0;

              return (
                <div key={group.trancheName} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => toggleTranche(group.trancheName)}
                    className="w-full px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
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

                    {/* Progress Bar */}
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">
                          {paidCoupons} / {totalCoupons} payés
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {progressPercentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progressPercentage === 100
                              ? 'bg-gradient-to-r from-green-500 to-green-600'
                              : overdueCoupons > 0
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {isTrancheExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50">
                      <div className="space-y-2 p-4">
                        {group.dateGroups.map((dateGroup) => {
                          const dateKey = `${group.trancheName}-${dateGroup.date}`;
                          const isDateExpanded = expandedDates.has(dateKey);
                          const hasOverdueCoupons = dateGroup.echeances.some((e) => getEcheanceStatus(e) === 'en_retard');

                          return (
                            <div key={dateKey} className={`border rounded-lg overflow-hidden bg-white ${
                              dateGroup.isLastEcheance ? 'border-amber-300 shadow-sm' : 'border-slate-200'
                            }`}>
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
                                    {hasOverdueCoupons && (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
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
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                                          Preuve
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
                                                getEcheanceStatus(echeance) === 'paye'
                                                  ? 'bg-green-100 text-green-700'
                                                  : getEcheanceStatus(echeance) === 'en_retard'
                                                  ? 'bg-red-100 text-red-700'
                                                  : 'bg-orange-100 text-orange-700'
                                              }`}
                                            >
                                              {getEcheanceStatus(echeance) === 'paye'
                                                ? 'Payé'
                                                : getEcheanceStatus(echeance) === 'en_retard'
                                                ? 'En retard'
                                                : 'À venir'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {getEcheanceStatus(echeance) === 'paye' ? (
                                              <div className="flex items-center justify-center gap-1">
                                                <button
                                                  onClick={() => handleViewPaymentProof(echeance)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                  title="Voir le justificatif"
                                                >
                                                  <FileText className="w-4 h-4" />
                                                  Voir
                                                </button>
                                                <button
                                                  onClick={() => handleMarkAsUnpaid(echeance)}
                                                  disabled={markingUnpaid === echeance.id}
                                                  className="p-1 text-finixar-red hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                  title="Marquer comme non payé"
                                                >
                                                  <XCircle className={`w-4 h-4 ${markingUnpaid === echeance.id ? 'animate-pulse' : ''}`} />
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-slate-400">-</span>
                                            )}
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
            {filter === 'en_retard' && (
              <span className="ml-2 font-medium text-red-600">
                • Montant total en retard: {formatCurrency(stats.montantEnRetard)}
              </span>
            )}
            {filter === 'a_venir' && (
              <span className="ml-2 font-medium text-orange-600">
                • Montant total à venir: {formatCurrency(stats.montantAVenir)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payment Wizard Modal */}
      {showPaymentWizard && (
        <PaymentWizard
          onClose={() => setShowPaymentWizard(false)}
          onSuccess={() => {
            setShowPaymentWizard(false);
            fetchEcheances();
          }}
          preselectedProjectId={projectId}
        />
      )}

      {/* View Payment Proof Modal */}
      {selectedPaymentForProof && (
        <ViewProofsModal
          payment={selectedPaymentForProof}
          proofs={paymentProofs}
          onClose={() => {
            setSelectedPaymentForProof(null);
            setPaymentProofs([]);
          }}
          onProofDeleted={() => {
            fetchEcheances();
            setSelectedPaymentForProof(null);
            setPaymentProofs([]);
          }}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />
    </>
  );
}
