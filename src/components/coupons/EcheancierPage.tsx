import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Coins,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  Download,
  Upload,
  AlertCircle,
  FileText,
  XCircle,
  Mail,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as ExcelJS from 'exceljs';
import { QuickPaymentModal } from './QuickPaymentModal';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { AlertModal } from '../common/Modals';
import { triggerCacheInvalidation } from '../../utils/cacheManager';

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
      id: string;
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
  trancheId: string;
  trancheName: string;
  dateGroups: DateGroup[];
  totalBrut: number;
  totalNet: number;
  totalCount: number;
}

interface SubscriptionData {
  id: string;
  id_souscription: string;
  coupon_brut: number;
  coupon_net: number;
  montant_investi: number;
  investisseur: {
    nom_raison_sociale: string;
    type: string;
  };
  tranche: {
    id: string;
    tranche_name: string;
    date_echeance_finale: string;
  };
}

interface EcheanceData {
  id: string;
  souscription_id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
}

export function EcheancierPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'a_venir' | 'paye' | 'en_retard'>('all');
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [preselectedTrancheId, setPreselectedTrancheId] = useState<string | undefined>(undefined);
  const [preselectedTrancheName, setPreselectedTrancheName] = useState<string | undefined>(undefined);
  const [preselectedEcheanceDate, setPreselectedEcheanceDate] = useState<string | undefined>(
    undefined
  );
  const [selectedPaymentForProof, setSelectedPaymentForProof] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<Record<string, unknown>[]>([]);
  const [echeanceProofUrls, setEcheanceProofUrls] = useState<Map<string, string>>(new Map());
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [markingUnpaid, setMarkingUnpaid] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectName();
      fetchEcheances();
    }
  }, [projectId]);

  const fetchProjectName = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('projets')
      .select('projet')
      .eq('id', projectId)
      .single();

    if (!error && data) {
      setProjectName(data.projet);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const fetchEcheances = async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    try {
      // Use INNER JOIN to automatically exclude orphaned écheances at database level
      // This prevents écheances with invalid subscription_ids from being fetched
      const { data: echeancesData, error: echError } = await supabase
        .from('coupons_echeances')
        .select(`
          *,
          souscription:souscriptions!inner(
            id,
            id_souscription,
            coupon_brut,
            coupon_net,
            montant_investi,
            investisseur:investisseurs(nom_raison_sociale, type),
            tranche:tranches!inner(id, tranche_name, date_echeance_finale, projet_id)
          )
        `)
        .eq('souscription.tranche.projet_id', projectId)
        .order('date_echeance', { ascending: true });

      if (echError) {
        throw echError;
      }

      if (!echeancesData || echeancesData.length === 0) {
        setEcheances([]);
        setLoading(false);
        return;
      }

      const enrichedEcheances = echeancesData.map((ech: any) => {
        const sub = ech.souscription;
        const isLastEcheance = sub?.tranche?.date_echeance_finale === ech.date_echeance;

        return {
          ...ech,
          souscription: {
            id_souscription: sub?.id_souscription || '',
            coupon_brut: sub?.coupon_brut || 0,
            coupon_net: sub?.coupon_net || 0,
            montant_investi: sub?.montant_investi || 0,
            investisseur: sub?.investisseur || { nom_raison_sociale: '', type: 'Physique' },
            tranche: sub?.tranche || { id: '', tranche_name: '', date_echeance_finale: '' },
          },
          isLastEcheance,
        };
      });

      setEcheances(enrichedEcheances);

      // Fetch proof URLs for paid écheances
      await fetchProofUrls(enrichedEcheances);
    } catch {
      setEcheances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProofUrls = async (echeancesList: Echeance[]) => {
    const paidEcheances = echeancesList.filter(e => e.statut === 'paye');
    if (paidEcheances.length === 0) return;

    const proofUrlsMap = new Map<string, string>();

    for (const echeance of paidEcheances) {
      // Get paiement_id from écheance
      const { data: echeanceData } = await supabase
        .from('coupons_echeances')
        .select('paiement_id')
        .eq('id', echeance.id)
        .single();

      if (!echeanceData?.paiement_id) continue;

      // Get proof for this paiement (only one proof per subscription)
      const { data: proofData } = await supabase
        .from('payment_proofs')
        .select('file_url')
        .eq('paiement_id', echeanceData.paiement_id)
        .order('validated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (proofData?.file_url) {
        proofUrlsMap.set(echeance.id, proofData.file_url);
      }
    }

    setEcheanceProofUrls(proofUrlsMap);
  };

  const handleUploadProof = async (echeanceId: string, file: File) => {
    setUploadingProof(echeanceId);
    try {
      // Get paiement_id
      const { data: echeanceData } = await supabase
        .from('coupons_echeances')
        .select('paiement_id')
        .eq('id', echeanceId)
        .single();

      if (!echeanceData?.paiement_id) {
        throw new Error('Paiement introuvable');
      }

      // Upload file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Create payment_proof record
      const { error: proofError } = await supabase
        .from('payment_proofs')
        .insert({
          paiement_id: echeanceData.paiement_id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          validated_at: new Date().toISOString(),
        });

      if (proofError) throw proofError;

      // Update local state
      const newProofUrls = new Map(echeanceProofUrls);
      newProofUrls.set(echeanceId, urlData.publicUrl);
      setEcheanceProofUrls(newProofUrls);

      setAlertModalConfig({
        title: 'Succès',
        message: 'Preuve ajoutée avec succès',
        type: 'success'
      });
      setShowAlertModal(true);
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'ajout de la preuve',
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setUploadingProof(null);
    }
  };

  const isOverdue = (echeance: Echeance) => {
    if (echeance.statut === 'paye') {
      return false;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const echeanceDate = new Date(echeance.date_echeance);
    echeanceDate.setHours(0, 0, 0, 0);
    return echeanceDate < now;
  };

  const getEcheanceStatus = (echeance: Echeance) => {
    if (echeance.statut === 'paye') {
      return 'paye';
    }
    if (isOverdue(echeance)) {
      return 'en_retard';
    }
    return 'a_venir';
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

  const handleViewPaymentProof = async (echeance: Echeance) => {
    // First, we need to find the paiement_id from the echeance
    const { data: echeanceData, error: echeanceError } = await supabase
      .from('coupons_echeances')
      .select('paiement_id')
      .eq('id', echeance.id)
      .single();

    if (!echeanceData?.paiement_id) {
      // Try to find payment by matching subscription and date
      const { data: paymentByMatch } = await supabase
        .from('paiements')
        .select(
          `
          *,
          tranche:tranches(tranche_name),
          investisseur:investisseurs(nom_raison_sociale)
        `
        )
        .eq('souscription_id', echeance.souscription_id)
        .eq('date_paiement', echeance.date_echeance)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentByMatch) {
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
      .select(
        `
        *,
        tranche:tranches(tranche_name),
        investisseur:investisseurs(nom_raison_sociale)
      `
      )
      .eq('id', echeanceData.paiement_id)
      .single();

    if (!paymentData) {
      return;
    }

    // Fetch payment proofs
    const { data: proofsData } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('paiement_id', echeanceData.paiement_id)
      .order('validated_at', { ascending: false });

    setSelectedPaymentForProof(paymentData);
    setPaymentProofs(proofsData || []);
  };

  const handleMarkAsUnpaid = async (echeance: Echeance) => {
    if (markingUnpaid) {
      return;
    }

    setMarkingUnpaid(echeance.id);
    try {
      // Get the paiement_id before we unlink it
      const { data: echeanceData } = await supabase
        .from('coupons_echeances')
        .select('paiement_id')
        .eq('id', echeance.id)
        .single();

      const paiementId = echeanceData?.paiement_id;

      // Determine the new status based on the due date
      const today = new Date();
      const dueDate = new Date(echeance.date_echeance);
      const isOverdue = today > dueDate;
      const newStatus = isOverdue ? 'en_retard' : 'en_attente';

      // Update the echeance to remove payment link and reset status
      const { error: echeanceError } = await supabase
        .from('coupons_echeances')
        .update({
          statut: newStatus,
          paiement_id: null,
          date_paiement: null,
          montant_paye: null,
        })
        .eq('id', echeance.id);

      if (echeanceError) {
        throw echeanceError;
      }

      // If there was a linked payment, delete it and its proofs
      if (paiementId) {
        // Get payment proofs to delete storage files
        const { data: proofs } = await supabase
          .from('payment_proofs')
          .select('file_url')
          .eq('paiement_id', paiementId);

        // Delete payment proofs from database
        await supabase.from('payment_proofs').delete().eq('paiement_id', paiementId);

        // Delete files from storage
        if (proofs && proofs.length > 0) {
          for (const proof of proofs) {
            if (proof.file_url) {
              // Extract file path from URL
              const urlParts = proof.file_url.split('/payment-proofs/');
              if (urlParts.length > 1) {
                const filePath = urlParts[1].split('?')[0]; // Remove query params
                await supabase.storage.from('payment-proofs').remove([filePath]);
              }
            }
          }
        }

        // Delete the payment record
        await supabase.from('paiements').delete().eq('id', paiementId);
      }

      // Refresh the echeances list
      await fetchEcheances();

      // Invalidate dashboard cache to reflect status change
      triggerCacheInvalidation();

      setAlertModalConfig({
        title: 'Succès',
        message: "L'échéance a été marquée comme non payée et le paiement a été supprimé.",
        type: 'success',
      });
      setShowAlertModal(true);
    } catch (err: unknown) {
      setAlertModalConfig({
        title: 'Erreur',
        message: `Erreur lors de la mise à jour: ${err instanceof Error ? err.message : 'Une erreur est survenue'}`,
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setMarkingUnpaid(null);
    }
  };

  const handleSendReminderForDate = async (dateGroup: DateGroup, trancheId: string) => {
    const dateKey = `${trancheId}-${dateGroup.date}`;
    setSendingEmail(dateKey);

    try {
      // First check if user has email connected
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: connection, error: connError } = await supabase
        .from('user_email_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connError || !connection) {
        setAlertModalConfig({
          title: 'E-mail non connecté',
          message: 'Veuillez d\'abord connecter votre e-mail dans les paramètres pour envoyer des rappels.',
          type: 'warning',
        });
        setShowAlertModal(true);
        setSendingEmail(null);

        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/parametres');
        }, 2000);
        return;
      }

      // Call edge function to create draft
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      // Get the project ID from the first echeance
      const echeanceIds = dateGroup.echeances.map(e => e.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice-email-draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            echeanceIds,
            projectId
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create email draft');
      }

      setAlertModalConfig({
        title: 'Brouillon créé !',
        message: `Un brouillon d'e-mail a été créé dans votre ${connection.provider === 'microsoft' ? 'Outlook' : 'Gmail'} avec les ${dateGroup.count} paiement(s) à effectuer. Ouvrez votre boîte e-mail pour le consulter et l'envoyer.`,
        type: 'success',
      });
      setShowAlertModal(true);
    } catch (error) {
      console.error('Error sending reminder:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du brouillon',
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setSendingEmail(null);
    }
  };

  const handleExportExcel = async () => {
    const exportData = filteredEcheances.map(e => ({
      'Date échéance': formatDate(e.date_echeance),
      Tranche: e.souscription.tranche.tranche_name,
      Investisseur: e.souscription.investisseur.nom_raison_sociale,
      Type: e.souscription.investisseur.type,
      'Coupon brut': e.souscription.coupon_brut,
      'Coupon net': e.souscription.coupon_net,
      'Remboursement nominal': e.isLastEcheance ? e.souscription.montant_investi : 0,
      'Total à payer': e.isLastEcheance
        ? e.souscription.coupon_net + e.souscription.montant_investi
        : e.souscription.coupon_net,
      Statut: e.statut === 'paye' ? 'Payé' : isOverdue(e) ? 'En retard' : 'À venir',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Échéancier');

    worksheet.columns = [
      { header: 'Date échéance', key: 'Date échéance', width: 15 },
      { header: 'Tranche', key: 'Tranche', width: 20 },
      { header: 'Investisseur', key: 'Investisseur', width: 25 },
      { header: 'Type', key: 'Type', width: 10 },
      { header: 'Coupon brut', key: 'Coupon brut', width: 12 },
      { header: 'Coupon net', key: 'Coupon net', width: 12 },
      { header: 'Remboursement nominal', key: 'Remboursement nominal', width: 20 },
      { header: 'Total à payer', key: 'Total à payer', width: 15 },
      { header: 'Statut', key: 'Statut', width: 10 },
    ];

    exportData.forEach(row => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Echeancier_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEcheances = echeances.filter(e => {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'paye') {
      return e.statut === 'paye';
    }
    if (filter === 'en_retard') {
      return getEcheanceStatus(e) === 'en_retard';
    }
    if (filter === 'a_venir') {
      return getEcheanceStatus(e) === 'a_venir';
    }
    return true;
  });

  const trancheGroups: TrancheGroup[] = Object.values(
    filteredEcheances.reduce(
      (acc, echeance) => {
        const trancheName = echeance.souscription.tranche.tranche_name;
        const trancheId = echeance.souscription.tranche.id;
        const date = echeance.date_echeance;

        if (!acc[trancheName]) {
          acc[trancheName] = {
            trancheId,
            trancheName,
            dateGroups: [],
            totalBrut: 0,
            totalNet: 0,
            totalCount: 0,
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
            isLastEcheance: false,
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
      },
      {} as Record<string, TrancheGroup>
    )
  );

  trancheGroups.forEach(group => {
    group.dateGroups.sort((a, b) => a.date.localeCompare(b.date));
  });

  const stats = {
    total: echeances.length,
    paye: echeances.filter(e => e.statut === 'paye').length,
    enRetard: echeances.filter(e => getEcheanceStatus(e) === 'en_retard').length,
    aVenir: echeances.filter(e => getEcheanceStatus(e) === 'a_venir').length,
    montantTotal: echeances.reduce((sum, e) => sum + e.souscription.coupon_net, 0),
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">ID du projet manquant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar - Sticky */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/projets/${projectId}`)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Retour au projet"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Échéancier complet</h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  Vue détaillée des paiements de coupons
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter Excel
              </button>
              <button
                onClick={() => {
                  setPreselectedTrancheId(undefined);
                  setPreselectedTrancheName(undefined);
                  setPreselectedEcheanceDate(undefined);
                  setShowPaymentWizard(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Enregistrer un paiement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-slate-600">Total échéances</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-orange-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-600">À venir</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">{stats.aVenir}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-green-50 rounded-lg">
                <Coins className="w-5 h-5 text-finixar-green" />
              </div>
              <p className="text-sm font-medium text-slate-600">Payés</p>
            </div>
            <p className="text-3xl font-bold text-finixar-green">{stats.paye}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-purple-50 rounded-lg">
                <Coins className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-slate-600">Montant total net</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatCurrency(stats.montantTotal)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-slate-700 mr-2">Filtrer par statut:</p>
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

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-finixar-brand-blue mx-auto mb-4"></div>
                <p className="text-slate-600">Chargement des échéances...</p>
              </div>
            </div>
          ) : filteredEcheances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Calendar className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">Aucune échéance trouvée</p>
              <p className="text-slate-400 text-sm mt-2">
                Essayez de modifier les filtres ou ajoutez des souscriptions
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {trancheGroups.map(trancheGroup => (
                <div key={trancheGroup.trancheName}>
                  {/* Tranche Header */}
                  <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <button
                      onClick={() => toggleTranche(trancheGroup.trancheName)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="flex items-center gap-3">
                        {expandedTranches.has(trancheGroup.trancheName) ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {trancheGroup.trancheName}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {trancheGroup.totalCount} échéance
                            {trancheGroup.totalCount > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Total net</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(trancheGroup.totalNet)}
                        </p>
                      </div>
                      {(() => {
                        const allEcheances = trancheGroup.dateGroups.flatMap(dg => dg.echeances);
                        const totalCount = allEcheances.length;
                        const paidCount = allEcheances.filter(e => e.statut === 'paye').length;

                        if (paidCount === totalCount) {
                          return (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                              {paidCount}/{totalCount} payés
                            </span>
                          );
                        } else if (paidCount > 0) {
                          return (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                              {paidCount}/{totalCount} payés
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">
                              {paidCount}/{totalCount} payés
                            </span>
                          );
                        }
                      })()}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPreselectedTrancheId(trancheGroup.trancheId);
                          setPreselectedTrancheName(trancheGroup.trancheName);
                          setPreselectedEcheanceDate(undefined);
                          setShowPaymentWizard(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        title="Enregistrer un paiement pour cette tranche"
                      >
                        <Upload className="w-4 h-4" />
                        Enregistrer un paiement
                      </button>
                    </div>
                  </div>

                  {/* Date Groups */}
                  {expandedTranches.has(trancheGroup.trancheName) && (
                    <div className="bg-slate-50">
                      {trancheGroup.dateGroups.map(dateGroup => {
                        const dateKey = `${trancheGroup.trancheName}-${dateGroup.date}`;
                        return (
                          <div key={dateKey} className="border-t border-slate-200">
                            {/* Date Header */}
                            <div className="w-full px-10 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors">
                              <button
                                onClick={() => toggleDate(dateKey)}
                                className="flex items-center gap-3 flex-1"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedDates.has(dateKey) ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900">
                                      {formatDate(dateGroup.date)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {dateGroup.count} investisseur{dateGroup.count > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-3">
                                {dateGroup.isLastEcheance && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                    + Nominal
                                  </span>
                                )}
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(dateGroup.totalNet + dateGroup.totalNominal)}
                                </p>
                                {(() => {
                                  const totalCount = dateGroup.echeances.length;
                                  const paidCount = dateGroup.echeances.filter(
                                    e => e.statut === 'paye'
                                  ).length;
                                  const overdueCount = dateGroup.echeances.filter(
                                    e => getEcheanceStatus(e) === 'en_retard'
                                  ).length;

                                  if (paidCount === totalCount) {
                                    return (
                                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        Tous payés ({paidCount}/{totalCount})
                                      </span>
                                    );
                                  } else if (paidCount > 0) {
                                    return (
                                      <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                        {paidCount}/{totalCount} payés
                                      </span>
                                    );
                                  } else if (overdueCount > 0) {
                                    return (
                                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                        En retard (0/{totalCount})
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                        À venir (0/{totalCount})
                                      </span>
                                    );
                                  }
                                })()}
                                {/* Actions dropdown menu */}
                                {(() => {
                                  const dateKey = `${trancheGroup.trancheId}-${dateGroup.date}`;
                                  const isDropdownOpen = openDropdown === dateKey;
                                  const isSending = sendingEmail === dateKey;
                                  const hasUnpaid = dateGroup.echeances.some(
                                    e => getEcheanceStatus(e) !== 'paye'
                                  );

                                  return (
                                    <div className="relative">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (!isSending) {
                                            setOpenDropdown(isDropdownOpen ? null : dateKey);
                                          }
                                        }}
                                        disabled={isSending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        title={isSending ? 'Envoi en cours...' : 'Actions'}
                                      >
                                        {isSending ? (
                                          <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Envoi...
                                          </>
                                        ) : (
                                          <>
                                            <MoreVertical className="w-4 h-4" />
                                            Actions
                                          </>
                                        )}
                                      </button>

                                      {isDropdownOpen && !isSending && (
                                        <div
                                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {hasUnpaid && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setOpenDropdown(null);
                                                handleSendReminderForDate(dateGroup, trancheGroup.trancheId);
                                              }}
                                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                              <Mail className="w-4 h-4 text-finixar-brand-blue" />
                                              <span>Rappeler l'émetteur</span>
                                            </button>
                                          )}
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setOpenDropdown(null);
                                              setPreselectedTrancheId(trancheGroup.trancheId);
                                              setPreselectedTrancheName(trancheGroup.trancheName);
                                              setPreselectedEcheanceDate(dateGroup.date);
                                              setShowPaymentWizard(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                          >
                                            <Upload className="w-4 h-4 text-green-600" />
                                            <span>Enregistrer paiement</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Echeance Details */}
                            {expandedDates.has(dateKey) && (
                              <div className="px-14 pb-4 space-y-2">
                                {dateGroup.echeances.map(echeance => {
                                  const status = getEcheanceStatus(echeance);
                                  return (
                                    <div
                                      key={echeance.id}
                                      className="bg-white rounded-lg p-4 shadow-sm border border-slate-200"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                          <div className="p-2 bg-slate-100 rounded-lg">
                                            {echeance.souscription.investisseur.type ===
                                            'Physique' ? (
                                              <User className="w-4 h-4 text-slate-600" />
                                            ) : (
                                              <Building2 className="w-4 h-4 text-slate-600" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="font-medium text-slate-900">
                                              {
                                                echeance.souscription.investisseur
                                                  .nom_raison_sociale
                                              }
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {echeance.souscription.id_souscription}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                          {echeance.isLastEcheance && (
                                            <div className="text-right">
                                              <p className="text-xs text-purple-600 font-medium">
                                                Remboursement
                                              </p>
                                              <p className="text-sm font-semibold text-purple-900">
                                                {formatCurrency(
                                                  echeance.souscription.montant_investi
                                                )}
                                              </p>
                                            </div>
                                          )}
                                          <div className="text-right">
                                            <p className="text-xs text-slate-500">Coupon net</p>
                                            <p className="text-sm font-semibold text-slate-900">
                                              {formatCurrency(echeance.souscription.coupon_net)}
                                            </p>
                                          </div>
                                          <div className="min-w-[90px]">
                                            {status === 'paye' && (
                                              <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                Payé
                                              </span>
                                            )}
                                            {status === 'en_retard' && (
                                              <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                En retard
                                              </span>
                                            )}
                                            {status === 'a_venir' && (
                                              <span className="inline-flex items-center px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                                À venir
                                              </span>
                                            )}
                                          </div>
                                          {status === 'paye' && (
                                            <div className="flex items-center gap-2">
                                              {echeanceProofUrls.has(echeance.id) ? (
                                                <a
                                                  href={echeanceProofUrls.get(echeance.id)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Ouvrir la preuve dans un nouvel onglet"
                                                >
                                                  <FileText className="w-4 h-4" />
                                                  Preuve
                                                </a>
                                              ) : (
                                                <label
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                  title="Ajouter une preuve"
                                                >
                                                  <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    disabled={uploadingProof === echeance.id}
                                                    onChange={(e) => {
                                                      const file = e.target.files?.[0];
                                                      if (file) handleUploadProof(echeance.id, file);
                                                    }}
                                                  />
                                                  <Upload className={`w-4 h-4 ${uploadingProof === echeance.id ? 'animate-pulse' : ''}`} />
                                                  {uploadingProof === echeance.id ? 'Envoi...' : 'Preuve'}
                                                </label>
                                              )}
                                              <button
                                                onClick={() => handleMarkAsUnpaid(echeance)}
                                                disabled={markingUnpaid === echeance.id}
                                                className="p-1.5 text-finixar-red hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Marquer comme non payé"
                                              >
                                                <XCircle
                                                  className={`w-4 h-4 ${markingUnpaid === echeance.id ? 'animate-pulse' : ''}`}
                                                />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Payment Modal */}
      {showPaymentWizard && (
        <QuickPaymentModal
          preselectedProjectId={projectId}
          preselectedProjectName={projectName}
          preselectedTrancheId={preselectedTrancheId}
          preselectedTrancheName={preselectedTrancheName}
          preselectedEcheanceDate={preselectedEcheanceDate}
          onClose={() => {
            setShowPaymentWizard(false);
            setPreselectedTrancheId(undefined);
            setPreselectedTrancheName(undefined);
            setPreselectedEcheanceDate(undefined);
          }}
          onSuccess={() => {
            setShowPaymentWizard(false);
            setPreselectedTrancheId(undefined);
            setPreselectedTrancheName(undefined);
            setPreselectedEcheanceDate(undefined);
            fetchEcheances();
          }}
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
    </div>
  );
}
