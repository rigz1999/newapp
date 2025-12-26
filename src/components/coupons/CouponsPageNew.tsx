import { useState, useMemo } from 'react';
import { useCoupons, Coupon } from '../../hooks/coupons/useCoupons';
import { useCouponFilters } from '../../hooks/coupons/useCouponFilters';
import { TimelineView } from './views/TimelineView';
import { TableView } from './views/TableView';
import { PaymentWizard } from '../payments/PaymentWizard';
import { QuickPaymentModal } from './QuickPaymentModal';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination } from '../common/Pagination';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { DateRangePicker } from '../filters/DateRangePicker';
import {
  Receipt,
  Search,
  Download,
  Grid3x3,
  List,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from '../../utils/toast';

type ViewMode = 'timeline' | 'table';

interface CouponsPageNewProps {
  organization?: { id: string; name: string; role: string };
}

export function CouponsPageNew(_props: CouponsPageNewProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const filterState = useCouponFilters();

  // Data fetching
  const { coupons, loading, totalCount, page, pageSize, totalPages, setPage, refresh, stats } = useCoupons({
    pageSize: 50,
    filters: filterState.filters,
  });

  // Selection state
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());

  // Modal state
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCouponForQuickPay, setSelectedCouponForQuickPay] = useState<Coupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Payment wizard preselection
  const [wizardPreselect, setWizardPreselect] = useState<{
    projectId?: string;
    trancheId?: string;
    echeanceDate?: string;
    projectName?: string;
    trancheName?: string;
  }>({});

  // Excel export state
  const [exportingExcel, setExportingExcel] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePayTranche = (
    projectId: string,
    trancheId: string,
    echeanceDate: string,
    projectName: string,
    trancheName: string
  ) => {
    setWizardPreselect({
      projectId,
      trancheId,
      echeanceDate,
      projectName,
      trancheName,
    });
    setShowPaymentWizard(true);
  };

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

  const handleExportExcel = async () => {
    if (coupons.length === 0) {
      toast.warning('Aucun coupon à exporter');
      return;
    }

    setExportingExcel(true);
    try {
      const exportData = coupons.map(c => ({
        'Date Échéance': formatDate(c.date_echeance),
        'Projet': c.projet_nom,
        'Tranche': c.tranche_nom,
        'Investisseur': c.investisseur_nom,
        'CGP': c.investisseur_cgp || '',
        'Montant Brut': c.montant_brut,
        'Montant Net': c.montant_net,
        'Statut': c.statut_calculated,
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
      toast.error('Erreur lors de l\'export');
    } finally {
      setExportingExcel(false);
    }
  };

  // Extract unique values for filters
  const uniqueProjets = useMemo(
    () => Array.from(new Set(coupons.map(c => c.projet_nom))).sort().map(p => ({ value: p, label: p })),
    [coupons]
  );

  const uniqueTranches = useMemo(
    () => Array.from(new Set(coupons.map(c => c.tranche_nom))).sort().map(t => ({ value: t, label: t })),
    [coupons]
  );

  const uniqueStatuts = useMemo(
    () => [
      { value: 'en_attente', label: 'En attente' },
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
              En Attente
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enAttente.total)}</h3>
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
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enRetard.total)}</h3>
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

          {/* View Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
              Par date
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <List className="w-5 h-5" />
              Tableau
            </button>
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
              onStartDateChange={date => filterState.setDateRange(date, filterState.filters.dateEnd)}
              onEndDateChange={date => filterState.setDateRange(filterState.filters.dateStart, date)}
            />

            {/* Multi-select Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <MultiSelectFilter
                label="Statut"
                options={uniqueStatuts}
                selectedValues={filterState.filters.statut || []}
                onAdd={value => filterState.setStatut([...(filterState.filters.statut || []), value])}
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
                onAdd={value => filterState.setProjets([...(filterState.filters.projets || []), value])}
                onRemove={value =>
                  filterState.setProjets((filterState.filters.projets || []).filter(v => v !== value))
                }
                onClear={() => filterState.setProjets([])}
                placeholder="Sélectionner des projets..."
              />

              <MultiSelectFilter
                label="Tranches"
                options={uniqueTranches}
                selectedValues={filterState.filters.tranches || []}
                onAdd={value => filterState.setTranches([...(filterState.filters.tranches || []), value])}
                onRemove={value =>
                  filterState.setTranches((filterState.filters.tranches || []).filter(v => v !== value))
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

      {/* View Content */}
      {viewMode === 'timeline' && (
        <TimelineView
          coupons={coupons}
          onPayTranche={handlePayTranche}
          onViewDetails={handleViewDetails}
          selectedCoupons={selectedCoupons}
          onToggleSelect={handleToggleSelect}
        />
      )}

      {viewMode === 'table' && (
        <TableView
          coupons={coupons}
          onQuickPay={handleQuickPay}
          onViewDetails={handleViewDetails}
          selectedCoupons={selectedCoupons}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      )}

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

      {/* Payment Wizard */}
      {showPaymentWizard && (
        <PaymentWizard
          onClose={() => {
            setShowPaymentWizard(false);
            setWizardPreselect({});
          }}
          onSuccess={() => {
            refresh();
            toast.success('Paiement enregistré avec succès');
            setWizardPreselect({});
            setSelectedCoupons(new Set());
          }}
          preselectedProjectId={wizardPreselect.projectId}
          preselectedTrancheId={wizardPreselect.trancheId}
          preselectedEcheanceDate={wizardPreselect.echeanceDate}
          showProjectName={wizardPreselect.projectName}
          showTrancheName={wizardPreselect.trancheName}
        />
      )}

      {/* Quick Payment Modal */}
      {showQuickPayment && selectedCouponForQuickPay && (
        <QuickPaymentModal
          echeance={{
            id: selectedCouponForQuickPay.id,
            date_echeance: selectedCouponForQuickPay.date_echeance,
            souscription: {
              coupon_net: selectedCouponForQuickPay.montant_net,
              coupon_brut: selectedCouponForQuickPay.montant_brut,
              investisseur: {
                nom_raison_sociale: selectedCouponForQuickPay.investisseur_nom,
              },
            },
          }}
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
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.investisseur_nom}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Date Échéance</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_echeance)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Montant Brut</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatCurrency(selectedCoupon.montant_brut)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Montant Net</p>
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
                    Montant: {formatCurrency(selectedCoupon.montant_paye || selectedCoupon.montant_net)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CouponsPageNew;
