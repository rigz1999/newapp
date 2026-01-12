import { X, CheckCircle, AlertCircle, Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';

interface InvestorPreview {
  nom: string;
  type: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface PreviewData {
  extracted_date_emission: string | null;
  tranche_name: string;
  taux_nominal: number;
  periodicite_coupons: string;
  duree_mois: number;
  investors_preview: InvestorPreview[];
  total_investors: number;
  total_souscriptions: number;
  total_montant: number;
  has_more: boolean;
}

interface ImportPreviewModalProps {
  previewData: PreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function ImportPreviewModal({
  previewData,
  onConfirm,
  onCancel,
  isProcessing,
}: ImportPreviewModalProps): JSX.Element {
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) {
      return 'Non définie';
    }
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Aperçu de l'import</h3>
                <p className="text-blue-100 text-sm">
                  Vérifiez les données avant de confirmer l'import
                </p>
              </div>
              <button
                onClick={onCancel}
                className="text-white hover:text-blue-200 transition-colors"
                disabled={isProcessing}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            {/* Tranche Parameters */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Paramètres de la tranche
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Nom de la tranche</p>
                  <p className="font-semibold text-slate-900">{previewData.tranche_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date d'émission
                  </p>
                  <p
                    className={`font-semibold ${
                      previewData.extracted_date_emission ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {formatDate(previewData.extracted_date_emission)}
                  </p>
                  {previewData.extracted_date_emission && (
                    <p className="text-xs text-green-600 mt-1">✓ Extraite du CSV</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Taux nominal
                  </p>
                  <p className="font-semibold text-slate-900">{previewData.taux_nominal}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Périodicité</p>
                  <p className="font-semibold text-slate-900 capitalize">
                    {previewData.periodicite_coupons}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Durée</p>
                  <p className="font-semibold text-slate-900">{previewData.duree_mois} mois</p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Investisseurs</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {previewData.total_investors}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Souscriptions</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {previewData.total_souscriptions}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Montant total</p>
                    <p className="text-xl font-bold text-slate-900">
                      {formatCurrency(previewData.total_montant)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Investors Preview */}
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-5 border-b border-slate-200">
                <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  Aperçu des investisseurs
                  {previewData.has_more && (
                    <span className="text-sm font-normal text-slate-600">
                      (20 premiers sur {previewData.total_souscriptions})
                    </span>
                  )}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Titres
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.investors_preview.map((investor, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-900">{investor.nom}</td>
                        <td className="px-5 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              investor.type === 'physique'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {investor.type === 'physique' ? 'Physique' : 'Morale'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-medium text-slate-900">
                          {formatCurrency(investor.montant_investi)}
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-slate-600">
                          {investor.nombre_obligations}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning if date missing */}
            {!previewData.extracted_date_emission && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 mb-1">
                      Date d'émission non trouvée
                    </p>
                    <p className="text-sm text-orange-700">
                      La colonne "Date de Transfert" est manquante ou vide dans le fichier CSV.
                      L'échéancier ne pourra pas être généré automatiquement.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
              disabled={isProcessing}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmer l'import
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
