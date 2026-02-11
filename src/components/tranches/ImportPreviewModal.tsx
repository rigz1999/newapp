import {
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  DollarSign,
  ArrowLeft,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

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

interface EditedInvestor extends InvestorPreview {
  index: number;
}

interface ImportPreviewModalProps {
  previewData: PreviewData;
  onConfirm: (editedDateEmission: string | null, editedInvestors: EditedInvestor[]) => void;
  onCancel: () => void;
  onBack: () => void;
  isProcessing: boolean;
  valeurNominale?: number;
}

export function ImportPreviewModal({
  previewData,
  onConfirm,
  onCancel,
  onBack,
  isProcessing,
  valeurNominale = 100,
}: ImportPreviewModalProps): JSX.Element {
  const [editedDateEmission, setEditedDateEmission] = useState<string>(
    previewData.extracted_date_emission || ''
  );
  const [editedInvestors, setEditedInvestors] = useState<InvestorPreview[]>(
    previewData.investors_preview
  );
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());

  // Filter out deleted investors for display and calculations
  const visibleInvestors = editedInvestors.filter((_, index) => !deletedIndices.has(index));
  const displayedTotalInvestors = previewData.total_investors - deletedIndices.size;
  const displayedTotalSouscriptions = previewData.total_souscriptions - deletedIndices.size;
  const displayedTotalMontant = visibleInvestors.reduce((sum, inv) => sum + inv.montant_investi, 0);

  const handleDeleteInvestor = (index: number): void => {
    setDeletedIndices(prev => new Set([...prev, index]));
    if (editingRow === index) {
      setEditingRow(null);
    }
  };

  const handleRestoreInvestor = (index: number): void => {
    setDeletedIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleInvestorEdit = (
    index: number,
    field: keyof InvestorPreview,
    value: string | number
  ): void => {
    const updated = [...editedInvestors];
    const vn = valeurNominale || 100;
    if (field === 'montant_investi' && typeof value === 'number') {
      updated[index] = {
        ...updated[index],
        montant_investi: value,
        nombre_obligations: vn > 0 ? Math.round(value / vn) : 0,
      };
    } else if (field === 'nombre_obligations' && typeof value === 'number') {
      updated[index] = {
        ...updated[index],
        nombre_obligations: value,
        montant_investi: value * vn,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedInvestors(updated);
  };

  const exportEditedInvestors = (): EditedInvestor[] =>
    editedInvestors
      .map((inv, index) => ({ ...inv, index }))
      .filter((_, index) => !deletedIndices.has(index));

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
                  <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    value={editedDateEmission}
                    onChange={e => setEditedDateEmission(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                  />
                  {previewData.extracted_date_emission && (
                    <p className="text-xs text-green-600 mt-1">✓ Extraite automatiquement</p>
                  )}
                  {!previewData.extracted_date_emission && editedDateEmission && (
                    <p className="text-xs text-blue-600 mt-1">Modifiée manuellement</p>
                  )}
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
                      {displayedTotalInvestors}
                      {deletedIndices.size > 0 && (
                        <span className="text-sm font-normal text-slate-500 ml-1">
                          (-{deletedIndices.size})
                        </span>
                      )}
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
                      {displayedTotalSouscriptions}
                      {deletedIndices.size > 0 && (
                        <span className="text-sm font-normal text-slate-500 ml-1">
                          (-{deletedIndices.size})
                        </span>
                      )}
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
                      {formatCurrency(displayedTotalMontant)}
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
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {editedInvestors.map((investor, index) => {
                      const isDeleted = deletedIndices.has(index);
                      return (
                        <tr
                          key={index}
                          className={`transition-colors ${
                            isDeleted
                              ? 'bg-red-50 opacity-60'
                              : editingRow === index
                                ? 'bg-blue-50'
                                : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className={`px-5 py-3 text-sm ${isDeleted ? 'line-through' : ''}`}>
                            {editingRow === index && !isDeleted ? (
                              <input
                                type="text"
                                value={investor.nom}
                                onChange={e => handleInvestorEdit(index, 'nom', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isProcessing}
                              />
                            ) : (
                              <button
                                onClick={() => !isDeleted && setEditingRow(index)}
                                className={`text-left w-full flex items-center gap-2 ${isDeleted ? 'cursor-default' : 'hover:text-blue-600'}`}
                                disabled={isProcessing || isDeleted}
                              >
                                {!isDeleted && <Edit2 className="w-3 h-3 text-slate-400" />}
                                <span>{investor.nom}</span>
                              </button>
                            )}
                          </td>
                          <td className={`px-5 py-3 text-sm ${isDeleted ? 'line-through' : ''}`}>
                            {editingRow === index && !isDeleted ? (
                              <select
                                value={investor.type}
                                onChange={e => handleInvestorEdit(index, 'type', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isProcessing}
                              >
                                <option value="physique">Physique</option>
                                <option value="morale">Morale</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  investor.type === 'physique'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {investor.type === 'physique' ? 'Physique' : 'Morale'}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-5 py-3 text-sm text-right ${isDeleted ? 'line-through' : ''}`}
                          >
                            {editingRow === index && !isDeleted ? (
                              <input
                                type="number"
                                value={investor.montant_investi}
                                onChange={e =>
                                  handleInvestorEdit(
                                    index,
                                    'montant_investi',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                disabled={isProcessing}
                              />
                            ) : (
                              <span className="font-medium text-slate-900">
                                {formatCurrency(investor.montant_investi)}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-5 py-3 text-sm text-right ${isDeleted ? 'line-through' : ''}`}
                          >
                            {editingRow === index && !isDeleted ? (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={investor.nombre_obligations}
                                  onChange={e =>
                                    handleInvestorEdit(
                                      index,
                                      'nombre_obligations',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                  disabled={isProcessing}
                                />
                                <button
                                  onClick={() => setEditingRow(null)}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  disabled={isProcessing}
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-600">{investor.nombre_obligations}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isDeleted ? (
                              <button
                                onClick={() => handleRestoreInvestor(index)}
                                disabled={isProcessing}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                                title="Restaurer"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteInvestor(index)}
                                disabled={isProcessing}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning if date missing */}
            {!editedDateEmission && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900 mb-1">Date d'émission manquante</p>
                    <p className="text-sm text-orange-700">
                      Veuillez saisir une date d'émission. L'échéancier ne pourra pas être généré
                      sans cette information.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200 flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
              disabled={isProcessing}
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
              disabled={isProcessing}
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(editedDateEmission || null, exportEditedInvestors())}
              disabled={isProcessing || !editedDateEmission}
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
