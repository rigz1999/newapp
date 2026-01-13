import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Coins,
  Building2,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  Download,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { QuickPaymentModal } from './QuickPaymentModal';
import { SimplePaymentModal } from './SimplePaymentModal';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { isValidShortId } from '../../utils/shortId';
import * as ExcelJS from 'exceljs';

interface EcheanceItem {
  id: string;
  souscription_id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  paiement_id: string | null;
  date_paiement: string | null;
  investisseur_id: string;
  investisseur_nom: string;
  investisseur_type: string;
  souscription_id_display: string;
  coupon_brut: number;
  coupon_net: number;
  montant_investi: number;
}

interface ProjetInfo {
  id: string;
  short_id: string;
  projet: string;
}

interface TrancheInfo {
  id: string;
  short_id: string;
  tranche_name: string;
}

export function EcheanceDetailPage() {
  const { projectId, trancheId, date } = useParams<{
    projectId: string;
    trancheId: string;
    date: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [echeances, setEcheances] = useState<EcheanceItem[]>([]);
  const [projetInfo, setProjetInfo] = useState<ProjetInfo | null>(null);
  const [trancheInfo, setTrancheInfo] = useState<TrancheInfo | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentForProof, setSelectedPaymentForProof] = useState<Record<string, unknown> | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<Record<string, unknown>[]>([]);
  const [singlePaymentEcheance, setSinglePaymentEcheance] = useState<EcheanceItem | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = (statut: string, dateEcheance: string) => {
    if (statut === 'paye') {
      return {
        text: 'Payé',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        iconColor: 'text-emerald-500',
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateEcheance);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return {
        text: 'En retard',
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        iconColor: 'text-red-500',
      };
    }
    return {
      text: 'Prévu',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      iconColor: 'text-amber-500',
    };
  };

  const fetchData = useCallback(async () => {
    if (!projectId || !trancheId || !date) return;

    setLoading(true);
    try {
      // Determine if we're using short_id or UUID format
      const isProjectShortId = isValidShortId(projectId, 'projet');
      const isTrancheShortId = isValidShortId(trancheId, 'tranche');

      // Fetch project info (by short_id or id)
      const projetQuery = supabase
        .from('projets')
        .select('id, short_id, projet');

      const { data: projet } = isProjectShortId
        ? await projetQuery.eq('short_id', projectId).single()
        : await projetQuery.eq('id', projectId).single();

      if (projet) setProjetInfo(projet);

      // Fetch tranche info (by short_id or id)
      const trancheQuery = supabase
        .from('tranches')
        .select('id, short_id, tranche_name');

      const { data: tranche } = isTrancheShortId
        ? await trancheQuery.eq('short_id', trancheId).single()
        : await trancheQuery.eq('id', trancheId).single();

      if (tranche) setTrancheInfo(tranche);

      // Use the resolved UUID for querying écheances
      const resolvedTrancheId = tranche?.id || trancheId;

      // Fetch all écheances for this date and tranche
      const { data: echeancesData, error } = await supabase
        .from('coupons_echeances')
        .select(`
          id,
          souscription_id,
          date_echeance,
          montant_coupon,
          statut,
          paiement_id,
          date_paiement,
          souscription:souscriptions!inner(
            id_souscription,
            coupon_brut,
            coupon_net,
            montant_investi,
            tranche_id,
            investisseur:investisseurs(
              id,
              nom_raison_sociale,
              type
            )
          )
        `)
        .eq('date_echeance', date)
        .eq('souscription.tranche_id', resolvedTrancheId);

      if (error) throw error;

      const items: EcheanceItem[] = (echeancesData || []).map((e: any) => ({
        id: e.id,
        souscription_id: e.souscription_id,
        date_echeance: e.date_echeance,
        montant_coupon: e.montant_coupon,
        statut: e.statut,
        paiement_id: e.paiement_id,
        date_paiement: e.date_paiement,
        investisseur_id: e.souscription?.investisseur?.id || '',
        investisseur_nom: e.souscription?.investisseur?.nom_raison_sociale || 'N/A',
        investisseur_type: e.souscription?.investisseur?.type || 'Physique',
        souscription_id_display: e.souscription?.id_souscription || '',
        coupon_brut: e.souscription?.coupon_brut || 0,
        coupon_net: e.souscription?.coupon_net || 0,
        montant_investi: e.souscription?.montant_investi || 0,
      }));

      // Sort by investor name
      items.sort((a, b) => a.investisseur_nom.localeCompare(b.investisseur_nom));

      setEcheances(items);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(date);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today;

      const paid = items.filter((e) => e.statut === 'paye');
      const unpaid = items.filter((e) => e.statut !== 'paye');

      setStats({
        total: items.length,
        paid: paid.length,
        pending: isOverdue ? 0 : unpaid.length,
        overdue: isOverdue ? unpaid.length : 0,
        totalAmount: items.reduce((sum, e) => sum + e.montant_coupon, 0),
        paidAmount: paid.reduce((sum, e) => sum + e.montant_coupon, 0),
        pendingAmount: unpaid.reduce((sum, e) => sum + e.montant_coupon, 0),
      });
    } catch (err) {
      console.error('Error fetching écheance details:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, trancheId, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    await triggerCacheInvalidation(['coupons', 'echeances']);
    fetchData();
  };

  const handleViewPaymentProof = async (echeance: EcheanceItem) => {
    if (!echeance.paiement_id) return;

    // Fetch the payment with its related data
    const { data: paymentData } = await supabase
      .from('paiements')
      .select(`
        *,
        tranche:tranches(tranche_name),
        investisseur:investisseurs(nom_raison_sociale)
      `)
      .eq('id', echeance.paiement_id)
      .single();

    if (!paymentData) return;

    // Fetch payment proofs
    const { data: proofsData } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('paiement_id', echeance.paiement_id)
      .order('validated_at', { ascending: false });

    setSelectedPaymentForProof(paymentData);
    setPaymentProofs(proofsData || []);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Échéance');

    // Header info
    worksheet.addRow([`Projet: ${projetInfo?.projet || ''}`]);
    worksheet.addRow([`Tranche: ${trancheInfo?.tranche_name || ''}`]);
    worksheet.addRow([`Date d'échéance: ${formatDate(date || '')}`]);
    worksheet.addRow([]);

    // Column headers
    worksheet.addRow([
      'Investisseur',
      'Type',
      'N° Souscription',
      'Montant Investi',
      'Coupon Net',
      'Statut',
      'Date Paiement',
    ]);

    // Style header row
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Data rows
    echeances.forEach((e) => {
      const status = getStatusBadge(e.statut, e.date_echeance);
      worksheet.addRow([
        e.investisseur_nom,
        e.investisseur_type,
        e.souscription_id_display,
        e.montant_investi,
        e.montant_coupon,
        status.text,
        e.date_paiement ? new Date(e.date_paiement).toLocaleDateString('fr-FR') : '-',
      ]);
    });

    // Auto-width columns
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echeance_${trancheInfo?.tranche_name || 'export'}_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle back navigation - go to project's échéancier complet
  // Use short_id for cleaner URLs when available
  const handleBack = () => {
    if (projetInfo?.short_id) {
      navigate(`/projets/${projetInfo.short_id}/echeancier`);
    } else if (projectId) {
      navigate(`/projets/${projectId}/echeancier`);
    } else {
      navigate('/projets');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Chargement de l'échéance...</p>
        </div>
      </div>
    );
  }

  const progressPercent = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={handleBack}
                className="mt-1 p-2.5 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                aria-label="Retour"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{projetInfo?.projet}</span>
                  <span className="text-slate-300">•</span>
                  <span>{trancheInfo?.tranche_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    Échéance du {formatDate(date || '')}
                  </h1>
                  <span
                    className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${
                      stats.paid === stats.total
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : stats.overdue > 0
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {stats.paid === stats.total
                      ? 'Complète'
                      : stats.overdue > 0
                        ? `${stats.overdue} en retard`
                        : `${stats.pending} à payer`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-5 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
              {stats.paid < stats.total && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-sm shadow-blue-200"
                >
                  <CreditCard className="w-4 h-4" />
                  Enregistrer un paiement
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Coins className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(stats.totalAmount)}
            </p>
            <p className="text-sm text-slate-500">{stats.total} coupons à traiter</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Payé
              </span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              {formatCurrency(stats.paidAmount)}
            </p>
            <p className="text-sm text-slate-500">{stats.paid} coupons réglés</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Prévu
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">
              {formatCurrency(stats.pendingAmount)}
            </p>
            <p className="text-sm text-slate-500">
              {stats.pending + stats.overdue} coupons restants
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Progression
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-3">{progressPercent}%</p>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    progressPercent === 100
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Liste des investisseurs</h2>
            <p className="text-sm text-slate-500 mt-1">
              {echeances.length} souscription{echeances.length > 1 ? 's' : ''} pour cette échéance
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Investisseur
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Montant Investi
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Coupon Net
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {echeances.map((echeance, index) => {
                  const status = getStatusBadge(echeance.statut, echeance.date_echeance);
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={echeance.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                              echeance.investisseur_type === 'Moral'
                                ? 'bg-purple-100'
                                : 'bg-blue-100'
                            }`}
                          >
                            {echeance.investisseur_type === 'Moral' ? (
                              <Building2 className="w-5 h-5 text-purple-600" aria-hidden="true" />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" aria-hidden="true" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {echeance.investisseur_nom}
                            </p>
                            <p className="text-sm text-slate-500">
                              {echeance.investisseur_type === 'Moral'
                                ? 'Personne Morale'
                                : 'Personne Physique'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(echeance.montant_investi)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(echeance.montant_coupon)}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${status.className}`}
                        >
                          <StatusIcon className={`w-4 h-4 ${status.iconColor}`} />
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {echeance.statut === 'paye' && echeance.paiement_id ? (
                          <button
                            onClick={() => handleViewPaymentProof(echeance)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-200"
                          >
                            <FileText className="w-4 h-4" />
                            Justificatif
                          </button>
                        ) : (
                          <button
                            onClick={() => setSinglePaymentEcheance(echeance)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                          >
                            <CreditCard className="w-4 h-4" />
                            Enregistrer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {echeances.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Aucun coupon trouvé pour cette échéance</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && projetInfo && trancheInfo && (
        <QuickPaymentModal
          preselectedProjectId={projetInfo.id}
          preselectedProjectName={projetInfo.projet}
          preselectedTrancheId={trancheInfo.id}
          preselectedTrancheName={trancheInfo.tranche_name}
          preselectedEcheanceDate={date}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* View Proofs Modal */}
      {selectedPaymentForProof && (
        <ViewProofsModal
          payment={selectedPaymentForProof}
          proofs={paymentProofs}
          onClose={() => {
            setSelectedPaymentForProof(null);
            setPaymentProofs([]);
          }}
          onProofDeleted={() => {
            fetchData();
            setSelectedPaymentForProof(null);
            setPaymentProofs([]);
          }}
        />
      )}

      {/* Single Payment Modal */}
      {singlePaymentEcheance && (
        <SimplePaymentModal
          echeanceId={singlePaymentEcheance.id}
          investisseurNom={singlePaymentEcheance.investisseur_nom}
          investisseurType={singlePaymentEcheance.investisseur_type}
          montant={singlePaymentEcheance.montant_coupon}
          dateEcheance={singlePaymentEcheance.date_echeance}
          onClose={() => setSinglePaymentEcheance(null)}
          onSuccess={() => {
            setSinglePaymentEcheance(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
