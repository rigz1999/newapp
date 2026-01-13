import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCoupons, Coupon } from '../../hooks/coupons/useCoupons';
import { useCouponFilters } from '../../hooks/coupons/useCouponFilters';
import { TableView } from './views/TableView';
import { QuickPaymentModal } from './QuickPaymentModal';
import PaymentRemindersModal from './PaymentRemindersModal';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination } from '../common/Pagination';
import { ConfirmModal } from '../common/Modals';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { DateRangePicker } from '../filters/DateRangePicker';
import { TaxInfoTooltip } from '../common/TaxInfoTooltip';
import {
  Receipt,
  Search,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Bell,
} from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { toast } from '../../utils/toast';
import { supabase } from '../../lib/supabase';
import { triggerCacheInvalidation } from '../../utils/cacheManager';

interface CouponsPageNewProps {
  organization?: { id: string; name: string; role: string };
}

export function CouponsPageNew(_props: CouponsPageNewProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // View state
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const filterState = useCouponFilters();

  // Apply URL filters from dashboard alerts (deep linking)
  useEffect(() => {
    const status = searchParams.get('status');
    const tranche = searchParams.get('tranche');
    const date = searchParams.get('date');

    if (status || tranche || date) {
      // Clear existing filters first
      filterState.clearFilters();

      // Apply status filter (e.g., 'en_retard', 'en_attente')
      if (status) {
        filterState.setStatut([status]);
      }

      // Apply tranche filter
      if (tranche) {
        filterState.setTranches([tranche]);
      }

      // Apply date filter
      if (date) {
        filterState.setDateRange(date, date);
      }

      // Show filters panel
      setShowFilters(true);

      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Data fetching
  const { coupons, loading, totalCount, page, pageSize, totalPages, setPage, refresh, stats } =
    useCoupons({
      pageSize: 50,
      filters: filterState.filters,
    });

  // Selection state
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());

  // Modal state
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCouponForQuickPay, setSelectedCouponForQuickPay] = useState<Coupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Excel export state
  const [exportingExcel, setExportingExcel] = useState(false);

  // Mark as unpaid state
  const [markingUnpaid, setMarkingUnpaid] = useState<string | null>(null);

  // Bulk unmark confirmation modal
  const [showBulkUnmarkConfirm, setShowBulkUnmarkConfirm] = useState(false);
  const [bulkUnmarkData, setBulkUnmarkData] = useState<{ date: string; coupons: Coupon[] } | null>(
    null
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const handleQuickPay = (coupon: Coupon) => {
    setSelectedCouponForQuickPay(coupon);
    setShowQuickPayment(true);
  };

  const handleViewDetails = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowDetailsModal(true);
  };

  const handleToggleSelect = (couponId: string) => {
    const newSelected = new Set(selectedCoupons);
    if (newSelected.has(couponId)) {
      newSelected.delete(couponId);
    } else {
      newSelected.add(couponId);
    }
    setSelectedCoupons(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedCoupons.size === coupons.length) {
      setSelectedCoupons(new Set());
    } else {
      setSelectedCoupons(new Set(coupons.map(c => c.id)));
    }
  };

  const handleMarkAsUnpaid = async (coupon: Coupon) => {
    if (markingUnpaid) {
      return;
    }

    setMarkingUnpaid(coupon.id);
    try {
      // Get the paiement_id from the coupon's echeance
      const { data: echeanceData, error: echeanceQueryError } = await supabase
        .from('coupons_echeances')
        .select('paiement_id')
        .eq('id', coupon.id)
        .single();

      if (echeanceQueryError) {
        throw echeanceQueryError;
      }

      const paiementId = echeanceData?.paiement_id;

      if (paiementId) {
        // 1. Get all payment proofs for this payment
        const { data: proofs, error: proofsError } = await supabase
          .from('payment_proofs')
          .select('id, file_url')
          .eq('paiement_id', paiementId);

        if (proofsError) {
          throw proofsError;
        }

        // 2. For each proof, check if it's used by other payments (reference counting)
        const filesToDelete: string[] = [];

        if (proofs && proofs.length > 0) {
          for (const proof of proofs) {
            // Count how many other payment_proofs records use this file_url
            const { data: otherProofs, error: countError } = await supabase
              .from('payment_proofs')
              .select('id')
              .eq('file_url', proof.file_url)
              .neq('paiement_id', paiementId);

            if (countError) {
              throw countError;
            }

            // Only delete file if no other payments reference it
            if (!otherProofs || otherProofs.length === 0) {
              // Extract file path from URL
              const url = new URL(proof.file_url);
              const pathParts = url.pathname.split('/');
              const fileName = pathParts[pathParts.length - 1];
              filesToDelete.push(fileName);
            }
          }

          // 3. Delete payment_proofs records
          const { error: deleteProofsError } = await supabase
            .from('payment_proofs')
            .delete()
            .eq('paiement_id', paiementId);

          if (deleteProofsError) {
            throw deleteProofsError;
          }

          // 4. Delete storage files (only those not referenced by other payments)
          if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
              .from('payment-proofs')
              .remove(filesToDelete);

            if (storageError) {
              console.error('Error deleting storage files:', storageError);
              // Don't throw - continue with deletion even if storage cleanup fails
            }
          }
        }

        // 5. Delete the paiements record
        const { error: deletePaiementError } = await supabase
          .from('paiements')
          .delete()
          .eq('id', paiementId);

        if (deletePaiementError) {
          throw deletePaiementError;
        }
      }

      // 6. Update the echeance to remove payment link and reset to unpaid state
      const { error: echeanceUpdateError } = await supabase
        .from('coupons_echeances')
        .update({
          paiement_id: null,
          statut: 'en_attente',
          date_paiement: null,
          montant_paye: null,
        } as never)
        .eq('id', coupon.id);

      if (echeanceUpdateError) {
        throw echeanceUpdateError;
      }

      // Refresh the coupons list
      await refresh();

      // Invalidate dashboard cache to reflect status change
      triggerCacheInvalidation();

      toast.success(
        'Le coupon a été marqué comme non payé et tous les enregistrements associés ont été supprimés.'
      );
    } catch (err: unknown) {
      console.error('Error marking as unpaid:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error(`Erreur lors de la mise à jour: ${errorMessage}`);
    } finally {
      setMarkingUnpaid(null);
    }
  };

  const handleBulkUnmarkRequest = (date: string, paidCoupons: Coupon[]) => {
    setBulkUnmarkData({ date, coupons: paidCoupons });
    setShowBulkUnmarkConfirm(true);
  };

  const handleMarkGroupAsUnpaid = async () => {
    if (!bulkUnmarkData || markingUnpaid) {
      return;
    }

    const { coupons: paidCoupons } = bulkUnmarkData;
    setMarkingUnpaid('bulk');
    try {
      let successCount = 0;
      let failCount = 0;

      // Process each paid coupon
      for (const coupon of paidCoupons) {
        try {
          // Get the paiement_id from the coupon's echeance
          const { data: echeanceData, error: echeanceQueryError } = await supabase
            .from('coupons_echeances')
            .select('paiement_id')
            .eq('id', coupon.id)
            .single();

          if (echeanceQueryError) {
            throw echeanceQueryError;
          }

          const paiementId = echeanceData?.paiement_id;

          if (paiementId) {
            // 1. Get all payment proofs for this payment
            const { data: proofs, error: proofsError } = await supabase
              .from('payment_proofs')
              .select('id, file_url')
              .eq('paiement_id', paiementId);

            if (proofsError) {
              throw proofsError;
            }

            // 2. For each proof, check if it's used by other payments
            const filesToDelete: string[] = [];

            if (proofs && proofs.length > 0) {
              for (const proof of proofs) {
                const { data: otherProofs, error: countError } = await supabase
                  .from('payment_proofs')
                  .select('id')
                  .eq('file_url', proof.file_url)
                  .neq('paiement_id', paiementId);

                if (countError) {
                  throw countError;
                }

                if (!otherProofs || otherProofs.length === 0) {
                  const url = new URL(proof.file_url);
                  const pathParts = url.pathname.split('/');
                  const fileName = pathParts[pathParts.length - 1];
                  filesToDelete.push(fileName);
                }
              }

              // 3. Delete payment_proofs records
              const { error: deleteProofsError } = await supabase
                .from('payment_proofs')
                .delete()
                .eq('paiement_id', paiementId);

              if (deleteProofsError) {
                throw deleteProofsError;
              }

              // 4. Delete storage files
              if (filesToDelete.length > 0) {
                const { error: storageError } = await supabase.storage
                  .from('payment-proofs')
                  .remove(filesToDelete);

                if (storageError) {
                  console.error('Error deleting storage files:', storageError);
                }
              }
            }

            // 5. Delete the paiements record
            const { error: deletePaiementError } = await supabase
              .from('paiements')
              .delete()
              .eq('id', paiementId);

            if (deletePaiementError) {
              throw deletePaiementError;
            }
          }

          // 6. Update the echeance to remove payment link and reset to unpaid state
          const { error: echeanceUpdateError } = await supabase
            .from('coupons_echeances')
            .update({
              paiement_id: null,
              statut: 'en_attente',
              date_paiement: null,
              montant_paye: null,
            } as never)
            .eq('id', coupon.id);

          if (echeanceUpdateError) {
            throw echeanceUpdateError;
          }

          successCount++;
        } catch (err) {
          console.error('Error unmarking coupon:', coupon.id, err);
          failCount++;
        }
      }

      // Refresh the coupons list
      await refresh();

      // Invalidate dashboard cache
      triggerCacheInvalidation();

      if (failCount === 0) {
        toast.success(
          `Tous les coupons de l'échéance (${successCount} coupon${successCount > 1 ? 's' : ''}) ont été marqués comme impayés avec succès.`
        );
      } else {
        toast.warning(
          `${successCount} coupon${successCount > 1 ? 's marqués impayés' : ' marqué impayé'}, ${failCount} erreur${failCount > 1 ? 's' : ''}.`
        );
      }
    } catch (err: unknown) {
      console.error('Error in bulk unmark:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error(`Erreur lors de la mise à jour: ${errorMessage}`);
    } finally {
      setMarkingUnpaid(null);
    }
  };

  const handleExportExcel = async () => {
    if (coupons.length === 0) {
      toast.warning('Aucun coupon à exporter');
      return;
    }

    setExportingExcel(true);
    try {
      const exportData = coupons.map(c => ({
        'Date Échéance': formatDate(c.date_echeance),
        Projet: c.projet_nom,
        Tranche: c.tranche_nom,
        Investisseur: c.investisseur_nom,
        CGP: c.investisseur_cgp || '',
        'Montant Brut': c.montant_brut,
        'Montant Net': c.montant_net,
        Statut: c.statut_calculated,
        'Date Paiement': c.date_paiement ? formatDate(c.date_paiement) : '',
      }));

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Coupons');

      worksheet.columns = Object.keys(exportData[0] || {}).map(key => ({
        header: key,
        key: key,
        width: 20,
      }));

      exportData.forEach(row => worksheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coupons_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success(`${coupons.length} coupons exportés`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setExportingExcel(false);
    }
  };

  // Extract unique values for filters
  const uniqueProjets = useMemo(
    () =>
      Array.from(new Set(coupons.map(c => c.projet_nom)))
        .sort()
        .map(p => ({ value: p, label: p })),
    [coupons]
  );

  const uniqueTranches = useMemo(
    () =>
      Array.from(new Set(coupons.map(c => c.tranche_nom)))
        .sort()
        .map(t => ({ value: t, label: t })),
    [coupons]
  );

  const uniqueStatuts = useMemo(
    () => [
      { value: 'en_attente', label: 'Prévu' },
      { value: 'paye', label: 'Payé' },
      { value: 'en_retard', label: 'En retard' },
    ],
    []
  );

  const uniqueCGPs = useMemo(
    () =>
      Array.from(new Set(coupons.map(c => c.investisseur_cgp).filter(Boolean)))
        .sort()
        .map(cgp => ({ value: cgp!, label: cgp! })),
    [coupons]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Coupons</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <TableSkeleton rows={10} columns={7} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Receipt className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Coupons</h1>
            <p className="text-slate-600">
              {totalCount} coupon{totalCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRemindersModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
          >
            <Bell className="w-4 h-4" />
            Rappels
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all shadow-sm hover:shadow-md font-medium disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${exportingExcel ? 'animate-bounce' : ''}`} />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => {
            filterState.clearFilters();
            filterState.setStatut(['en_attente']);
          }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-yellow-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
              Prévu
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {formatCurrency(stats.enAttente.total)}
          </h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enAttente.count} coupons</p>
        </button>

        <button
          onClick={() => {
            filterState.clearFilters();
            filterState.setStatut(['paye']);
          }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-green-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
              Payés
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.payes.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.payes.count} coupons</p>
        </button>

        <button
          onClick={() => {
            filterState.clearFilters();
            filterState.setStatut(['en_retard']);
          }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:border-red-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
              En Retard
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {formatCurrency(stats.enRetard.total)}
          </h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enRetard.count} coupons</p>
        </button>
      </div>

      {/* Search & View Switcher */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par investisseur, projet, tranche..."
              value={filterState.filters.search || ''}
              onChange={e => filterState.setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              showFilters || filterState.activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtres
            {filterState.activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {filterState.activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t border-slate-200 mt-4 pt-4">
            {/* Date Range Filter */}
            <DateRangePicker
              label="Période d'échéance"
              startDate={filterState.filters.dateStart}
              endDate={filterState.filters.dateEnd}
              onStartDateChange={date =>
                filterState.setDateRange(date, filterState.filters.dateEnd)
              }
              onEndDateChange={date =>
                filterState.setDateRange(filterState.filters.dateStart, date)
              }
            />

            {/* Multi-select Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <MultiSelectFilter
                label="Statut"
                options={uniqueStatuts}
                selectedValues={filterState.filters.statut || []}
                onAdd={value =>
                  filterState.setStatut([...(filterState.filters.statut || []), value])
                }
                onRemove={value =>
                  filterState.setStatut((filterState.filters.statut || []).filter(v => v !== value))
                }
                onClear={() => filterState.setStatut([])}
                placeholder="Sélectionner des statuts..."
              />

              <MultiSelectFilter
                label="Projets"
                options={uniqueProjets}
                selectedValues={filterState.filters.projets || []}
                onAdd={value =>
                  filterState.setProjets([...(filterState.filters.projets || []), value])
                }
                onRemove={value =>
                  filterState.setProjets(
                    (filterState.filters.projets || []).filter(v => v !== value)
                  )
                }
                onClear={() => filterState.setProjets([])}
                placeholder="Sélectionner des projets..."
              />

              <MultiSelectFilter
                label="Tranches"
                options={uniqueTranches}
                selectedValues={filterState.filters.tranches || []}
                onAdd={value =>
                  filterState.setTranches([...(filterState.filters.tranches || []), value])
                }
                onRemove={value =>
                  filterState.setTranches(
                    (filterState.filters.tranches || []).filter(v => v !== value)
                  )
                }
                onClear={() => filterState.setTranches([])}
                placeholder="Sélectionner des tranches..."
              />

              <MultiSelectFilter
                label="CGP"
                options={uniqueCGPs}
                selectedValues={filterState.filters.cgps || []}
                onAdd={value => filterState.setCGPs([...(filterState.filters.cgps || []), value])}
                onRemove={value =>
                  filterState.setCGPs((filterState.filters.cgps || []).filter(v => v !== value))
                }
                onClear={() => filterState.setCGPs([])}
                placeholder="Sélectionner des CGP..."
              />
            </div>

            {/* Clear All Filters */}
            {filterState.activeFilterCount > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={filterState.clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Effacer tous les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table View */}
      <TableView
        coupons={coupons}
        onQuickPay={handleQuickPay}
        onViewDetails={handleViewDetails}
        onMarkAsUnpaid={handleMarkAsUnpaid}
        onMarkGroupAsUnpaid={handleBulkUnmarkRequest}
        markingUnpaid={markingUnpaid}
        selectedCoupons={selectedCoupons}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            itemName="coupons"
          />
        </div>
      )}

      {/* Quick Payment Modal */}
      {showQuickPayment && (
        <QuickPaymentModal
          preselectedProjectId={selectedCouponForQuickPay?.projet_id}
          preselectedProjectName={selectedCouponForQuickPay?.projet_nom}
          preselectedTrancheId={selectedCouponForQuickPay?.tranche_id}
          preselectedTrancheName={selectedCouponForQuickPay?.tranche_nom}
          preselectedEcheanceDate={selectedCouponForQuickPay?.date_echeance}
          onClose={() => {
            setShowQuickPayment(false);
            setSelectedCouponForQuickPay(null);
          }}
          onSuccess={() => {
            refresh();
          }}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCoupon && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Détail du Coupon</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600">Projet</p>
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.projet_nom}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Tranche</p>
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.tranche_nom}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Investisseur</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedCoupon.investisseur_nom}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Date Échéance</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(selectedCoupon.date_echeance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Montant Brut</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(selectedCoupon.montant_brut)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-600">Montant Net</p>
                    <TaxInfoTooltip
                      couponBrut={selectedCoupon.montant_brut}
                      couponNet={selectedCoupon.montant_net}
                      investorType={selectedCoupon.investisseur_type || 'physique'}
                    />
                  </div>
                  <p className="text-sm font-medium text-finixar-green">
                    {formatCurrency(selectedCoupon.montant_net)}
                  </p>
                </div>
              </div>
              {selectedCoupon.statut_calculated === 'paye' && selectedCoupon.date_paiement && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">
                    Payé le {formatDate(selectedCoupon.date_paiement)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Montant:{' '}
                    {formatCurrency(selectedCoupon.montant_paye || selectedCoupon.montant_net)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminders Modal */}
      <PaymentRemindersModal
        isOpen={showRemindersModal}
        onClose={() => setShowRemindersModal(false)}
        onSettingsUpdated={() => {
          // Optionally refresh data or show success message
        }}
      />

      {/* Bulk Unmark Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkUnmarkConfirm}
        onClose={() => {
          setShowBulkUnmarkConfirm(false);
          setBulkUnmarkData(null);
        }}
        onConfirm={handleMarkGroupAsUnpaid}
        title="Marquer comme impayé"
        message={`Voulez-vous vraiment marquer tous les coupons de cette échéance comme impayés (${bulkUnmarkData?.coupons.length || 0} coupon${(bulkUnmarkData?.coupons.length || 0) > 1 ? 's' : ''}) ?`}
        confirmText="Marquer impayé"
        cancelText="Annuler"
        type="danger"
        isLoading={markingUnpaid === 'bulk'}
      />
    </div>
  );
}

export default CouponsPageNew;
