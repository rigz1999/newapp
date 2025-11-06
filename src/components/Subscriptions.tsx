import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Download, Search, Edit2, X, AlertTriangle, Eye, Trash2, Filter } from 'lucide-react';
import { AlertModal } from './Modals';
import { TableSkeleton } from './Skeleton';
import { Pagination, paginate } from './Pagination';
import { useAdvancedFilters } from '../hooks/useAdvancedFilters';
import { DateRangePicker } from './filters/DateRangePicker';
import { MultiSelectFilter } from './filters/MultiSelectFilter';
import { FilterPresets } from './filters/FilterPresets';

interface Subscription {
  id: string;
  date_souscription: string;
  nombre_obligations: number;
  montant_investi: number;
  coupon_brut: number;
  coupon_net: number;
  prochaine_date_coupon: string | null;
  tranches: {
    tranche_name: string;
    projets: {
      projet: string;
      emetteur: string;
    };
  };
  investisseurs: {
    type: string;
    nom_raison_sociale: string | null;
    representant_legal: string | null;
    email: string | null;
  };
}

interface SubscriptionsProps {
  organization: { id: string; name: string; role: string };
}

export function Subscriptions({ organization }: SubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const [editFormData, setEditFormData] = useState({
    date_souscription: '',
    nombre_obligations: 0,
    montant_investi: 0,
    coupon_brut: 0,
    coupon_net: 0,
    prochaine_date_coupon: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Advanced filtering
  const advancedFilters = useAdvancedFilters({
    persistKey: 'subscriptions-filters',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Get unique values for filters
  const uniqueProjects = Array.from(
    new Set(subscriptions.map(s => s.tranches?.projets?.projet).filter(Boolean))
  ).map(name => ({ value: name!, label: name! }));

  const uniqueTranches = Array.from(
    new Set(subscriptions.map(s => s.tranches?.tranche_name).filter(Boolean))
  ).map(name => ({ value: name!, label: name! }));

  const uniqueInvestorTypes = [
    { value: 'physique', label: 'Personne physique' },
    { value: 'morale', label: 'Personne morale' },
  ];

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchSubscriptions();
      }
    };

    loadData();

    return () => {
      isMounted = false;
      setSubscriptions([]);
    };
  }, [organization.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('souscriptions')
      .select(
        `
        *,
        tranches (
          tranche_name,
          projets (
            projet,
            emetteur
          )
        ),
        investisseurs (
          type,
          nom_raison_sociale,
          representant_legal,
          email
        )
      `
      )
      .order('date_souscription', { ascending: false });

    setSubscriptions((data as any) || []);
    setLoading(false);
  };

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditFormData({
      date_souscription: subscription.date_souscription,
      nombre_obligations: subscription.nombre_obligations,
      montant_investi: subscription.montant_investi,
      coupon_brut: subscription.coupon_brut,
      coupon_net: subscription.coupon_net,
      prochaine_date_coupon: subscription.prochaine_date_coupon || '',
    });
    setShowEditModal(true);
  };

  const handleSaveClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!editingSubscription) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          date_souscription: editFormData.date_souscription,
          nombre_obligations: editFormData.nombre_obligations,
          montant_investi: editFormData.montant_investi,
          coupon_brut: editFormData.coupon_brut,
          coupon_net: editFormData.coupon_net,
          prochaine_date_coupon: editFormData.prochaine_date_coupon || null,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      await fetchSubscriptions();
      
      setShowConfirmModal(false);
      setShowEditModal(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour',
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingSubscription(null);
  };

  const handleViewClick = (subscription: Subscription) => {
    setViewingSubscription(subscription);
    setShowViewModal(true);
  };

  const handleDeleteClick = (subscription: Subscription) => {
    setDeletingSubscription(subscription);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubscription) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('souscriptions')
        .delete()
        .eq('id', deletingSubscription.id);

      if (error) throw error;

      await fetchSubscriptions();
      
      setShowDeleteModal(false);
      setDeletingSubscription(null);
    } catch (error) {
      console.error('Error deleting subscription:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la suppression',
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      'Projet',
      'Émetteur',
      'Tranche',
      'Investisseur',
      'Type',
      'Email',
      'Date souscription',
      'Quantité',
      'Montant investi',
      'Coupon brut',
      'Coupon net',
      'Prochaine date coupon',
    ];

    const rows = filteredSubscriptions.map((sub) => [
      sub.tranches.projets.projet,
      sub.tranches.projets.emetteur,
      sub.tranches.tranche_name,
      sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '',
      sub.investisseurs.type,
      sub.investisseurs.email || '',
      formatDate(sub.date_souscription),
      sub.nombre_obligations,
      sub.montant_investi,
      sub.coupon_brut,
      sub.coupon_net,
      formatDate(sub.prochaine_date_coupon),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Apply all filters
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Basic search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        sub.tranches.projets.projet.toLowerCase().includes(term) ||
        sub.tranches.projets.emetteur.toLowerCase().includes(term) ||
        sub.tranches.tranche_name.toLowerCase().includes(term) ||
        sub.investisseurs.nom_raison_sociale?.toLowerCase().includes(term) ||
        sub.investisseurs.representant_legal?.toLowerCase().includes(term) ||
        sub.investisseurs.email?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    // Advanced filters - Date range
    if (advancedFilters.filters.dateRange.startDate && advancedFilters.filters.dateRange.endDate) {
      const startDate = new Date(advancedFilters.filters.dateRange.startDate);
      const endDate = new Date(advancedFilters.filters.dateRange.endDate);
      const subDate = new Date(sub.date_souscription);
      if (subDate < startDate || subDate > endDate) {
        return false;
      }
    }

    // Advanced filters - Multi-select projects
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    if (projectFilter && projectFilter.values.length > 0) {
      if (!projectFilter.values.includes(sub.tranches?.projets?.projet || '')) {
        return false;
      }
    }

    // Advanced filters - Multi-select tranches
    const trancheFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'tranche');
    if (trancheFilter && trancheFilter.values.length > 0) {
      if (!trancheFilter.values.includes(sub.tranches?.tranche_name || '')) {
        return false;
      }
    }

    // Advanced filters - Investor type
    const typeFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'investor_type');
    if (typeFilter && typeFilter.values.length > 0) {
      if (!typeFilter.values.includes(sub.investisseurs.type.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters = 
    advancedFilters.filters.dateRange.startDate ||
    advancedFilters.filters.dateRange.endDate ||
    advancedFilters.filters.multiSelect.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Toutes les souscriptions ({filteredSubscriptions.length})
          </h2>
          <button
            onClick={exportToCSV}
            disabled={filteredSubscriptions.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Exporter CSV</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          {/* Basic Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtres avancés
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {advancedFilters.filters.multiSelect.length + 
                    (advancedFilters.filters.dateRange.startDate ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Date Range */}
                <DateRangePicker
                  startDate={advancedFilters.filters.dateRange.startDate}
                  endDate={advancedFilters.filters.dateRange.endDate}
                  onStartDateChange={(date) =>
                    advancedFilters.setDateRange(date, advancedFilters.filters.dateRange.endDate)
                  }
                  onEndDateChange={(date) =>
                    advancedFilters.setDateRange(advancedFilters.filters.dateRange.startDate, date)
                  }
                  label="Période de souscription"
                />

                {/* Project Filter */}
                <MultiSelectFilter
                  label="Projets"
                  options={uniqueProjects}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'projet')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('projet', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('projet', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('projet')}
                  placeholder="Tous les projets"
                />

                {/* Tranche Filter */}
                <MultiSelectFilter
                  label="Tranches"
                  options={uniqueTranches}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'tranche')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('tranche', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('tranche', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('tranche')}
                  placeholder="Toutes les tranches"
                />

                {/* Investor Type Filter */}
                <MultiSelectFilter
                  label="Type d'investisseur"
                  options={uniqueInvestorTypes}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'investor_type')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('investor_type', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('investor_type', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('investor_type')}
                  placeholder="Tous les types"
                />

                {/* Filter Presets */}
                <FilterPresets
                  presets={advancedFilters.presets}
                  onSave={(name) => advancedFilters.savePreset(name)}
                  onLoad={(id) => advancedFilters.loadPreset(id)}
                  onDelete={(id) => advancedFilters.deletePreset(id)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    advancedFilters.clearAllFilters();
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Effacer tous les filtres
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={7} />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune souscription</h3>
            <p className="text-slate-600">
              {searchTerm || hasActiveFilters ? 'Aucun résultat pour cette recherche' : 'Importez des tranches pour voir les souscriptions'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Projet / Tranche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Investisseur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Coupon Net
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Prochain Coupon
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginate(filteredSubscriptions, currentPage, itemsPerPage).map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.tranches.projets.projet}
                        </div>
                        <div className="text-sm text-slate-600">{sub.tranches.tranche_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '-'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {sub.investisseurs.type.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.date_souscription)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                        {sub.nombre_obligations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                        {formatCurrency(sub.montant_investi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                        {formatCurrency(sub.coupon_net)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.prochaine_date_coupon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-700 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
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

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredSubscriptions.length / itemsPerPage)}
                totalItems={filteredSubscriptions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                itemName="souscriptions"
              />
            </div>
          </div>
        )}

        {/* ALL THE MODALS STAY THE SAME - Edit, View, Delete, Confirm, Alert */}
        {/* I'll keep them as is to save space - just copy from line 592 onwards from original */}
        
        {showEditModal && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier la souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {editingSubscription.tranches.projets.projet} - {editingSubscription.tranches.tranche_name}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Date de souscription
                    </label>
                    <input
                      type="date"
                      value={editFormData.date_souscription}
                      onChange={(e) => setEditFormData({ ...editFormData, date_souscription: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Nombre d'obligations
                    </label>
                    <input
                      type="number"
                      value={editFormData.nombre_obligations}
                      onChange={(e) => setEditFormData({ ...editFormData, nombre_obligations: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Montant investi (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.montant_investi}
                      onChange={(e) => setEditFormData({ ...editFormData, montant_investi: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Prochaine date de coupon
                    </label>
                    <input
                      type="date"
                      value={editFormData.prochaine_date_coupon}
                      onChange={(e) => setEditFormData({ ...editFormData, prochaine_date_coupon: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Coupon brut (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.coupon_brut}
                      onChange={(e) => setEditFormData({ ...editFormData, coupon_brut: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Coupon net (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.coupon_net}
                      onChange={(e) => setEditFormData({ ...editFormData, coupon_net: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>Investisseur:</strong> {editingSubscription.investisseurs.nom_raison_sociale || editingSubscription.investisseurs.representant_legal}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Les informations de l'investisseur ne peuvent pas être modifiées ici
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveClick}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Confirmer la modification
                    </h3>
                    <p className="text-sm text-slate-600">
                      Êtes-vous sûr de vouloir modifier cette souscription ? Cette action ne peut pas être annulée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showViewModal && viewingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Détails de la souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {viewingSubscription.tranches.projets.projet} - {viewingSubscription.tranches.tranche_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Projet</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nom du projet:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.projets.projet}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Émetteur:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.projets.emetteur}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Tranche:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.tranche_name}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Investisseur</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nom:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {viewingSubscription.investisseurs.nom_raison_sociale || viewingSubscription.investisseurs.representant_legal || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Type:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {viewingSubscription.investisseurs.type.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Email:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.investisseurs.email || '-'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Détails de la souscription</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Date de souscription:</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(viewingSubscription.date_souscription)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nombre d'obligations:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.nombre_obligations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Montant investi:</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(viewingSubscription.montant_investi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Coupon brut:</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(viewingSubscription.coupon_brut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Coupon net:</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(viewingSubscription.coupon_net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Prochaine date de coupon:</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(viewingSubscription.prochaine_date_coupon)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && deletingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Confirmer la suppression
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Êtes-vous sûr de vouloir supprimer cette souscription ?
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-slate-600">
                        <strong>Projet:</strong> {deletingSubscription.tranches.projets.projet}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Investisseur:</strong> {deletingSubscription.investisseurs.nom_raison_sociale || deletingSubscription.investisseurs.representant_legal}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Montant:</strong> {formatCurrency(deletingSubscription.montant_investi)}
                      </p>
                    </div>
                    <p className="text-sm text-red-600 mt-3 font-medium">
                      ⚠️ Cette action est irréversible
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />
    </div>
  );
}

export default Subscriptions;