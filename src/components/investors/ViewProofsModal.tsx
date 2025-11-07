import { X, Download, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';
import { AlertModal } from '../common/Modals';

interface ViewProofsModalProps {
  payment: any;
  proofs: any[];
  onClose: () => void;
  onProofDeleted: () => void;
}

export function ViewProofsModal({ payment, proofs, onClose, onProofDeleted }: ViewProofsModalProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ proofId: string; fileUrl: string; fileName: string } | null>(null);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadAllAsZip = async () => {
    proofs.forEach(proof => {
      setTimeout(() => {
        downloadFile(proof.file_url, proof.file_name);
      }, 100);
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleDeleteProof = async (proofId: string, fileUrl: string) => {
    setDeleting(proofId);
    try {
      const pathMatch = fileUrl.match(/payment-proofs\/(.+)$/);
      if (pathMatch) {
        const filePath = pathMatch[1];

        const { error: storageError } = await supabase.storage
          .from('payment-proofs')
          .remove([filePath]);

        if (storageError) {
        }
      }

      const { error: dbError } = await supabase
        .from('payment_proofs')
        .delete()
        .eq('id', proofId);

      if (dbError) {
        throw dbError;
      }

      const remainingProofs = proofs.filter(p => p.id !== proofId);
      if (remainingProofs.length === 0) {
        const today = new Date();
        const dueDate = new Date(payment.date_paiement);
        const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const newStatus = diffDays > 7 ? 'En retard' : 'En attente';

        await supabase
          .from('paiements')
          .update({ statut: newStatus })
          .eq('id', payment.id);
      }

      onProofDeleted();
      if (remainingProofs.length === 0) {
        onClose();
      }
    } catch (err: any) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la suppression du justificatif: ' + err.message,
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Justificatifs de Paiement</h3>
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
                  {proofs.map((proof) => (
                    <div key={proof.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">📄 {proof.file_name}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Téléchargé: {new Date(proof.validated_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {proof.extracted_data && (
                            <p className="text-xs text-slate-600 mt-1">
                              Montant: {formatCurrency(proof.extracted_data.montant)} • Confiance: {proof.confidence}%
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(proof.file_url, '_blank')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => downloadFile(proof.file_url, proof.file_name)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ proofId: proof.id, fileUrl: proof.file_url, fileName: proof.file_name })}
                            disabled={deleting === proof.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer"
                          >
                            <Trash2 className={`w-5 h-5 ${deleting === proof.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {proofs.length > 1 && (
                  <button
                    onClick={downloadAllAsZip}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger Tous
                  </button>
                )}
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
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Confirmer la suppression</h3>
              </div>
            </div>

            <p className="text-slate-600 mb-2">
              Êtes-vous sûr de vouloir supprimer ce justificatif ?
            </p>
            <p className="text-sm font-medium text-slate-900 mb-4">
              {confirmDelete.fileName}
            </p>

            {proofs.length === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Attention:</strong> C'est le dernier justificatif. Le statut du paiement sera modifié en "En attente" ou "En retard".
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteProof(confirmDelete.proofId, confirmDelete.fileUrl)}
                disabled={deleting !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  );
}
