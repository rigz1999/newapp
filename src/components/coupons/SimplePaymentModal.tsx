import { useState, useRef } from 'react';
import { X, CreditCard, Upload, Loader2, CheckCircle, User, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import { triggerCacheInvalidation } from '../../utils/cacheManager';

interface SimplePaymentModalProps {
  echeanceId: string;
  investisseurNom: string;
  investisseurType: string;
  montant: number;
  dateEcheance: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SimplePaymentModal({
  echeanceId,
  investisseurNom,
  investisseurType,
  montant,
  dateEcheance,
  onClose,
  onSuccess,
}: SimplePaymentModalProps) {
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async () => {
    setProcessing(true);
    try {
      // Get org_id from the echeance
      const { data: echeanceData, error: echeanceError } = await supabase
        .from('coupons_echeances')
        .select('souscription_id, montant_coupon, souscription:souscriptions(tranche_id, org_id)')
        .eq('id', echeanceId)
        .single();

      if (echeanceError || !echeanceData) {
        throw new Error('Échéance introuvable');
      }

      const orgId = (echeanceData.souscription as Record<string, unknown> | null)?.org_id;
      const trancheId = (echeanceData.souscription as Record<string, unknown> | null)?.tranche_id;

      if (!orgId) {
        throw new Error('Organisation introuvable');
      }

      // Create paiement record
      const { data: paiement, error: paiementError } = await supabase
        .from('paiements')
        .insert({
          date_paiement: datePaiement,
          montant: echeanceData.montant_coupon,
          statut: 'payé',
          type: 'coupon',
          tranche_id: trancheId,
          org_id: orgId,
        })
        .select()
        .single();

      if (paiementError || !paiement) {
        throw new Error('Erreur lors de la création du paiement');
      }

      // Update echeance with payment info
      const { error: updateError } = await supabase
        .from('coupons_echeances')
        .update({
          paiement_id: paiement.id,
          statut: 'paye',
          date_paiement: datePaiement,
          montant_paye: echeanceData.montant_coupon,
        })
        .eq('id', echeanceId);

      if (updateError) {
        throw new Error("Erreur lors de la mise à jour de l'échéance");
      }

      // Upload proof if provided
      if (proofFile) {
        const fileName = `${Date.now()}_${proofFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);

          if (urlData?.publicUrl) {
            await supabase.from('payment_proofs').insert({
              paiement_id: paiement.id,
              file_url: urlData.publicUrl,
              file_name: proofFile.name,
              uploaded_at: new Date().toISOString(),
            });
          }
        }
      }

      await triggerCacheInvalidation(['coupons', 'echeances', 'payments']);
      toast.success('Paiement enregistré avec succès');
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Enregistrer le paiement</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Investor Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  investisseurType === 'Moral' ? 'bg-purple-100' : 'bg-blue-100'
                }`}
              >
                {investisseurType === 'Moral' ? (
                  <Building2 className="w-6 h-6 text-purple-600" />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{investisseurNom}</p>
                <p className="text-sm text-slate-500">Échéance du {formatDate(dateEcheance)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Montant à payer</span>
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(montant)}</span>
              </div>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date du paiement
            </label>
            <input
              type="date"
              value={datePaiement}
              onChange={e => setDatePaiement(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Proof Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Justificatif (optionnel)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {proofFile ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="flex-1 text-sm text-emerald-700 truncate">{proofFile.name}</span>
                <button
                  onClick={() => setProofFile(null)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
              >
                <Upload className="w-5 h-5" />
                <span>Ajouter un justificatif</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2.5 text-slate-700 font-medium hover:bg-slate-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmer le paiement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
