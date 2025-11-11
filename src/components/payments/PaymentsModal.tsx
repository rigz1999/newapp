import { useEffect } from 'react';
import { X, Calendar, Coins } from 'lucide-react';

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  statut: string;
}

interface PaymentsModalProps {
  payments: Payment[];
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export function PaymentsModal({ payments, onClose, formatCurrency, formatDate }: PaymentsModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const stats = {
    total: payments.length,
    payes: payments.filter(p => p.statut === 'Payé' || p.statut === 'payé').length,
    enAttente: payments.filter(p => p.statut !== 'Payé' && p.statut !== 'payé').length,
    montantTotal: payments.reduce((sum, p) => sum + p.montant, 0),
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] m-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Historique des Paiements</h3>
              <p className="text-sm text-slate-600 mt-1">Tous les paiements du projet</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-blue-900">Total Paiements</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-finixar-green" />
                <p className="text-xs font-medium text-green-900">Payés</p>
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.payes}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-900">Montant Total</p>
              </div>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(stats.montantTotal)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      payment.statut === 'Payé' || payment.statut === 'payé' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {payment.type || 'Paiement'} - {payment.id_paiement}
                      </p>
                      <p className="text-xs text-slate-600">{formatDate(payment.date_paiement)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.montant)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.statut === 'Payé' || payment.statut === 'payé'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {payment.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600">
              {payments.length} paiement(s) • Montant total: {formatCurrency(stats.montantTotal)}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}