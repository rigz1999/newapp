import { useState, useEffect } from 'react';
import { X, Upload, Calendar, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';

interface QuickPaymentModalProps {
  echeance?: {
    id: string;
    date_echeance: string;
    souscription: {
      coupon_net: number;
      coupon_brut: number;
      investisseur: {
        nom_raison_sociale: string;
      };
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickPaymentModal({ echeance, onClose, onSuccess }: QuickPaymentModalProps) {
  // Selection state (when echeance not provided)
  const [projects, setProjects] = useState<any[]>([]);
  const [tranches, setTranches] = useState<any[]>([]);
  const [echeances, setEcheances] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTrancheId, setSelectedTrancheId] = useState('');
  const [selectedEcheance, setSelectedEcheance] = useState<any>(echeance || null);
  const [loading, setLoading] = useState(false);

  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [montantPaye, setMontantPaye] = useState(echeance?.souscription.coupon_net.toString() || '');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Load projects when modal opens (if no echeance provided)
  useEffect(() => {
    if (!echeance) {
      loadProjects();
    }
  }, [echeance]);

  // Load tranches when project selected
  useEffect(() => {
    if (selectedProjectId) {
      loadTranches(selectedProjectId);
    } else {
      setTranches([]);
      setSelectedTrancheId('');
    }
  }, [selectedProjectId]);

  // Load echeances when tranche selected
  useEffect(() => {
    if (selectedTrancheId) {
      loadEcheances(selectedTrancheId);
    } else {
      setEcheances([]);
    }
  }, [selectedTrancheId]);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projets')
      .select('id, projet')
      .order('projet');

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const loadTranches = async (projectId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tranches')
      .select('id, tranche_name')
      .eq('projet_id', projectId)
      .order('tranche_name');

    if (!error && data) {
      setTranches(data);
    }
    setLoading(false);
  };

  const loadEcheances = async (trancheId: string) => {
    setLoading(true);

    // First get souscriptions for this tranche
    const { data: souscriptions } = await supabase
      .from('souscriptions')
      .select('id')
      .eq('tranche_id', trancheId);

    if (souscriptions && souscriptions.length > 0) {
      const souscriptionIds = souscriptions.map(s => s.id);

      const { data, error } = await supabase
        .from('coupons_echeances')
        .select(`
          id,
          date_echeance,
          montant_coupon,
          statut,
          souscription_id,
          souscriptions!inner(
            coupon_net,
            coupon_brut,
            investisseurs!inner(nom_raison_sociale)
          )
        `)
        .in('souscription_id', souscriptionIds)
        .neq('statut', 'paye')
        .order('date_echeance');

      if (!error && data) {
        // Transform the data to match our interface
        const transformedData = data.map(e => ({
          ...e,
          souscription: {
            coupon_net: e.souscriptions.coupon_net,
            coupon_brut: e.souscriptions.coupon_brut,
            investisseur: {
              nom_raison_sociale: e.souscriptions.investisseurs.nom_raison_sociale
            }
          }
        }));
        setEcheances(transformedData);
      }
    }

    setLoading(false);
  };

  const handleEcheanceSelect = (echeanceId: string) => {
    const found = echeances.find(e => e.id === echeanceId);
    if (found) {
      setSelectedEcheance(found);
      setMontantPaye(found.souscription.coupon_net.toString());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Le fichier est trop volumineux (max 5MB)');
        return;
      }
      setProofFile(file);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!datePaiement || !montantPaye) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const montant = parseFloat(montantPaye);
    if (isNaN(montant) || montant <= 0) {
      setError('Le montant doit être un nombre positif');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment record
      const { data: paiement, error: paiementError } = await supabase
        .from('paiements')
        .insert({
          type: 'Coupon',
          montant: montant,
          date_paiement: datePaiement,
          note: note || null,
          manual_entry: true, // Flag to indicate this was manually entered
        })
        .select()
        .single();

      if (paiementError) throw paiementError;

      // Upload proof if provided
      if (proofFile && paiement) {
        const fileName = `${Date.now()}_${proofFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) {
          console.error('Error uploading proof:', uploadError);
          // Don't fail the payment if proof upload fails
          toast.warning('Paiement enregistré mais la preuve n\'a pas pu être téléchargée');
        } else {
          // Link proof to payment
          const { error: proofError } = await supabase
            .from('payment_proofs')
            .insert({
              paiement_id: paiement.id,
              file_path: fileName,
              file_name: proofFile.name,
              validated_at: new Date().toISOString(),
            });

          if (proofError) {
            console.error('Error linking proof:', proofError);
          }
        }
      }

      // Update echeance with payment (if echeance selected)
      if (selectedEcheance) {
        const { error: echeanceError } = await supabase
          .from('coupons_echeances')
          .update({
            paiement_id: paiement.id,
            statut: 'paye',
            date_paiement: datePaiement,
            montant_paye: montant,
          } as never)
          .eq('id', selectedEcheance.id);

        if (echeanceError) throw echeanceError;
      }

      toast.success(
        proofFile
          ? 'Paiement enregistré avec preuve'
          : 'Paiement enregistré (preuve manquante)'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Enregistrer un paiement</h3>
            {selectedEcheance && (
              <p className="text-sm text-slate-600 mt-1">
                {selectedEcheance.souscription?.investisseur?.nom_raison_sociale}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Selection UI (when no echeance selected) */}
          {!selectedEcheance && (
            <>
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Projet
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Sélectionnez un projet</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projet}</option>
                  ))}
                </select>
              </div>

              {/* Tranche Selection */}
              {selectedProjectId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tranche
                  </label>
                  <select
                    value={selectedTrancheId}
                    onChange={(e) => setSelectedTrancheId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Sélectionnez une tranche</option>
                    {tranches.map(t => (
                      <option key={t.id} value={t.id}>{t.tranche_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Echeance Selection */}
              {selectedTrancheId && echeances.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Échéance
                  </label>
                  <select
                    onChange={(e) => handleEcheanceSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Sélectionnez une échéance</option>
                    {echeances.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.souscription?.investisseur?.nom_raison_sociale} - {new Date(e.date_echeance).toLocaleDateString('fr-FR')} - {formatCurrency(e.souscription?.coupon_net || 0)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTrancheId && echeances.length === 0 && !loading && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <p className="text-sm text-slate-600">Aucune échéance impayée trouvée pour cette tranche</p>
                </div>
              )}
            </>
          )}

          {/* Payment Form (when echeance selected) */}
          {selectedEcheance && (
            <>
              {/* Amount Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900 font-medium">Montant attendu</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedEcheance.souscription?.coupon_net || 0)}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Brut: {formatCurrency(selectedEcheance.souscription?.coupon_brut || 0)}
                    </p>
                  </div>
                </div>
              </div>

          {/* Date Paiement */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Date de paiement</span>
                <span className="text-red-600">*</span>
              </div>
            </label>
            <input
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Montant Payé */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Montant payé</span>
                <span className="text-red-600">*</span>
              </div>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                EUR
              </span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Note (optionnel)</span>
              </div>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Informations complémentaires..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Proof Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Preuve de paiement (optionnel)</span>
              </div>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                {proofFile ? (
                  <div className="text-center">
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg mb-2">
                      {proofFile.name}
                    </div>
                    <p className="text-sm text-slate-600">
                      {(proofFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setProofFile(null);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 mt-2"
                    >
                      Retirer le fichier
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      Cliquez pour ajouter une preuve
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF ou image (max 5MB)
                    </p>
                  </>
                )}
              </label>
            </div>
            {!proofFile && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800">
                  Sans preuve, le paiement sera marqué comme "Preuve manquante". Vous pourrez l'ajouter plus tard.
                </p>
              </div>
            )}
          </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !selectedEcheance}
            className="px-4 py-2 text-sm font-medium text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer le paiement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
