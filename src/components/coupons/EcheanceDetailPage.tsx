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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { QuickPaymentModal } from './QuickPaymentModal';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
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
  projet: string;
}

interface TrancheInfo {
  id: string;
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
  const [viewProofsEcheanceId, setViewProofsEcheanceId] = useState<string | null>(null);

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
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateEcheance);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return {
        text: 'En retard',
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
      };
    }
    return {
      text: 'Prévu',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Clock,
    };
  };

  const fetchData = useCallback(async () => {
    if (!projectId || !trancheId || !date) return;

    setLoading(true);
    try {
      // Fetch project info
      const { data: projet } = await supabase
        .from('projets')
        .select('id, projet')
        .eq('id', projectId)
        .single();

      if (projet) setProjetInfo(projet);

      // Fetch tranche info
      const { data: tranche } = await supabase
        .from('tranches')
        .select('id, tranche_name')
        .eq('id', trancheId)
        .single();

      if (tranche) setTrancheInfo(tranche);

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
        .eq('souscription.tranche_id', trancheId);

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

  // Handle back navigation - return to source if specified
  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (returnTo === 'dashboard') {
      navigate('/dashboard');
    } else if (returnTo === 'coupons') {
      navigate('/coupons');
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const dateStatusBadge = getStatusBadge(
    stats.paid === stats.total ? 'paye' : 'en_attente',
    date || ''
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span>{projetInfo?.projet}</span>
              <span className="mx-1">•</span>
              <span>{trancheInfo?.tranche_name}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Échéance du {formatDate(date || '')}
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full border ${dateStatusBadge.className}`}
              >
                {stats.paid === stats.total
                  ? 'Complète'
                  : stats.overdue > 0
                    ? `${stats.overdue} en retard`
                    : `${stats.pending} à payer`}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          {stats.paid < stats.total && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Enregistrer un paiement
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">Total à payer</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-sm text-slate-500 mt-1">{stats.total} coupons</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-slate-500">Payé</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
          <p className="text-sm text-slate-500 mt-1">{stats.paid} coupons</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-slate-500">Prévu</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(stats.pendingAmount)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {stats.pending + stats.overdue} coupons restants
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 rounded-lg">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-sm text-slate-500">Progression</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0}%
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                  Investisseur
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                  N° Souscription
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">
                  Montant Investi
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">
                  Coupon Net
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                  Statut
                </th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {echeances.map((echeance) => {
                const status = getStatusBadge(echeance.statut, echeance.date_echeance);
                const StatusIcon = status.icon;

                return (
                  <tr key={echeance.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            echeance.investisseur_type === 'Moral'
                              ? 'bg-purple-100'
                              : 'bg-blue-100'
                          }`}
                        >
                          {echeance.investisseur_type === 'Moral' ? (
                            <Building2
                              className="w-4 h-4 text-purple-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {echeance.investisseur_nom}
                          </p>
                          <p className="text-xs text-slate-500">
                            {echeance.investisseur_type === 'Moral'
                              ? 'Personne Morale'
                              : 'Personne Physique'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-600">
                        {echeance.souscription_id_display || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-slate-900">
                        {formatCurrency(echeance.montant_investi)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(echeance.montant_coupon)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.className}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {echeance.statut === 'paye' && echeance.paiement_id ? (
                        <button
                          onClick={() => setViewProofsEcheanceId(echeance.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Voir le justificatif
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {echeances.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucun coupon trouvé pour cette échéance
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <QuickPaymentModal
          preselectedProjectId={projectId}
          preselectedProjectName={projetInfo?.projet}
          preselectedTrancheId={trancheId}
          preselectedTrancheName={trancheInfo?.tranche_name}
          preselectedEcheanceDate={date}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* View Proofs Modal */}
      {viewProofsEcheanceId && (
        <ViewProofsModal
          echeanceId={viewProofsEcheanceId}
          onClose={() => setViewProofsEcheanceId(null)}
          onUnlinkSuccess={() => {
            setViewProofsEcheanceId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
