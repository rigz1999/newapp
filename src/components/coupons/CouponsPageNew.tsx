import { useState, useMemo } from 'react';
import { useCoupons, Coupon } from '../../hooks/coupons/useCoupons';
import { useCouponFilters } from '../../hooks/coupons/useCouponFilters';
import { TimelineView } from './views/TimelineView';
import { TableView } from './views/TableView';
import { CalendarView } from './views/CalendarView';
import { QuickPayDrawer } from './components/QuickPayDrawer';
import { BulkPaymentModal } from './components/BulkPaymentModal';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination } from '../common/Pagination';
import {
  Receipt,
  Search,
  Download,
  Grid3x3,
  List,
  Calendar as CalendarIcon,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  CheckSquare,
  X,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from '../../utils/toast';

type ViewMode = 'timeline' | 'table' | 'calendar';

interface CouponsPageNewProps {
  organization?: { id: string; name: string; role: string };
}

export function CouponsPageNew(_props: CouponsPageNewProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
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
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [showBulkPay, setShowBulkPay] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const handleQuickPay = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowQuickPay(true);
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

  const handleBulkPay = () => {
    const selected = coupons.filter(c => selectedCoupons.has(c.id) && c.statut_calculated !== 'paye');
    if (selected.length === 0) {
      toast.warning('Veuillez sélectionner au moins un coupon non payé');
      return;
    }
    setShowBulkPay(true);
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
        'Montant Brut': c.montant_coupon,
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

  const selectedCouponsList = useMemo(
    () => coupons.filter(c => selectedCoupons.has(c.id)),
    [coupons, selectedCoupons]
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
          {selectedCoupons.size > 0 && (
            <button
              onClick={handleBulkPay}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
            >
              <CheckSquare className="w-4 h-4" />
              Payer {selectedCoupons.size} sélectionné{selectedCoupons.size > 1 ? 's' : ''}
            </button>
          )}
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
              placeholder="Rechercher..."
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
              Timeline
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
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              Calendrier
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
            <div className="text-sm text-slate-600 mb-2">
              Filtres disponibles - Utilisez la recherche ci-dessus pour filtrer par projet, tranche, investisseur, etc.
            </div>
            {filterState.activeFilterCount > 0 && (
              <button
                onClick={filterState.clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Effacer tous les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection Bar */}
      {selectedCoupons.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-700" />
            <span className="font-medium text-blue-900">
              {selectedCoupons.size} coupon{selectedCoupons.size > 1 ? 's' : ''} sélectionné{selectedCoupons.size > 1 ? 's' : ''}
            </span>
            <span className="text-blue-700">
              • Total: {formatCurrency(selectedCouponsList.reduce((sum, c) => sum + c.montant_net, 0))}
            </span>
          </div>
          <button
            onClick={() => setSelectedCoupons(new Set())}
            className="text-blue-700 hover:text-blue-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'timeline' && (
        <TimelineView
          coupons={coupons}
          onQuickPay={handleQuickPay}
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

      {viewMode === 'calendar' && (
        <CalendarView
          coupons={coupons}
          onQuickPay={handleQuickPay}
          onViewDetails={handleViewDetails}
          selectedCoupons={selectedCoupons}
          onToggleSelect={handleToggleSelect}
        />
      )}

      {/* Pagination */}
      {viewMode !== 'calendar' && totalPages > 1 && (
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

      {/* Modals */}
      <QuickPayDrawer
        isOpen={showQuickPay}
        onClose={() => {
          setShowQuickPay(false);
          setSelectedCoupon(null);
        }}
        coupon={selectedCoupon}
        onSuccess={() => {
          refresh();
          setSelectedCoupons(new Set());
        }}
      />

      <BulkPaymentModal
        isOpen={showBulkPay}
        onClose={() => setShowBulkPay(false)}
        coupons={selectedCouponsList}
        onSuccess={() => {
          refresh();
          setSelectedCoupons(new Set());
        }}
      />

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
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.investisseur_nom}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Date Échéance</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_echeance)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Montant Brut</p>
                  <p className="text-sm font-medium text-slate-900">{formatCurrency(selectedCoupon.montant_coupon)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Montant Net</p>
                  <p className="text-sm font-medium text-finixar-green">{formatCurrency(selectedCoupon.montant_net)}</p>
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
              {selectedCoupon.statut_calculated !== 'paye' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleQuickPay(selectedCoupon);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-colors font-medium"
                >
                  <Upload className="w-5 h-5" />
                  Enregistrer paiement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CouponsPageNew;
