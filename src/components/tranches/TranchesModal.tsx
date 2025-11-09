import { useState, useMemo } from 'react';
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
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finxar-cta"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="space-y-4">
            {filteredTranches.map((tranche) => (
              <div
                key={tranche.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{tranche.tranche_name}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Émission : {formatDate(tranche.date_emission)}
                      </span>
                      {tranche.date_echeance_finale && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Échéance : {formatDate(tranche.date_echeance_finale)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onEdit(tranche);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onDelete(tranche);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Taux nominal</p>
                    <p className="text-sm font-bold text-slate-900">
                      {tranche.taux_nominal ? `${tranche.taux_nominal}%` : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Total investi</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(tranche.totalInvested)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">Souscripteurs</p>
                    <p className="text-sm font-bold text-slate-900">
                      {tranche.subscribersCount}
                    </p>
                  </div>
                </div>

                {/* Liste des souscripteurs */}
                {tranche.subscriptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-600 mb-2">Souscripteurs :</p>
                    <div className="flex flex-wrap gap-2">
                      {tranche.subscriptions.map((sub: any) => (
                        <span
                          key={sub.id}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          {sub.investisseur.nom_raison_sociale} • {formatCurrency(sub.montant_investi)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredTranches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucune tranche ne correspond à la recherche</p>
            </div>
          )}
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