import { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Eye,
  Trash2,
  AlertTriangle,
  Plus,
  Users,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import { logAuditEvent } from '../../utils/auditLogger';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';
import { sanitizeFileName } from '../../utils/sanitizer';

interface EcheanceProofsModalProps {
  echeanceDate: string;
  trancheId: string;
  trancheName: string;
  projetName: string;
  // List of all echeances for this date (paid ones)
  paidEcheances: Array<{
    id: string;
    paiement_id: string;
    investisseur_nom: string;
    investisseur_id: string;
    montant_coupon: number;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProofItem {
  id: string;
  paiement_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  validated_at: string | null;
  investisseur_nom?: string;
}

export function EcheanceProofsModal({
  echeanceDate,
  trancheName,
  projetName,
  paidEcheances,
  onClose,
  onSuccess,
}: EcheanceProofsModalProps) {
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadMode, setUploadMode] = useState<'all' | 'single'>('all');
  const [selectedInvestorPaymentId, setSelectedInvestorPaymentId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProofForPreview, setSelectedProofForPreview] = useState<ProofItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProofItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to get a signed URL from a stored file URL
  const getSignedUrl = async (fileUrl: string): Promise<string> => {
    try {
      const pathMatch = fileUrl.match(/payment-proofs\/(.+?)(?:\?|$)/);
      if (!pathMatch) return fileUrl;
      const filePath = decodeURIComponent(pathMatch[1]);
      const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(filePath, 3600);
      return data?.signedUrl || fileUrl;
    } catch {
      return fileUrl;
    }
  };

  // Fetch all proofs for this echeance
  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      const paiementIds = paidEcheances.map(e => e.paiement_id).filter(Boolean);

      if (paiementIds.length === 0) {
        setProofs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_proofs')
        .select(
          `
          id,
          paiement_id,
          file_url,
          file_name,
          file_size,
          validated_at
        `
        )
        .in('paiement_id', paiementIds)
        .order('validated_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Enrich with investor names
      const enrichedProofs = (data || []).map(proof => {
        const echeance = paidEcheances.find(e => e.paiement_id === proof.paiement_id);
        return {
          ...proof,
          investisseur_nom: echeance?.investisseur_nom || 'Inconnu',
        };
      });

      // Refresh signed URLs for all proofs
      const proofsWithSignedUrls = await Promise.all(
        enrichedProofs.map(async (proof) => ({
          ...proof,
          file_url: await getSignedUrl(proof.file_url),
        }))
      );

      setProofs(proofsWithSignedUrls);
    } catch (err) {
      console.error('Error fetching proofs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const processFiles = (selectedFiles: File[]) => {
    const validFiles: File[] = [];
    for (const file of selectedFiles) {
      const validation = validateFile(file, FILE_VALIDATION_PRESETS.documents);
      if (!validation.valid) {
        setError(validation.error || 'Fichier invalide');
        return;
      }
      validFiles.push(file);
    }
    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Determine which payments to link the proof to
      let targetPaymentIds: string[] = [];

      if (uploadMode === 'all') {
        // Upload for all investors
        targetPaymentIds = paidEcheances.map(e => e.paiement_id).filter(Boolean);
      } else {
        // Upload for specific investor
        if (!selectedInvestorPaymentId) {
          setError('Veuillez sélectionner un investisseur');
          setUploading(false);
          return;
        }
        targetPaymentIds = [selectedInvestorPaymentId];
      }

      if (targetPaymentIds.length === 0) {
        setError('Aucun paiement trouvé');
        setUploading(false);
        return;
      }

      // Upload each file
      for (const file of files) {
        const safeName = sanitizeFileName(file.name);
        // Use first payment ID for storage path (proofs are linked to all relevant payments)
        const fileName = `${targetPaymentIds[0]}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = await supabase.storage.from('payment-proofs').createSignedUrl(fileName, 31536000);

        // Create proof records for all target payments
        for (const paymentId of targetPaymentIds) {
          await supabase.from('payment_proofs').insert({
            paiement_id: paymentId,
            file_url: urlData?.signedUrl || '',
            file_name: file.name,
            file_size: file.size,
          });
        }
      }

      toast.success(
        `${files.length} justificatif${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}`
      );
      logAuditEvent({
        action: 'created',
        entityType: 'payment_proof',
        description: `a ajouté ${files.length} justificatif(s) de paiement pour l'échéance du ${formatDate(echeanceDate)} — ${projetName}, ${trancheName}`,
        metadata: { echeanceDate, projetName, trancheName, fileCount: files.length, uploadMode },
      });
      setFiles([]);
      setShowUploadSection(false);
      fetchProofs();
      onSuccess();
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProof = async (proof: ProofItem) => {
    setDeleting(true);
    try {
      const { error: dbError } = await supabase.from('payment_proofs').delete().eq('id', proof.id);

      if (dbError) {
        throw dbError;
      }

      toast.success('Justificatif supprimé');
      logAuditEvent({
        action: 'deleted',
        entityType: 'payment_proof',
        description: `a supprimé le justificatif "${proof.file_name}" — ${proof.investisseur_nom}`,
        metadata: { fileName: proof.file_name, investisseur: proof.investisseur_nom },
      });
      setConfirmDelete(null);
      fetchProofs();
      onSuccess();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const totalAmount = paidEcheances.reduce((sum, e) => sum + e.montant_coupon, 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Justificatifs de paiement</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {projetName} • {trancheName}
                </p>
                <p className="text-sm text-slate-500">
                  Échéance du {formatDate(echeanceDate)} • {paidEcheances.length} investisseur
                  {paidEcheances.length > 1 ? 's' : ''} • {formatCurrency(totalAmount)}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Upload Section Toggle */}
            {!showUploadSection && (
              <button
                onClick={() => setShowUploadSection(true)}
                className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Ajouter un justificatif
              </button>
            )}

            {/* Upload Section */}
            {showUploadSection && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-slate-900">Nouveau justificatif</h4>
                  <button
                    onClick={() => {
                      setShowUploadSection(false);
                      setFiles([]);
                      setError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Upload Mode Selection */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Ce justificatif concerne :
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setUploadMode('all')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        uploadMode === 'all'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-medium">Tous les investisseurs</span>
                    </button>
                    <button
                      onClick={() => setUploadMode('single')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        uploadMode === 'single'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span className="font-medium">Un investisseur</span>
                    </button>
                  </div>
                </div>

                {/* Investor Selection (for single mode) */}
                {uploadMode === 'single' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sélectionner l'investisseur
                    </label>
                    <select
                      value={selectedInvestorPaymentId}
                      onChange={e => setSelectedInvestorPaymentId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choisir un investisseur...</option>
                      {paidEcheances.map(echeance => (
                        <option key={echeance.paiement_id} value={echeance.paiement_id}>
                          {echeance.investisseur_nom} - {formatCurrency(echeance.montant_coupon)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* File Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  onDragEnter={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDragLeave={e => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                >
                  <Upload
                    className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
                  />
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="proof-upload"
                    multiple
                    accept="image/*,.pdf"
                  />
                  <label
                    htmlFor="proof-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Choisir des fichiers
                  </label>
                  <p className="text-sm text-slate-500 mt-1">ou glissez-déposez</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG (max 10MB)</p>
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200"
                      >
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                        <button
                          onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0 || uploading}
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Télécharger {uploadMode === 'all' ? 'pour tous' : ''}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Existing Proofs List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-2">Chargement...</p>
              </div>
            ) : proofs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Aucun justificatif</p>
                <p className="text-sm text-slate-400 mt-1">Ajoutez un justificatif ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-slate-700 text-sm uppercase tracking-wide">
                  Justificatifs existants ({proofs.length})
                </h4>
                {proofs.map(proof => (
                  <div
                    key={proof.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    {/* Preview Thumbnail */}
                    {proof.file_url && (
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedProofForPreview(proof)}
                      >
                        <img
                          src={proof.file_url}
                          alt={proof.file_name}
                          className="w-full h-full object-cover"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{proof.file_name}</p>
                      <p className="text-sm text-slate-500">
                        {proof.investisseur_nom} •{' '}
                        {new Date(proof.validated_at || '').toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => window.open(proof.file_url, '_blank')}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ouvrir"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(proof)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Supprimer ce justificatif ?</h3>
            </div>
            <p className="text-slate-600 mb-4">{confirmDelete.file_name}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteProof(confirmDelete)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Preview */}
      {selectedProofForPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[70]"
          onClick={() => setSelectedProofForPreview(null)}
        >
          <div className="relative max-w-7xl w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white">
                <h3 className="font-semibold">{selectedProofForPreview.file_name}</h3>
                <p className="text-sm text-slate-300">{selectedProofForPreview.investisseur_nom}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProofForPreview(null)}
                  className="p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedProofForPreview.file_url}
                alt={selectedProofForPreview.file_name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
