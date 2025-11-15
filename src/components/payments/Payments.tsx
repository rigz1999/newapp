import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Download, Search, Euro, CheckCircle2, Eye, Filter, X, AlertCircle } from 'lucide-react';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination, paginate } from '../common/Pagination';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { DateRangePicker } from '../filters/DateRangePicker';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';
import { logger } from '../../utils/logger';
import { formatErrorMessage } from '../../utils/errorMessages';

interface PaymentsProps {
  organization: { id: string; name: string; role: string };
}

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  tranche: {
    tranche_name: string;
    projet: {
      projet: string;
      emetteur: string;
    };
  };
  investisseur: {
    nom_raison_sociale: string;
  } | null;
}

type SortOrder = 'desc' | 'asc';

export function Payments({ organization }: PaymentsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewingProofs, setViewingProofs] = useState<Payment | null>(null);
  const [proofs, setProofs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalLate: 0,
    paymentsCount: 0,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Advanced filtering
  const advancedFilters = useAdvancedFilters({
    persistKey: 'payments-filters',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Get unique values for filters
  const uniqueProjects = Array.from(
    new Set(payments.map(p => p.tranche?.projet?.projet).filter(Boolean))
  ).map(name => ({ value: name!, label: name! }));

  const uniqueTypes = Array.from(
    new Set(payments.map(p => p.type || 'Coupon').filter(Boolean))
  ).map(type => ({ value: type, label: type }));

  useEffect(() => {
    fetchPayments();
  }, [organization.id]);

  // Open proofs modal if ID is in URL params (from search)
  useEffect(() => {
    const paymentId = searchParams.get('id');
    if (paymentId && payments.length > 0) {
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        handleViewProofs(payment);
        // Remove the ID from URL to avoid reopening on refresh
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, payments]);

  useEffect(() => {
    setCurrentPage(1);
    filterPayments();
  }, [
    payments,
    searchTerm,
    sortOrder,
    advancedFilters.filters.dateRange,
    advancedFilters.filters.multiSelect,
  ]);

  const fetchPayments = async () => {
    setLoading(true);

    try {

      const { data, error } = await supabase
        .from('paiements')
        .select(`
          id,
          id_paiement,
          type,
          montant,
          date_paiement,
          tranche:tranches(
            tranche_name,
            projet:projets(
              projet,
              emetteur
            )
          ),
          investisseur:investisseurs(
            nom_raison_sociale
          )
        `)
        .order('date_paiement', { ascending: false })
        .limit(500); // Optimized limit for better performance

      if (error) throw error;


      const paymentsData = (data || []) as Payment[];
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);

      const totalPaid = paymentsData.reduce((sum, p) => sum + Number(p.montant), 0);

      setStats({
        totalPaid,
        totalPending: 0,
        totalLate: 0,
        paymentsCount: paymentsData.length,
      });

    } catch (err) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      logger.error(err instanceof Error ? err : new Error(errorMessage), {
        context: 'fetchPayments',
        organizationId: organization.id,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProofs = async (paymentId: string) => {
    const { data } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('paiement_id', paymentId);
    return data || [];
  };

  const handleViewProofs = async (payment: Payment) => {
    const proofsData = await loadProofs(payment.id);
    setProofs(proofsData);
    setViewingProofs(payment);
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Basic search
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.tranche?.projet?.projet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tranche?.tranche_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.investisseur?.nom_raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id_paiement?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Advanced filters - Date range
    if (advancedFilters.filters.dateRange.startDate && advancedFilters.filters.dateRange.endDate) {
      const startDate = new Date(advancedFilters.filters.dateRange.startDate);
      const endDate = new Date(advancedFilters.filters.dateRange.endDate);
      filtered = filtered.filter((p) => {
        const paymentDate = new Date(p.date_paiement);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    // Advanced filters - Multi-select projects
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    if (projectFilter && projectFilter.values.length > 0) {
      filtered = filtered.filter((p) =>
        projectFilter.values.includes(p.tranche?.projet?.projet || '')
      );
    }

    // Advanced filters - Multi-select types
    const typeFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'type');
    if (typeFilter && typeFilter.values.length > 0) {
      filtered = filtered.filter((p) =>
        typeFilter.values.includes(p.type || 'Coupon')
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_paiement).getTime();
      const dateB = new Date(b.date_paiement).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const exportToCSV = () => {
    const headers = ['ID Paiement', 'Projet', 'Émetteur', 'Tranche', 'Investisseur', 'Type', 'Montant', 'Date'];
    const rows = filteredPayments.map((payment) => [
      payment.id_paiement,
      payment.tranche?.projet?.projet || '',
      payment.tranche?.projet?.emetteur || '',
      payment.tranche?.tranche_name || '',
      payment.investisseur?.nom_raison_sociale || '',
      payment.type || 'Coupon',
      payment.montant,
      formatDate(payment.date_paiement),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = 
    advancedFilters.filters.dateRange.startDate ||
    advancedFilters.filters.dateRange.endDate ||
    advancedFilters.filters.multiSelect.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Erreur de chargement</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchPayments();
            }}
            className="text-finixar-red hover:text-red-800 text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Euro className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Historique des Paiements</h1>
            <p className="text-slate-600">{filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-finixar-action-view text-white px-4 py-2 rounded-lg hover:bg-finixar-action-view-hover transition-colors whitespace-nowrap"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Exporter CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Montant Total Payé</span>
            <CheckCircle2 className="w-5 h-5 text-finixar-green" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPaid)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Nombre de Paiements</span>
            <Euro className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.paymentsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        {/* Basic Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par projet, tranche, investisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
          >
            <option value="desc">Plus récents</option>
            <option value="asc">Plus anciens</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-finixar-teal text-white border-blue-600'
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
                label="Période de paiement"
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

              {/* Type Filter */}
              <MultiSelectFilter
                label="Type de paiement"
                options={uniqueTypes}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'type')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('type', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('type', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('type')}
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
                className="flex items-center gap-2 px-4 py-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Effacer tous les filtres
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={8} />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <Euro className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun paiement</h3>
            <p className="text-slate-600">
              {searchTerm || hasActiveFilters
                ? "Aucun paiement ne correspond à vos critères"
                : "Aucun paiement enregistré"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden lg:table-cell">ID</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">Projet</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden md:table-cell">Tranche</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden sm:table-cell">Type</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">Montant</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden md:table-cell">Date</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredPayments, currentPage, itemsPerPage).map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm font-medium text-slate-900 hidden lg:table-cell">{payment.id_paiement}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-900">{payment.tranche?.projet?.projet || '-'}</p>
                        <p className="text-xs text-slate-500 hidden xl:block">{payment.tranche?.projet?.emetteur || ''}</p>
                        <p className="text-xs text-slate-500 md:hidden">{payment.tranche?.tranche_name || '-'}</p>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell">{payment.tranche?.tranche_name || '-'}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden sm:table-cell">{payment.type || 'Coupon'}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm font-semibold text-slate-900">
                      <div>
                        {formatCurrency(payment.montant)}
                        <p className="text-xs text-slate-500 md:hidden mt-0.5">{formatDate(payment.date_paiement)}</p>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell">{formatDate(payment.date_paiement)}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewProofs(payment)}
                          className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-medium whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Voir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredPayments.length / itemsPerPage)}
              totalItems={filteredPayments.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              itemName="paiements"
            />
          </div>
        )}
      </div>

      {viewingProofs && (
        <ViewProofsModal
          payment={viewingProofs}
          proofs={proofs}
          onClose={() => setViewingProofs(null)}
          onProofDeleted={() => {
            fetchPayments();
            handleViewProofs(viewingProofs);
          }}
        />
      )}
    </div>
  );
}

export default Payments;