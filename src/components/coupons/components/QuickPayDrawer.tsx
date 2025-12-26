import { useState } from 'react';
import { X, Upload, Calendar, AlertCircle } from 'lucide-react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../utils/toast';

interface QuickPayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onSuccess: () => void;
}

export function QuickPayDrawer({ isOpen, onClose, coupon, onSuccess }: QuickPayDrawerProps) {
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [montantPaye, setMontantPaye] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !coupon) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const montant = parseFloat(montantPaye) || coupon.montant_net;

      // Update coupon status
      const { error: couponError } = await supabase
        .from('coupons_echeances')
        .update({
          statut: 'paye',
          date_paiement: datePaiement,
          montant_paye: montant,
        })
        .eq('id', coupon.id);

      if (couponError) throw couponError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('paiements')
        .insert({
          tranche_id: coupon.tranche_id,
          investisseur_id: coupon.investisseur_id,
          montant: montant,
          date_paiement: datePaiement,
          statut: 'payé',
          type: 'coupon',
        });

      if (paymentError) throw paymentError;

      toast.success('Paiement enregistré avec succès');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Enregistrer paiement</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Coupon Info */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Détails du coupon</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Projet:</span>
                <span className="font-medium text-slate-900">{coupon.projet_nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tranche:</span>
                <span className="font-medium text-slate-900">{coupon.tranche_nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Investisseur:</span>
                <span className="font-medium text-slate-900">{coupon.investisseur_nom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date échéance:</span>
                <span className="font-medium text-slate-900">
                  {new Date(coupon.date_echeance).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600">Montant dû:</span>
                <span className="font-bold text-finixar-green text-lg">
                  {formatCurrency(coupon.montant_net)}
                </span>
              </div>
            </div>
          </div>

          {/* Warning if RIB missing */}
          {!coupon.has_rib && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">RIB manquant</p>
                <p className="text-xs text-red-700 mt-1">
                  Cet investisseur n'a pas de RIB enregistré. Assurez-vous d'avoir les informations bancaires avant de procéder au paiement.
                </p>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Montant payé (optionnel)
              </label>
              <input
                type="number"
                step="0.01"
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                placeholder={formatCurrency(coupon.montant_net)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Laissez vide pour utiliser le montant par défaut ({formatCurrency(coupon.montant_net)})
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
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
                  Enregistrement...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
