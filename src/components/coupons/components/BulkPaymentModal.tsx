import { useState } from 'react';
import { X, Upload, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../utils/toast';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: Coupon[];
  onSuccess: () => void;
}

export function BulkPaymentModal({ isOpen, onClose, coupons, onSuccess }: BulkPaymentModalProps) {
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  if (!isOpen || coupons.length === 0) return null;

  const totalAmount = coupons.reduce((sum, c) => sum + c.montant_net, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProcessedCount(0);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < coupons.length; i++) {
        const coupon = coupons[i];

        try {
          // Update coupon status
          const { error: couponError } = await supabase
            .from('coupons_echeances')
            .update({
              statut: 'paye',
              date_paiement: datePaiement,
              montant_paye: coupon.montant_net,
            })
            .eq('id', coupon.id);

          if (couponError) throw couponError;

          // Create payment record
          const { error: paymentError } = await supabase
            .from('paiements')
            .insert({
              tranche_id: coupon.tranche_id,
              investisseur_id: coupon.investisseur_id,
              montant: coupon.montant_net,
              date_paiement: datePaiement,
              statut: 'payé',
              type: 'coupon',
            });

          if (paymentError) throw paymentError;

          successCount++;
        } catch (error) {
          console.error(`Error processing coupon ${coupon.id}:`, error);
          errorCount++;
        }

        setProcessedCount(i + 1);
      }

      if (errorCount === 0) {
        toast.success(`${successCount} paiement${successCount > 1 ? 's enregistrés' : ' enregistré'} avec succès`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} paiements réussis, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`);
      } else {
        toast.error('Échec de l\'enregistrement des paiements');
      }

      if (successCount > 0) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error in bulk payment:', error);
      toast.error('Erreur lors de l\'enregistrement des paiements');
    } finally {
      setLoading(false);
      setProcessedCount(0);
    }
  };

  const missingRibCount = coupons.filter(c => !c.has_rib).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Paiement groupé ({coupons.length} coupon{coupons.length > 1 ? 's' : ''})
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Résumé</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Nombre de coupons:</span>
                <span className="font-bold text-blue-900">{coupons.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Montant total:</span>
                <span className="font-bold text-blue-900 text-lg">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Projets uniques:</span>
                <span className="font-bold text-blue-900">
                  {new Set(coupons.map(c => c.projet_id)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Investisseurs uniques:</span>
                <span className="font-bold text-blue-900">
                  {new Set(coupons.map(c => c.investisseur_id)).size}
                </span>
              </div>
            </div>
          </div>

          {/* Warning if RIBs missing */}
          {missingRibCount > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">RIB manquants</p>
                <p className="text-xs text-red-700 mt-1">
                  {missingRibCount} investisseur{missingRibCount > 1 ? 's n\'ont' : ' n\'a'} pas de RIB enregistré.
                  Assurez-vous d'avoir toutes les informations bancaires nécessaires.
                </p>
              </div>
            </div>
          )}

          {/* Coupons List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Coupons à payer</h3>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Projet</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Investisseur</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{coupon.projet_nom}</div>
                        <div className="text-xs text-slate-500">{coupon.tranche_nom}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-slate-900">{coupon.investisseur_nom}</div>
                        {!coupon.has_rib && (
                          <div className="text-xs text-red-600">⚠️ RIB manquant</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-finixar-green">
                        {formatCurrency(coupon.montant_net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date de paiement *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </form>

          {/* Progress indicator */}
          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Traitement en cours...
                </span>
                <span className="text-sm text-slate-600">
                  {processedCount} / {coupons.length}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(processedCount / coupons.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Enregistrer {coupons.length} paiement{coupons.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
