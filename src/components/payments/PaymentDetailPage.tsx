import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileText,
  CheckCircle2,
  Clock,
  Upload,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { PaymentProofUpload } from './PaymentProofUpload';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { logAuditEvent, auditFormatCurrency } from '../../utils/auditLogger';
import { ActivityTimeline } from '../audit/ActivityTimeline';

interface PaymentDetail {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  statut: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  tranche_id: string;
  souscription_id: string;
  tranche: {
    tranche_name: string;
    projet_id: string;
    projet: {
      projet: string;
      emetteur: string;
    };
  };
  investisseur: {
    id: string;
    nom_raison_sociale: string;
  } | null;
  souscription: {
    montant_investi: number;
    coupon_brut: number;
    coupon_net: number;
  } | null;
}

export function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proofs, setProofs] = useState<
    {
      id: string;
      file_url: string;
      file_name: string;
      validated_at: string;
      extracted_data?: { montant: number; date?: string } | null;
      confidence?: number;
    }[]
  >([]);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [_deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
      fetchProofs();
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('paiements')
        .select(
          `
          *,
          tranche:tranches(
            tranche_name,
            projet_id,
            projet:projets(projet, emetteur)
          ),
          investisseur:investisseurs(id, nom_raison_sociale),
          souscription:souscriptions(montant_investi, coupon_brut, coupon_net)
        `
        )
        .eq('id', paymentId!)
        .single();

      if (fetchError) {
        throw fetchError;
      }
      setPayment(data as unknown as PaymentDetail);
    } catch (err) {
      console.error('Error fetching payment:', err);
      setError('Impossible de charger les détails du paiement');
    } finally {
      setLoading(false);
    }
  };

  const fetchProofs = async () => {
    try {
      const { data, error: proofsError } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('paiement_id', paymentId!)
        .order('validated_at', { ascending: false });

      if (!proofsError && data) {
        setProofs(data as typeof proofs);
      }
    } catch (err) {
      console.error('Error fetching proofs:', err);
    }
  };

  const handleDeletePayment = async () => {
    if (!payment) {
      return;
    }

    setDeleting(true);
    try {
      // Get all proofs for this payment
      const { data: proofsData } = await supabase
        .from('payment_proofs')
        .select('file_url')
        .eq('paiement_id', payment.id);

      // Delete files from storage
      if (proofsData && proofsData.length > 0) {
        for (const proof of proofsData) {
          if (proof.file_url) {
            const urlParts = proof.file_url.split('/payment-proofs/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split('?')[0];
              await supabase.storage.from('payment-proofs').remove([filePath]);
            }
          }
        }
      }

      // Delete payment (proofs will cascade)
      const { error: deleteError } = await supabase.from('paiements').delete().eq('id', payment.id);

      if (deleteError) {
        throw deleteError;
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'paiement',
        entityId: payment.id,
        description: `a supprimé le paiement ${payment.id_paiement} de ${auditFormatCurrency(payment.montant)}`,
        metadata: {
          id_paiement: payment.id_paiement,
          montant: payment.montant,
          investisseur: payment.investisseur?.nom_raison_sociale,
          projet: payment.tranche?.projet?.projet,
        },
      });

      // Invalidate cache
      triggerCacheInvalidation();

      // Navigate back to payments list
      navigate('/paiements');
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Erreur lors de la suppression du paiement');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-finixar-brand-blue"></div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-6">{error || 'Paiement introuvable'}</p>
          <button
            onClick={() => navigate('/paiements')}
            className="px-4 py-2 bg-finixar-brand-blue text-white rounded-lg hover:bg-finixar-brand-blue-dark transition-colors"
          >
            Retour aux paiements
          </button>
        </div>
      </div>
    );
  }

  const isPaid =
    payment.statut?.toLowerCase() === 'payé' || payment.statut?.toLowerCase() === 'paid';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/paiements')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Retour aux paiements"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Détail du paiement</h1>
                <p className="text-sm text-slate-600 mt-0.5">{payment.id_paiement}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount & Status Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Montant</p>
                  <p className="text-4xl font-bold text-slate-900">
                    {formatCurrency(payment.montant)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {isPaid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Payé
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      En attente
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Type de paiement</p>
                  <p className="text-sm font-medium text-slate-900">{payment.type || 'Coupon'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Date de paiement</p>
                  <p className="text-sm font-medium text-slate-900">
                    {payment.date_paiement ? formatDate(payment.date_paiement) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Project & Tranche */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Projet et Tranche</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">Projet</p>
                  <button
                    onClick={() => navigate(`/projets/${payment.tranche.projet_id}`)}
                    className="text-base font-medium text-finixar-brand-blue hover:underline text-left"
                  >
                    {payment.tranche.projet.projet}
                  </button>
                  <p className="text-sm text-slate-600 mt-1">
                    Émetteur: {payment.tranche.projet.emetteur}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Tranche</p>
                  <p className="text-base font-medium text-slate-900">
                    {payment.tranche.tranche_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Investor & Subscription Info */}
            {payment.investisseur && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Investisseur</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/investisseurs?search=${payment.investisseur?.nom_raison_sociale}`)
                    }
                    className="text-base font-medium text-finixar-brand-blue hover:underline"
                  >
                    {payment.investisseur.nom_raison_sociale}
                  </button>
                </div>
                {payment.souscription && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Investi</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(payment.souscription.montant_investi)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Coupon brut</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(payment.souscription.coupon_brut)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Coupon net</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(payment.souscription.coupon_net)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            {payment.note && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Note</p>
                    <p className="text-sm text-blue-800">{payment.note}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Proof Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Justificatifs</h2>
              {proofs.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {proofs.length} justificatif{proofs.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowProofsModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-finixar-brand-blue border border-finixar-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Voir les justificatifs
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter un justificatif
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm">Aucun justificatif</span>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-finixar-brand-blue rounded-lg hover:bg-finixar-brand-blue-dark transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter un justificatif
                  </button>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Historique</h2>
              <ActivityTimeline entityType="paiement" entityId={payment.id} />
              <div className="space-y-4 mt-3 pt-3 border-t border-slate-100">
                {payment.created_at && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-finixar-brand-blue rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Paiement créé</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                )}
                {payment.created_at &&
                  payment.updated_at &&
                  payment.created_at !== payment.updated_at && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Dernière modification</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(payment.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProofsModal && (
        <ViewProofsModal
          payment={payment}
          proofs={proofs}
          onClose={() => setShowProofsModal(false)}
          onProofDeleted={() => {
            fetchProofs();
            setShowProofsModal(false);
          }}
        />
      )}

      {showUploadModal && (
        <PaymentProofUpload
          payment={payment}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchProofs();
            setShowUploadModal(false);
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeletePayment}
          title="Supprimer le paiement"
          message={`Êtes-vous sûr de vouloir supprimer ce paiement de ${formatCurrency(payment.montant)} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          isDangerous
        />
      )}
    </div>
  );
}
