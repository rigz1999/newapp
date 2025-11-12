import { useState, useMemo, useEffect } from 'react';
import { X, Search, Download, ArrowUpDown, Edit, Trash2 } from 'lucide-react';

interface SubscriptionsModalProps {
  subscriptions: any[];
  onClose: () => void;
  onEdit: (sub: any) => void;
  onDelete: (sub: any) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export function SubscriptionsModal({
  subscriptions,
  onClose,
  onEdit,
  onDelete,
  formatCurrency,
  formatDate,
}: SubscriptionsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTranche, setFilterTranche] = useState('all');
  const [filterCGP, setFilterCGP] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'montant' | 'investisseur'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('ESC pressed in SubscriptionsModal');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose]);

  // Extraire les tranches et CGP uniques
  const tranches = useMemo(() => {
    const unique = new Set(subscriptions.map(s => s.tranche.tranche_name));
    return Array.from(unique).sort();
  }, [subscriptions]);

  const cgps = useMemo(() => {
    const unique = new Set(
      subscriptions
        .map(s => s.cgp || s.investisseur.cgp)
        .filter(Boolean)
    );
    return Array.from(unique).sort();
  }, [subscriptions]);

  // Filtrer et trier
  const filteredSubs = useMemo(() => {
    const result = subscriptions.filter(sub => {
      const matchesSearch = sub.investisseur.nom_raison_sociale
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesTranche = filterTranche === 'all' || sub.tranche.tranche_name === filterTranche;
      const matchesCGP = filterCGP === 'all' || (sub.cgp || sub.investisseur.cgp) === filterCGP;
      return matchesSearch && matchesTranche && matchesCGP;
    });

    // Tri
    result.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'date') {
        compareValue = new Date(a.date_souscription).getTime() - new Date(b.date_souscription).getTime();
      } else if (sortBy === 'montant') {
        compareValue = a.montant_investi - b.montant_investi;
      } else if (sortBy === 'investisseur') {
        compareValue = a.investisseur.nom_raison_sociale.localeCompare(b.investisseur.nom_raison_sociale);
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [subscriptions, searchTerm, filterTranche, filterCGP, sortBy, sortOrder]);

  const handleExport = () => {
    const csvContent = [
      ['Investisseur', 'CGP', 'Tranche', 'Date', 'Montant', 'Nombre obligations', 'Coupon net'].join(';'),
      ...filteredSubs.map(sub => [
        sub.investisseur.nom_raison_sociale,
        sub.cgp || sub.investisseur.cgp || '-',
        sub.tranche.tranche_name,
        formatDate(sub.date_souscription),
        sub.montant_investi,
        sub.nombre_obligations,
        sub.coupon_net
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `souscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleSort = (field: 'date' | 'montant' | 'investisseur') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] m-4 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Toutes les Souscriptions</h2>
              <p className="text-sm text-slate-600 mt-1">
                {filteredSubs.length} souscription{filteredSubs.length > 1 ? 's' : ''} 
                {filteredSubs.length !== subscriptions.length && ` sur ${subscriptions.length}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filtres et recherche */}
          <div className="grid grid-cols-4 gap-3">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
              />
            </div>

            {/* Filtre Tranche */}
            <select
              value={filterTranche}
              onChange={(e) => setFilterTranche(e.target.value)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            >
              <option value="all">Toutes les tranches</option>
              {tranches.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Filtre CGP */}
            <select
              value={filterCGP}
              onChange={(e) => setFilterCGP(e.target.value)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            >
              <option value="all">Tous les CGP</option>
              {cgps.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-finixar-action-view rounded-lg hover:bg-finixar-action-view-hover transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 bg-slate-50">
          <table className="w-full bg-white rounded-lg overflow-hidden mt-6">
              <thead className="border-b border-slate-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('investisseur')}
                >
                  <div className="flex items-center gap-2">
                    Investisseur
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  CGP
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tranche
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleSort('montant')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Montant
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Obligations
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Coupon Net
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {sub.investisseur.nom_raison_sociale}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {sub.cgp || sub.investisseur.cgp || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {sub.tranche.tranche_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(sub.date_souscription)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    {formatCurrency(sub.montant_investi)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {sub.nombre_obligations}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                    {formatCurrency(sub.coupon_net)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          onClose();
                          onEdit(sub);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(sub)}
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

          {filteredSubs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">Aucune souscription ne correspond aux filtres</p>
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

export default SubscriptionsModal;