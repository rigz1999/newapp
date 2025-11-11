import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Download, Search, Edit2, X, AlertTriangle, Eye, Trash2, Filter, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { AlertModal } from '../common/Modals';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination, paginate } from '../common/Pagination';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { DateRangePicker } from '../filters/DateRangePicker';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';

interface Subscription {
  id: string;
  date_souscription: string;
  nombre_obligations: number;
  montant_investi: number;
  coupon_brut: number;
  coupon_net: number;
  prochaine_date_coupon: string | null;
  cgp: string | null;
  email_cgp: string | null;
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
    cgp: string | null;
    email_cgp: string | null;
  };
}

interface SubscriptionsProps {
  organization: { id: string; name: string; role: string };
}

export function Subscriptions({ organization }: SubscriptionsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced filters
  const advancedFilters = useAdvancedFilters({
    persistKey: 'subscriptions-filters',
  });

  // Clear invalid tranche selections when project filter changes
  useEffect(() => {
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    const trancheFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'tranche');

    if (projectFilter && projectFilter.values.length > 0 && trancheFilter && trancheFilter.values.length > 0) {
      // Get valid tranches for selected projects
      const validTranches = Array.from(
        new Set(
          subscriptions
            .filter(s => projectFilter.values.includes(s.tranches?.projets?.projet || ''))
            .map(s => s.tranches?.tranche_name)
            .filter(Boolean)
        )
      );

      // Remove tranche selections that are no longer valid
      trancheFilter.values.forEach(selectedTranche => {
        if (!validTranches.includes(selectedTranche)) {
          advancedFilters.removeMultiSelectFilter('tranche', selectedTranche);
        }
      });
    }
  }, [advancedFilters.filters.multiSelect, subscriptions]);

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

  // Open view modal if ID is in URL params (from search)
  useEffect(() => {
    const subscriptionId = searchParams.get('id');
    if (subscriptionId && subscriptions.length > 0) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (subscription) {
        setViewingSubscription(subscription);
        setShowViewModal(true);
        // Remove the ID from URL to avoid reopening on refresh
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, subscriptions]);

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
          email,
          cgp,
          email_cgp
        )
      `
      )
      .order('date_souscription', { ascending: false })
      .limit(2000); // Safety limit to prevent loading too much data

    setSubscriptions((data || []) as Subscription[]);
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
          prochaine_date_coupon: editFormData.prochaine_date_coupon || null,
        } as never)
        .eq('id', editingSubscription.id);

      if (error) throw error;

      // Refresh data
      await fetchSubscriptions();
      
      // Close modals
      setShowConfirmModal(false);
      setShowEditModal(false);
      setEditingSubscription(null);
    } catch {
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

      // Refresh data
      await fetchSubscriptions();
      
      // Close modal
      setShowDeleteModal(false);
      setDeletingSubscription(null);
    } catch {
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
      'CGP',
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
      sub.cgp || sub.investisseurs.cgp || '',
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

  // Extract unique values for multi-select filters
  const uniqueProjects = useMemo(() =>
    Array.from(
      new Set(subscriptions.map(s => s.tranches?.projets?.projet).filter(Boolean))
    ).map(name => ({ value: name!, label: name! })),
    [subscriptions]
  );

  // Cascading filter: Only show tranches from selected projects
  const uniqueTranches = useMemo(() => {
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    const selectedProjects = projectFilter?.values || [];

    return Array.from(
      new Set(
        subscriptions
          .filter(s => {
            // If no projects selected, show all tranches
            if (selectedProjects.length === 0) return true;
            // Otherwise, only show tranches from selected projects
            return selectedProjects.includes(s.tranches?.projets?.projet || '');
          })
          .map(s => s.tranches?.tranche_name)
          .filter(Boolean)
      )
    ).map(name => ({ value: name!, label: name! }));
  }, [subscriptions, advancedFilters.filters.multiSelect]);

  const uniqueInvestorTypes = useMemo(() =>
    Array.from(
      new Set(subscriptions.map(s => s.investisseurs?.type).filter(Boolean))
    ).map(type => ({
      value: type!,
      label: type!.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'
    })),
    [subscriptions]
  );

  // Count active filters
  const activeFiltersCount = [
    advancedFilters.filters.search ? 1 : 0,
    advancedFilters.filters.dateRange.startDate || advancedFilters.filters.dateRange.endDate ? 1 : 0,
    ...advancedFilters.filters.multiSelect.map(f => f.values.length > 0 ? 1 : 0)
  ].reduce((a, b) => a + b, 0);

  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Search filter
    if (advancedFilters.filters.search) {
      const term = advancedFilters.filters.search.toLowerCase();
      const matchesSearch = (
        sub.tranches?.projets?.projet?.toLowerCase().includes(term) ||
        sub.tranches?.projets?.emetteur?.toLowerCase().includes(term) ||
        sub.tranches?.tranche_name?.toLowerCase().includes(term) ||
        sub.investisseurs?.nom_raison_sociale?.toLowerCase().includes(term) ||
        sub.investisseurs?.representant_legal?.toLowerCase().includes(term) ||
        sub.investisseurs?.email?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (advancedFilters.filters.dateRange.startDate && advancedFilters.filters.dateRange.endDate) {
      const startDate = new Date(advancedFilters.filters.dateRange.startDate);
      const endDate = new Date(advancedFilters.filters.dateRange.endDate);
      const subDate = new Date(sub.date_souscription);
      if (subDate < startDate || subDate > endDate) {
        return false;
      }
    }

    // Multi-select project filter
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    if (projectFilter && projectFilter.values.length > 0) {
      if (!projectFilter.values.includes(sub.tranches?.projets?.projet || '')) {
        return false;
      }
    }

    // Multi-select tranche filter
    const trancheFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'tranche');
    if (trancheFilter && trancheFilter.values.length > 0) {
      if (!trancheFilter.values.includes(sub.tranches?.tranche_name || '')) {
        return false;
      }
    }

    // Multi-select investor type filter
    const investorTypeFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'investorType');
    if (investorTypeFilter && investorTypeFilter.values.length > 0) {
      if (!investorTypeFilter.values.includes(sub.investisseurs?.type || '')) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Toutes les souscriptions</h1>
              <p className="text-slate-600">{filteredSubscriptions.length} souscription{filteredSubscriptions.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            disabled={filteredSubscriptions.length === 0}
            className="flex items-center gap-2 bg-finixar-action-view text-white px-4 py-2 rounded-lg hover:bg-finixar-action-view-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Exporter CSV</span>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          {/* Basic Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par projet, tranche, investisseur..."
                value={advancedFilters.filters.search}
                onChange={(e) => advancedFilters.setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
              />
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filtres avancés</span>
              {activeFiltersCount > 0 && (
                <span className="bg-finixar-brand-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-slate-200 pt-6 space-y-4">
              {/* Filter Presets */}
              <FilterPresets
                presets={advancedFilters.presets}
                onSave={(name) => advancedFilters.savePreset(name)}
                onLoad={(id) => advancedFilters.loadPreset(id)}
                onDelete={(id) => advancedFilters.deletePreset(id)}
              />

              {/* Date Range Filter */}
              <DateRangePicker
                label="Période de souscription"
                startDate={advancedFilters.filters.dateRange.startDate}
                endDate={advancedFilters.filters.dateRange.endDate}
                onStartDateChange={(date) =>
                  advancedFilters.setDateRange(date, advancedFilters.filters.dateRange.endDate)
                }
                onEndDateChange={(date) =>
                  advancedFilters.setDateRange(advancedFilters.filters.dateRange.startDate, date)
                }
              />

              {/* Multi-select Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MultiSelectFilter
                  label="Projets"
                  options={uniqueProjects}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'projet')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('projet', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('projet', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('projet')}
                  placeholder="Sélectionner des projets..."
                />

                <MultiSelectFilter
                  label="Tranches"
                  options={uniqueTranches}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'tranche')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('tranche', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('tranche', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('tranche')}
                  placeholder="Sélectionner des tranches..."
                />

                <MultiSelectFilter
                  label="Type d'investisseur"
                  options={uniqueInvestorTypes}
                  selectedValues={
                    advancedFilters.filters.multiSelect.find(f => f.field === 'investorType')?.values || []
                  }
                  onAdd={(value) => advancedFilters.addMultiSelectFilter('investorType', value)}
                  onRemove={(value) => advancedFilters.removeMultiSelectFilter('investorType', value)}
                  onClear={() => advancedFilters.clearMultiSelectFilter('investorType')}
                  placeholder="Sélectionner des types..."
                />
              </div>

              {/* Clear All Filters */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => advancedFilters.clearAllFilters()}
                    className="text-sm text-slate-600 hover:text-slate-900 underline"
                  >
                    Effacer tous les filtres
                  </button>
                </div>
              )}
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
              {advancedFilters.filters.search ? 'Aucun résultat pour cette recherche' : 'Importez des tranches pour voir les souscriptions'}
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
                      CGP
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
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sub.cgp || sub.investisseurs.cgp || '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-finixar-green">
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
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-finixar-red hover:text-red-700 transition-colors"
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

        {/* Edit Modal */}
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
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
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
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
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-1">Calculé automatiquement</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Coupon net (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.coupon_net}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 mt-1">Calculé automatiquement</p>
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
                  className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
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
                  className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* View Modal */}
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
                {/* Project Info */}
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

                {/* Investor Info */}
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
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">CGP:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.cgp || viewingSubscription.investisseurs.cgp || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
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
                      <span className="text-sm font-medium text-finixar-green">{formatCurrency(viewingSubscription.coupon_net)}</span>
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

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-finixar-red" />
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
                    <p className="text-sm text-finixar-red mt-3 font-medium">
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
                  className="flex-1 px-4 py-2 bg-finixar-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Alert Modal */}
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