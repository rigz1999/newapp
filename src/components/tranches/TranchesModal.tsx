import { useState, useMemo, useEffect } from 'react';
import { X, Search, Calendar, Edit, Trash2 } from 'lucide-react';

interface TranchesModalProps {
  tranches: any[];
  subscriptions: any[];
  onClose: () => void;
  onEdit: (tranche: any) => void;
  onDelete: (tranche: any) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export function TranchesModal({
  tranches,
  subscriptions,
  onClose,
  onEdit,
  onDelete,
  formatCurrency,
  formatDate,
}: TranchesModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy] = useState<'date' | 'montant' | 'nom'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('ESC pressed in TranchesModal');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose]);

  // Enrichir les tranches avec les stats de souscriptions
  const enrichedTranches = useMemo(() => {
    return tranches.map(tranche => {
      const trancheSubscriptions = subscriptions.filter(
        s => s.tranche.tranche_name === tranche.tranche_name
      );
      const totalInvested = trancheSubscriptions.reduce((sum, s) => sum + s.montant_investi, 0);
      
      return {
        ...tranche,
        subscribersCount: trancheSubscriptions.length,
        totalInvested,
        subscriptions: trancheSubscriptions
      };
    });
  }, [tranches, subscriptions]);

  // Filtrer et trier
  const filteredTranches = useMemo(() => {
    const result = enrichedTranches.filter(tranche =>
      tranche.tranche_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.date_emission || 0).getTime() - new Date(b.date_emission || 0).getTime();
      } else if (sortBy === 'montant') {
        compareValue = a.totalInvested - b.totalInvested;
      } else if (sortBy === 'nom') {
        compareValue = a.tranche_name.localeCompare(b.tranche_name);
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [enrichedTranches, searchTerm, sortBy, sortOrder]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] m-4 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Toutes les Tranches</h2>
              <p className="text-sm text-slate-600 mt-1">
                {filteredTranches.length} tranche{filteredTranches.length > 1 ? 's' : ''}
                {filteredTranches.length !== tranches.length && ` sur ${tranches.length}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une tranche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="pb-6">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-10 py-6 pb-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Nom de la tranche
                  </th>
                  <th className="px-4 py-6 pb-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date d'émission
                  </th>
                  <th className="px-4 py-6 pb-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Date d'échéance
                  </th>
                  <th className="px-4 py-6 pb-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Taux nominal
                  </th>
                  <th className="px-4 py-6 pb-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Total investi
                  </th>
                  <th className="px-4 py-6 pb-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Souscripteurs
                  </th>
                  <th className="px-4 py-6 pb-3 pr-10 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTranches.map((tranche) => (
                  <tr key={tranche.id} className="bg-white hover:bg-slate-50">
                    <td className="px-10 py-4 text-sm font-medium text-slate-900">
                      {tranche.tranche_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(tranche.date_emission)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {tranche.date_echeance_finale ? formatDate(tranche.date_echeance_finale) : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-medium text-slate-900">
                      {tranche.taux_nominal ? `${tranche.taux_nominal}%` : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-medium text-slate-900">
                      {formatCurrency(tranche.totalInvested)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right text-slate-600">
                      {tranche.subscribersCount}
                    </td>
                    <td className="px-4 pr-10 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            onClose();
                            onEdit(tranche);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onDelete(tranche);
                          }}
                          className="p-1 text-finixar-red hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTranches.length === 0 && (
              <div className="text-center py-12 px-10">
                <p className="text-slate-400">Aucune tranche ne correspond à la recherche</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranchesModal;