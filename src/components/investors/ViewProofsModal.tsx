import { X, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { AlertModal } from '../common/Modals';
import { logAuditEvent } from '../../utils/auditLogger';
import { ProxiedImage } from '../common/ProxiedImage';
import { openFileInNewTab, extractStoragePath } from '../../utils/fileProxy';

interface PaymentInfo {
  id: string;
  date_paiement: string;
  tranche?: { tranche_name: string };
  investisseur?: { nom_raison_sociale: string } | null;
}

interface ProofItem {
  id: string;
  file_url: string;
  file_name: string;
  validated_at: string;
  extracted_data?: { montant: number; date?: string } | null;
  confidence?: number;
}

interface ViewProofsModalProps {
  payment: PaymentInfo;
  proofs: ProofItem[];
  onClose: () => void;
  onProofDeleted: () => void;
}

export function ViewProofsModal({
  payment,
  proofs,
  onClose,
  onProofDeleted,
}: ViewProofsModalProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    proofId: string;
    fileUrl: string;
    fileName: string;
  } | null>(null);
  const [selectedProofForPreview, setSelectedProofForPreview] = useState<ProofItem | null>(null);
  const [markAsUnpaid, setMarkAsUnpaid] = useState(false);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedProofForPreview) {
          setSelectedProofForPreview(null);
        } else if (!confirmDelete) {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose, confirmDelete, selectedProofForPreview]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const handleDeleteProof = async (proofId: string, fileUrl: string) => {
    setDeleting(proofId);
    try {
      // Delete from database first
      const { error: dbError } = await supabase.from('payment_proofs').delete().eq('id', proofId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw new Error(
          `Échec de la suppression du justificatif: ${dbError.message}. Vérifiez que vous avez les permissions nécessaires (rôle admin requis).`
        );
      }

      // Then try to delete from storage (but don't fail if storage deletion fails)
      const filePath = extractStoragePath(fileUrl);
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('payment-proofs')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError);
        }
      }

      const remainingProofs = proofs.filter(p => p.id !== proofId);
      if (remainingProofs.length === 0 && markAsUnpaid) {
        // No more proofs AND user chose to mark as unpaid
        const today = new Date();
        const dueDate = new Date(payment.date_paiement);
        const isOverdue = today > dueDate;
        const newStatus = isOverdue ? 'en_retard' : 'en_attente';

        // Update related coupons_echeances to unlink payment and update status
        await supabase
          .from('coupons_echeances')
          .update({
            statut: newStatus,
            paiement_id: null,
            date_paiement: null,
            montant_paye: null,
          })
          .eq('paiement_id', payment.id);
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'payment_proof',
        description: `a supprimé le justificatif "${confirmDelete.fileName}" — ${payment.investisseur?.nom_raison_sociale || 'inconnu'}`,
        metadata: { fileName: confirmDelete.fileName, investisseur: payment.investisseur?.nom_raison_sociale },
      });

      setAlertModalConfig({
        title: 'Succès',
        message: 'Le justificatif a été supprimé avec succès.',
        type: 'success',
      });
      setShowAlertModal(true);

      onProofDeleted();
      if (remainingProofs.length === 0) {
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: unknown) {
      console.error('Delete proof error:', err);
      setAlertModalConfig({
        title: 'Erreur de suppression',
        message:
          err instanceof Error
            ? err.message
            : 'Erreur lors de la suppression du justificatif. Vérifiez que vous avez les permissions nécessaires.',
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
      setMarkAsUnpaid(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onMouseDown={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Justificatifs de paiement</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {payment.tranche?.tranche_name} • {payment.investisseur?.nom_raison_sociale}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {proofs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Aucun justificatif</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {proofs.map(proof => (
                    <div
                      key={proof.id}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* Image Preview */}
                      {proof.file_url && (
                        <div className="relative bg-slate-50 flex items-center justify-center p-4">
                          <ProxiedImage
                            src={proof.file_url}
                            alt={proof.file_name}
                            className="max-h-48 w-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedProofForPreview(proof)}
                          />
                        </div>
                      )}

                      {/* File Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{proof.file_name}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              Téléchargé:{' '}
                              {new Date(proof.validated_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {proof.extracted_data && (
                              <p className="text-xs text-slate-600 mt-1">
                                Montant: {formatCurrency(proof.extracted_data.montant)} • Confiance:{' '}
                                {proof.confidence}%
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openFileInNewTab(proof.file_url)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ouvrir dans un nouvel onglet"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  proofId: proof.id,
                                  fileUrl: proof.file_url,
                                  fileName: proof.file_name,
                                })
                              }
                              disabled={deleting === proof.id}
                              className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Supprimer"
                            >
                              <Trash2
                                className={`w-5 h-5 ${deleting === proof.id ? 'animate-pulse' : ''}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-finixar-red" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmer la suppression</h3>
              </div>
            </div>

            <p className="text-slate-600 mb-2">
              Êtes-vous sûr de vouloir supprimer ce justificatif ?
            </p>
            <p className="text-sm font-medium text-slate-900 mb-4">{confirmDelete.fileName}</p>

            {proofs.length === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800 mb-3">
                  <strong>Attention:</strong> C'est le dernier justificatif.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markAsUnpaid}
                    onChange={e => setMarkAsUnpaid(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-finixar-teal border-slate-300 rounded focus:ring-finixar-teal"
                  />
                  <span className="text-sm text-slate-700">Marquer le paiement comme non payé</span>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setMarkAsUnpaid(false);
                }}
                disabled={deleting !== null}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteProof(confirmDelete.proofId, confirmDelete.fileUrl)}
                disabled={deleting !== null}
                className="flex-1 px-4 py-2 bg-finixar-action-delete text-white rounded-lg hover:bg-finixar-action-delete-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />

      {/* Full Screen Image Preview Modal */}
      {selectedProofForPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[70]"
          onClick={() => setSelectedProofForPreview(null)}
        >
          <div className="relative max-w-7xl w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-white">
                <h3 className="font-semibold text-lg">{selectedProofForPreview.file_name}</h3>
                <p className="text-sm text-slate-300">
                  Téléchargé:{' '}
                  {new Date(selectedProofForPreview.validated_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openFileInNewTab(selectedProofForPreview.file_url);
                  }}
                  className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedProofForPreview(null)}
                  className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                  title="Fermer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div
              className="flex-1 flex items-center justify-center overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <ProxiedImage
                src={selectedProofForPreview.file_url}
                alt={selectedProofForPreview.file_name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Info Footer */}
            {selectedProofForPreview.extracted_data && (
              <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 text-white">
                <p className="text-sm">
                  <span className="font-semibold">Données extraites:</span> Montant:{' '}
                  {formatCurrency(selectedProofForPreview.extracted_data.montant)} • Date:{' '}
                  {selectedProofForPreview.extracted_data.date} • Confiance:{' '}
                  {selectedProofForPreview.confidence}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
