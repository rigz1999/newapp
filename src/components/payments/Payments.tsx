import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Download,
  Search,
  Euro,
  CheckCircle2,
  Filter,
  X,
  AlertCircle,
  Trash2,
  FileDown,
  MoreVertical,
  FileText,
  XCircle,
  Upload,
  StickyNote,
} from 'lucide-react';
import { ViewProofsModal } from '../investors/ViewProofsModal';
import { PaymentProofUpload } from './PaymentProofUpload';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination, paginate } from '../common/Pagination';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { DateRangePicker } from '../filters/DateRangePicker';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { logger } from '../../utils/logger';
import { formatErrorMessage } from '../../utils/errorMessages';
import { logAuditEvent, auditFormatCurrency } from '../../utils/auditLogger';
import * as ExcelJS from 'exceljs';

interface PaymentsProps {
  organization: { id: string; name: string; role: string };
}

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  note: string | null;
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
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewingProofs, setViewingProofs] = useState<Payment | null>(null);
  const [uploadingProof, setUploadingProof] = useState<Payment | null>(null);
  const [proofs, setProofs] = useState<Record<string, unknown>[]>([]);
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

  // Bulk selection
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Single payment deletion
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Dropdown menu
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Track which payments have proofs
  const [paymentsWithProofs, setPaymentsWithProofs] = useState<Set<string>>(new Set());

  // Note popover
  const [showNotePopover, setShowNotePopover] = useState<string | null>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Close note popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.note-popover') && !target.closest('.note-icon')) {
        setShowNotePopover(null);
      }
    };
    if (showNotePopover) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNotePopover]);

  const fetchPayments = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('paiements')
        .select(
          `
          id,
          id_paiement,
          type,
          montant,
          date_paiement,
          note,
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
        `
        )
        .order('date_paiement', { ascending: false })
        .limit(500); // Optimized limit for better performance

      if (error) {
        throw error;
      }

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

      // Fetch which payments have proofs
      if (paymentsData.length > 0) {
        const paymentIds = paymentsData.map(p => p.id);
        const { data: proofsData } = await supabase
          .from('payment_proofs')
          .select('paiement_id')
          .in('paiement_id', paymentIds);

        const idsWithProofs = new Set(proofsData?.map(p => p.paiement_id) || []);
        setPaymentsWithProofs(idsWithProofs);
      }
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
    const { data } = await supabase.from('payment_proofs').select('*').eq('paiement_id', paymentId);
    return data || [];
  };

  const handleViewProofs = async (payment: Payment) => {
    const proofsData = await loadProofs(payment.id);
    setProofs(proofsData);
    setViewingProofs(payment);
  };

  const handleUploadProof = (payment: Payment) => {
    setUploadingProof(payment);
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Basic search
    if (searchTerm) {
      filtered = filtered.filter(
        p =>
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
      filtered = filtered.filter(p => {
        const paymentDate = new Date(p.date_paiement);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    // Advanced filters - Multi-select projects
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    if (projectFilter && projectFilter.values.length > 0) {
      filtered = filtered.filter(p =>
        projectFilter.values.includes(p.tranche?.projet?.projet || '')
      );
    }

    // Advanced filters - Multi-select types
    const typeFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'type');
    if (typeFilter && typeFilter.values.length > 0) {
      filtered = filtered.filter(p => typeFilter.values.includes(p.type || 'Coupon'));
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_paiement).getTime();
      const dateB = new Date(b.date_paiement).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR');

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paiements');

    // Define columns (without ID)
    worksheet.columns = [
      { header: 'Projet', key: 'projet', width: 20 },
      { header: 'Émetteur', key: 'emetteur', width: 20 },
      { header: 'Tranche', key: 'tranche', width: 20 },
      { header: 'Investisseur', key: 'investisseur', width: 25 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    // Add rows
    filteredPayments.forEach(payment => {
      worksheet.addRow({
        projet: payment.tranche?.projet?.projet || '',
        emetteur: payment.tranche?.projet?.emetteur || '',
        tranche: payment.tranche?.tranche_name || '',
        investisseur: payment.investisseur?.nom_raison_sociale || '',
        type: payment.type || 'Coupon',
        montant: payment.montant,
        date: formatDate(payment.date_paiement),
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    const currentPagePayments = paginate(filteredPayments, currentPage, itemsPerPage);
    const currentPageIds = currentPagePayments.map(p => p.id);

    if (currentPageIds.every(id => selectedPayments.has(id))) {
      // Deselect all on current page
      setSelectedPayments(prev => {
        const newSet = new Set(prev);
        currentPageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedPayments(prev => {
        const newSet = new Set(prev);
        currentPageIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const toggleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .in('id', Array.from(selectedPayments));

      if (error) {
        throw error;
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'paiement',
        entityId: Array.from(selectedPayments).join(','),
        description: `a supprimé ${selectedPayments.size} paiement(s) en masse`,
        orgId: organization.id,
        metadata: { count: selectedPayments.size },
      });

      // Refresh data
      await fetchPayments();
      setSelectedPayments(new Set());
    } catch (err) {
      console.error('Bulk delete failed:', err);
      setError('Échec de la suppression des paiements sélectionnés');
    }
  };

  const handleDeleteSinglePayment = async () => {
    if (!paymentToDelete) {
      return;
    }

    try {
      // Get payment proofs to delete storage files
      const { data: proofs } = await supabase
        .from('payment_proofs')
        .select('file_url')
        .eq('paiement_id', paymentToDelete.id);

      // Delete payment proofs from database
      await supabase.from('payment_proofs').delete().eq('paiement_id', paymentToDelete.id);

      // Delete files from storage
      if (proofs && proofs.length > 0) {
        for (const proof of proofs) {
          if (proof.file_url) {
            const urlParts = proof.file_url.split('/payment-proofs/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split('?')[0];
              await supabase.storage.from('payment-proofs').remove([filePath]);
            }
          }
        }
      }

      // Update any echeances that reference this payment
      await supabase
        .from('coupons_echeances')
        .update({
          paiement_id: null,
          statut: 'en_attente',
          date_paiement: null,
          montant_paye: null,
        })
        .eq('paiement_id', paymentToDelete.id);

      // Delete the payment
      const { error } = await supabase.from('paiements').delete().eq('id', paymentToDelete.id);

      if (error) {
        throw error;
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'paiement',
        entityId: paymentToDelete.id,
        description: `a supprimé un paiement de ${auditFormatCurrency(paymentToDelete.montant)} — ${paymentToDelete.investisseur?.nom_raison_sociale || 'investisseur inconnu'}, projet "${paymentToDelete.tranche?.projet?.projet || 'inconnu'}", tranche "${paymentToDelete.tranche?.tranche_name || 'inconnue'}"`,
        orgId: organization.id,
        metadata: {
          id_paiement: paymentToDelete.id_paiement,
          montant: paymentToDelete.montant,
          investisseur: paymentToDelete.investisseur?.nom_raison_sociale,
          projet: paymentToDelete.tranche?.projet?.projet,
        },
      });

      // Refresh data
      await fetchPayments();
      setPaymentToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Échec de la suppression du paiement');
      setPaymentToDelete(null);
    }
  };

  const exportSelectedToExcel = async () => {
    const selected = filteredPayments.filter(p => selectedPayments.has(p.id));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Paiements sélectionnés');

    // Define columns (without ID)
    worksheet.columns = [
      { header: 'Projet', key: 'projet', width: 20 },
      { header: 'Émetteur', key: 'emetteur', width: 20 },
      { header: 'Tranche', key: 'tranche', width: 20 },
      { header: 'Investisseur', key: 'investisseur', width: 25 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    // Add rows
    selected.forEach(payment => {
      worksheet.addRow({
        projet: payment.tranche?.projet?.projet || '',
        emetteur: payment.tranche?.projet?.emetteur || '',
        tranche: payment.tranche?.tranche_name || '',
        investisseur: payment.investisseur?.nom_raison_sociale || '',
        type: payment.type || 'Coupon',
        montant: payment.montant,
        date: formatDate(payment.date_paiement),
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_selection_${new Date().toISOString().split('T')[0]}.xlsx`;
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Historique des paiements
            </h1>
            <p className="text-slate-600">
              {filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-finixar-action-view text-white px-4 py-2 rounded-lg hover:bg-finixar-action-view-hover transition-colors whitespace-nowrap"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Exporter Excel</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Montant total payé</span>
            <CheckCircle2 className="w-5 h-5 text-finixar-green" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPaid)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Nombre de paiements</span>
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
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            />
          </div>

          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as SortOrder)}
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
                onStartDateChange={date =>
                  advancedFilters.setDateRange(date, advancedFilters.filters.dateRange.endDate)
                }
                onEndDateChange={date =>
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
                onAdd={value => advancedFilters.addMultiSelectFilter('projet', value)}
                onRemove={value => advancedFilters.removeMultiSelectFilter('projet', value)}
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
                onAdd={value => advancedFilters.addMultiSelectFilter('type', value)}
                onRemove={value => advancedFilters.removeMultiSelectFilter('type', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('type')}
                placeholder="Tous les types"
              />

              {/* Filter Presets */}
              <FilterPresets
                presets={advancedFilters.presets}
                onSave={name => advancedFilters.savePreset(name)}
                onLoad={id => advancedFilters.loadPreset(id)}
                onDelete={id => advancedFilters.deletePreset(id)}
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
                ? 'Aucun paiement ne correspond à vos critères'
                : 'Aucun paiement enregistré'}
            </p>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedPayments.size > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPayments.size} élément{selectedPayments.size > 1 ? 's' : ''}{' '}
                    sélectionné{selectedPayments.size > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setSelectedPayments(new Set())}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Tout désélectionner
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportSelectedToExcel}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Exporter sélection
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 md:px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          paginate(filteredPayments, currentPage, itemsPerPage).length > 0 &&
                          paginate(filteredPayments, currentPage, itemsPerPage).every(p =>
                            selectedPayments.has(p.id)
                          )
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                      Projet
                    </th>
                    <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden md:table-cell">
                      Tranche
                    </th>
                    <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden sm:table-cell">
                      Investisseur
                    </th>
                    <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                      Montant
                    </th>
                    <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-slate-900 hidden md:table-cell">
                      Date
                    </th>
                    <th className="px-2 md:px-4 py-3 text-right text-xs md:text-sm font-semibold text-slate-900"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginate(filteredPayments, currentPage, itemsPerPage).map(payment => (
                    <tr
                      key={payment.id}
                      onClick={() => navigate(`/paiements/${payment.id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-2 md:px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(payment.id)}
                          onChange={() => toggleSelectPayment(payment.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600">
                        <div>
                          <p className="font-medium text-slate-900">
                            {payment.tranche?.projet?.projet || '-'}
                          </p>
                          <p className="text-xs text-slate-500 hidden xl:block">
                            {payment.tranche?.projet?.emetteur || ''}
                          </p>
                          <p className="text-xs text-slate-500 md:hidden">
                            {payment.tranche?.tranche_name || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell">
                        {payment.tranche?.tranche_name || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden sm:table-cell">
                        {payment.investisseur?.nom_raison_sociale || '-'}
                      </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm font-semibold text-slate-900">
                        <div>
                          {formatCurrency(payment.montant)}
                          <p className="text-xs text-slate-500 md:hidden mt-0.5">
                            {formatDate(payment.date_paiement)}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell">
                        {formatDate(payment.date_paiement)}
                      </td>
                      <td className="px-2 md:px-4 py-3">
                        <div className="flex items-center justify-end gap-2 relative">
                          {paymentsWithProofs.has(payment.id) && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleViewProofs(payment);
                              }}
                              className="p-1 text-finixar-green hover:bg-green-50 rounded transition-colors"
                              title="Voir le justificatif"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {payment.note && (
                            <div className="relative">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setShowNotePopover(
                                    showNotePopover === payment.id ? null : payment.id
                                  );
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Voir la note"
                              >
                                <StickyNote className="w-4 h-4" />
                              </button>
                              {showNotePopover === payment.id && (
                                <div className="note-popover absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-slate-900">Note</h4>
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        setShowNotePopover(null);
                                      }}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {payment.note}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setOpenDropdown(openDropdown === payment.id ? null : payment.id);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openDropdown === payment.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenDropdown(null);
                                  if (paymentsWithProofs.has(payment.id)) {
                                    handleViewProofs(payment);
                                  } else {
                                    handleUploadProof(payment);
                                  }
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                {paymentsWithProofs.has(payment.id) ? (
                                  <>
                                    <FileText className="w-4 h-4 text-slate-600" />
                                    <span>Voir la preuve</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 text-green-600" />
                                    <span>Ajouter une preuve</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenDropdown(null);
                                  setPaymentToDelete(payment);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          )}
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
                onPageChange={page => setCurrentPage(page)}
                itemName="paiements"
              />
            </div>
          </>
        )}
      </div>

      {viewingProofs && (
        <ViewProofsModal
          payment={viewingProofs}
          proofs={
            proofs as unknown as {
              id: string;
              file_url: string;
              file_name: string;
              validated_at: string;
              extracted_data?: { montant: number; date?: string } | null;
              confidence?: number;
            }[]
          }
          onClose={() => setViewingProofs(null)}
          onProofDeleted={() => {
            fetchPayments();
            handleViewProofs(viewingProofs);
          }}
        />
      )}

      {uploadingProof && (
        <PaymentProofUpload
          payment={uploadingProof}
          onClose={() => setUploadingProof(null)}
          onSuccess={() => {
            fetchPayments();
            setUploadingProof(null);
          }}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Supprimer les paiements sélectionnés"
        message="Êtes-vous sûr de vouloir supprimer ces paiements ? Cette action est irréversible."
        variant="danger"
        impact={`Cette action supprimera ${selectedPayments.size} paiement${selectedPayments.size > 1 ? 's' : ''}.`}
        confirmText="Supprimer"
      />

      {/* Single Payment Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeleteSinglePayment}
        title="Supprimer le paiement"
        message={`Êtes-vous sûr de vouloir supprimer le paiement ${paymentToDelete?.id_paiement || ''} ?`}
        variant="danger"
        impact="Cette action supprimera le paiement, ses justificatifs et mettra à jour les échéances liées."
        confirmText="Supprimer"
      />
    </div>
  );
}

export default Payments;
