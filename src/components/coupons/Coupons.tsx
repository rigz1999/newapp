 import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Calendar,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  X,
  User,
  Building2,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers,
  Upload
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { PaymentWizard } from '../payments/PaymentWizard';
import { TableSkeleton } from '../common/Skeleton';
import { Pagination, paginate } from '../common/Pagination';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';
import { DateRangePicker } from '../filters/DateRangePicker';

interface Coupon {
  id: string;
  souscription_id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  montant_paye: number | null;
  
  investisseur_id: string;
  investisseur_nom: string;
  investisseur_id_display: string;
  investisseur_type: string;
  investisseur_email: string;
  investisseur_cgp: string | null;
  has_rib: boolean;
  
  projet_id: string;
  projet_nom: string;
  tranche_id: string;
  tranche_nom: string;
  montant_net: number;
}

interface CouponsProps {
  organization: { id: string; name: string; role: string };
}

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

export function Coupons({ organization: _organization }: CouponsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced filters
  const advancedFilters = useAdvancedFilters({
    persistKey: 'coupons-filters',
  });

  // Expand/Collapse states
  const [expandedTranches, setExpandedTranches] = useState<Set<string>>(new Set());

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [advancedFilters.filters]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons_echeances')
        .select(`
          *,
          souscription:souscriptions!inner(
            id,
            investisseur:investisseurs!inner(
              id,
              id_investisseur,
              nom_raison_sociale,
              type,
              email,
              cgp,
              rib_file_path
            ),
            tranche:tranches!inner(
              id,
              tranche_name,
              projet:projets!inner(
                id,
                projet
              )
            )
          )
        `)
        .order('date_echeance', { ascending: true });

      if (error) throw error;

      const processedCoupons: Coupon[] = (data || []).map((c: any) => {
        const investisseur = c.souscription.investisseur;
        const tranche = c.souscription.tranche;
        const projet = tranche.projet;
        
        const montant_net = investisseur.type.toLowerCase() === 'physique' 
          ? c.montant_coupon * 0.70 
          : c.montant_coupon;

        return {
          id: c.id,
          souscription_id: c.souscription_id,
          date_echeance: c.date_echeance,
          montant_coupon: c.montant_coupon,
          statut: c.statut,
          date_paiement: c.date_paiement,
          montant_paye: c.montant_paye,
          
          investisseur_id: investisseur.id,
          investisseur_nom: investisseur.nom_raison_sociale,
          investisseur_id_display: investisseur.id_investisseur,
          investisseur_type: investisseur.type,
          investisseur_email: investisseur.email,
          investisseur_cgp: investisseur.cgp,
          has_rib: !!investisseur.rib_file_path,
          
          projet_id: projet.id,
          projet_nom: projet.projet,
          tranche_id: tranche.id,
          tranche_nom: tranche.tranche_name,
          montant_net,
        };
      });

      setCoupons(processedCoupons);
    } catch {
      // Error is silently ignored
    } finally {
      setLoading(false);
    }
  };

  // Extract unique values for filters
  const uniqueProjets = useMemo(() =>
    Array.from(new Set(coupons.map(c => c.projet_nom))).sort().map(p => ({ value: p, label: p })),
    [coupons]
  );

  const uniqueTranches = useMemo(() =>
    Array.from(new Set(coupons.map(c => c.tranche_nom))).sort().map(t => ({ value: t, label: t })),
    [coupons]
  );

  const uniqueStatuts = useMemo(() => [
    { value: 'en_attente', label: 'En attente' },
    { value: 'paye', label: 'Payé' },
    { value: 'en_retard', label: 'En retard' },
  ], []);

  const uniqueCGPs = useMemo(() =>
    Array.from(new Set(coupons.map(c => c.investisseur_cgp).filter(Boolean))).sort().map(cgp => ({ value: cgp!, label: cgp! })),
    [coupons]
  );

  // Apply filters
  const filteredCoupons = useMemo(() => {
    let filtered = [...coupons];
    const now = new Date();

    // Search filter
    if (advancedFilters.filters.search) {
      const term = advancedFilters.filters.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.investisseur_nom.toLowerCase().includes(term) ||
        c.projet_nom.toLowerCase().includes(term) ||
        c.tranche_nom.toLowerCase().includes(term) ||
        c.investisseur_id_display.toLowerCase().includes(term)
      );
    }

    // Date range filter for echéance
    if (advancedFilters.filters.dateRange.startDate && advancedFilters.filters.dateRange.endDate) {
      const startDate = new Date(advancedFilters.filters.dateRange.startDate);
      const endDate = new Date(advancedFilters.filters.dateRange.endDate);
      filtered = filtered.filter(c => {
        const echeance = new Date(c.date_echeance);
        return echeance >= startDate && echeance <= endDate;
      });
    }

    // Multi-select statut filter
    const statutFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'statut');
    if (statutFilter && statutFilter.values.length > 0) {
      filtered = filtered.filter(c => {
        const isOverdue = new Date(c.date_echeance) < now && c.statut !== 'paye';
        const actualStatut = isOverdue ? 'en_retard' : c.statut;
        return statutFilter.values.includes(actualStatut);
      });
    }

    // Multi-select project filter
    const projetFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'projet');
    if (projetFilter && projetFilter.values.length > 0) {
      filtered = filtered.filter(c => projetFilter.values.includes(c.projet_nom));
    }

    // Multi-select tranche filter
    const trancheFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'tranche');
    if (trancheFilter && trancheFilter.values.length > 0) {
      filtered = filtered.filter(c => trancheFilter.values.includes(c.tranche_nom));
    }

    // Multi-select CGP filter
    const cgpFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'cgp');
    if (cgpFilter && cgpFilter.values.length > 0) {
      filtered = filtered.filter(c => c.investisseur_cgp && cgpFilter.values.includes(c.investisseur_cgp));
    }

    return filtered;
  }, [coupons, advancedFilters.filters]);

  // Count active filters
  const activeFiltersCount = useMemo(() => [
    advancedFilters.filters.search ? 1 : 0,
    advancedFilters.filters.dateRange.startDate || advancedFilters.filters.dateRange.endDate ? 1 : 0,
    ...advancedFilters.filters.multiSelect.map(f => f.values.length > 0 ? 1 : 0)
  ].reduce((a, b) => a + b, 0), [advancedFilters.filters]);

  // ✅ MODIFICATION : KPI sans filtre de période
  const calculateStats = () => {
    const now = new Date();
    
    // Calculer sur TOUS les coupons (pas de filtre période)
    const enAttente = coupons.filter(c => {
      const isOverdue = new Date(c.date_echeance) < now && c.statut !== 'paye';
      return c.statut === 'en_attente' && !isOverdue;
    });
    
    const payes = coupons.filter(c => c.statut === 'paye');
    
    const enRetard = coupons.filter(c => {
      return new Date(c.date_echeance) < now && c.statut !== 'paye';
    });

    return {
      enAttente: {
        count: enAttente.length,
        total: enAttente.reduce((sum, c) => sum + c.montant_net, 0),
      },
      payes: {
        count: payes.length,
        total: payes.reduce((sum, c) => sum + (c.montant_paye || c.montant_net), 0),
      },
      enRetard: {
        count: enRetard.length,
        total: enRetard.reduce((sum, c) => sum + c.montant_net, 0),
      },
    };
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (coupon: Coupon) => {
    const daysUntil = getDaysUntil(coupon.date_echeance);
    
    if (coupon.statut === 'paye') {
      return { text: 'Payé', className: 'bg-green-100 text-green-800' };
    }
    if (daysUntil < 0) {
      return { text: 'En retard', className: 'bg-red-100 text-red-800' };
    }
    if (daysUntil <= 7) {
      return { text: 'Urgent', className: 'bg-orange-100 text-orange-800' };
    }
    if (daysUntil <= 30) {
      return { text: 'À venir', className: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Prévu', className: 'bg-blue-100 text-blue-800' };
  };

  const groupByDateAndTranche = (coupons: Coupon[]) => {
    const grouped: { [date: string]: { [trancheId: string]: Coupon[] } } = {};
    
    coupons.forEach((coupon) => {
      const date = coupon.date_echeance;
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][coupon.tranche_id]) grouped[date][coupon.tranche_id] = [];
      grouped[date][coupon.tranche_id].push(coupon);
    });
    
    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, tranches]) => ({
        date,
        tranches: Object.entries(tranches).map(([trancheId, coupons]) => ({
          trancheId,
          trancheName: coupons[0].tranche_nom,
          projetName: coupons[0].projet_nom,
          projetId: coupons[0].projet_id,
          coupons,
          total: coupons.reduce((sum, c) => sum + c.montant_net, 0),
          hasUnpaid: coupons.some(c => c.statut !== 'paye'),
        })),
      }));
  };

  const toggleTranche = (key: string) => {
    const newExpanded = new Set(expandedTranches);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTranches(newExpanded);
  };

  const handleExportExcel = async () => {
    const exportData = filteredCoupons.map(c => ({
      'Date Échéance': formatDate(c.date_echeance),
      'Projet': c.projet_nom,
      'Tranche': c.tranche_nom,
      'Investisseur': c.investisseur_nom,
      'CGP': c.investisseur_cgp || '',
      'Montant Brut': c.montant_coupon,
      'Montant Net': c.montant_net,
      'Statut': c.statut,
      'Date Paiement': c.date_paiement ? formatDate(c.date_paiement) : '',
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Coupons');

    // Add headers
    worksheet.columns = Object.keys(exportData[0] || {}).map(key => ({
      header: key,
      key: key,
      width: 20
    }));

    // Add data rows
    exportData.forEach(row => worksheet.addRow(row));

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coupons_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = calculateStats();
  const groupedData = groupByDateAndTranche(filteredCoupons);
  const totalAmount = filteredCoupons.reduce((sum, c) => sum + c.montant_net, 0);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tous les Coupons</h2>
          <p className="text-slate-600 mt-1">
            {filteredCoupons.length} coupon{filteredCoupons.length > 1 ? 's' : ''} • Total: <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaymentWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Enregistrer Paiement
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* ✅ SUPPRIMÉ : Sélecteur de période KPI (plus nécessaire) */}

      {/* Stats Cards - ✅ MODIFIÉ : Affiche TOUS les coupons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
              En Attente
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enAttente.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enAttente.count} coupons</p>
          <p className="text-xs text-slate-500 mt-2">Tous les coupons à venir</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              Payés
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.payes.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.payes.count} coupons</p>
          <p className="text-xs text-slate-500 mt-2">Total historique</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
              En Retard
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enRetard.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enRetard.count} coupons</p>
          
          {/* ✅ AJOUT : Bouton pour afficher les retards */}
          {stats.enRetard.count > 0 && (
            <button
              onClick={() => {
                advancedFilters.clearAllFilters();
                advancedFilters.addMultiSelectFilter('statut', 'en_retard');
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium underline"
            >
              Voir les {stats.enRetard.count} retard{stats.enRetard.count > 1 ? 's' : ''} →
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        {/* Basic Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par investisseur, projet, tranche..."
              value={advancedFilters.filters.search}
              onChange={(e) => advancedFilters.setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
              label="Période d'échéance"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MultiSelectFilter
                label="Statut"
                options={uniqueStatuts}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'statut')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('statut', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('statut', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('statut')}
                placeholder="Sélectionner des statuts..."
              />

              <MultiSelectFilter
                label="Projets"
                options={uniqueProjets}
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
                label="CGP"
                options={uniqueCGPs}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'cgp')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('cgp', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('cgp', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('cgp')}
                placeholder="Sélectionner des CGP..."
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

      {/* Coupons List */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon</h3>
          <p className="text-slate-600">
            {coupons.length === 0
              ? 'Aucun coupon programmé'
              : 'Aucun coupon ne correspond aux filtres'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {paginate(groupedData, currentPage, itemsPerPage).map(({ date, tranches }) => {
            const daysUntil = getDaysUntil(date);
            const dateTotal = tranches.reduce((sum, t) => sum + t.total, 0);

            return (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Date Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{formatDate(date)}</h3>
                    <p className="text-sm text-slate-600">
                      {daysUntil < 0 
                        ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}` 
                        : daysUntil === 0 
                          ? 'Aujourd\'hui' 
                          : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Total du jour</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(dateTotal)}</p>
                    <p className="text-xs text-slate-500">{tranches.length} tranche{tranches.length > 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Tranches */}
                <div className="divide-y divide-slate-200">
                  {tranches.map((tranche) => {
                    const trancheKey = `${date}-${tranche.trancheId}`;
                    const isExpanded = expandedTranches.has(trancheKey);
                    
                    return (
                      <div key={tranche.trancheId}>
                        {/* Tranche Header */}
                        <div className="w-full px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                          <button
                            onClick={() => toggleTranche(trancheKey)}
                            className="flex items-center gap-3 flex-1"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Layers className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-slate-900">{tranche.projetName}</p>
                              <p className="text-xs text-slate-600">{tranche.trancheName}</p>
                            </div>
                            {tranche.hasUnpaid && (
                              <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                Non payé
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-600">{formatCurrency(tranche.total)}</p>
                              <p className="text-xs text-slate-500">{tranche.coupons.length} investisseur{tranche.coupons.length > 1 ? 's' : ''}</p>
                            </div>
                            {tranche.hasUnpaid && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPaymentWizard(true);
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Enregistrer Paiement
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded - Investors */}
                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-200">
                            <div className="divide-y divide-slate-100">
                              {tranche.coupons.map((coupon) => {
                                const badge = getStatusBadge(coupon);
                                
                                return (
                                  <div key={coupon.id} className="px-6 py-4 pl-20 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className={`p-2 rounded-lg ${
                                          coupon.investisseur_type === 'Morale' 
                                            ? 'bg-purple-100' 
                                            : 'bg-blue-100'
                                        }`}>
                                          {coupon.investisseur_type === 'Morale' ? (
                                            <Building2 className="w-4 h-4 text-purple-600" />
                                          ) : (
                                            <User className="w-4 h-4 text-blue-600" />
                                          )}
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-slate-900">
                                            {coupon.investisseur_nom}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span>{coupon.investisseur_id_display}</span>
                                            {coupon.investisseur_cgp && (
                                              <>
                                                <span>•</span>
                                                <span className="text-amber-700">CGP: {coupon.investisseur_cgp}</span>
                                              </>
                                            )}
                                            {!coupon.has_rib && (
                                              <>
                                                <span>•</span>
                                                <span className="text-red-600">⚠️ RIB manquant</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4 ml-4">
                                        <div className="text-right">
                                          <p className="text-lg font-bold text-green-600">
                                            {formatCurrency(coupon.montant_net)}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            Brut: {formatCurrency(coupon.montant_coupon)}
                                          </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className} whitespace-nowrap`}>
                                          {badge.text}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setSelectedCoupon(coupon);
                                            setShowDetailsModal(true);
                                          }}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="Voir détails"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Détail du Coupon</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Investisseur</h4>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.investisseur_nom}</p>
                  <p className="text-xs text-slate-600">ID: {selectedCoupon.investisseur_id_display}</p>
                  <p className="text-xs text-slate-600">Email: {selectedCoupon.investisseur_email}</p>
                  {selectedCoupon.investisseur_cgp && (
                    <p className="text-xs text-slate-600">CGP: {selectedCoupon.investisseur_cgp}</p>
                  )}
                  <p className="text-xs text-slate-600">
                    RIB: {selectedCoupon.has_rib ? '✅ Disponible' : '❌ Manquant'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Détails</h4>
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
                    <p className="text-xs text-slate-600">Date Échéance</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_echeance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Montant Brut</p>
                    <p className="text-sm font-medium text-slate-900">{formatCurrency(selectedCoupon.montant_coupon)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Montant Net</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(selectedCoupon.montant_net)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Statut</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCoupon).className}`}>
                      {getStatusBadge(selectedCoupon).text}
                    </span>
                  </div>
                  {selectedCoupon.date_paiement && (
                    <>
                      <div>
                        <p className="text-xs text-slate-600">Date de Paiement</p>
                        <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_paiement)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Montant Payé</p>
                        <p className="text-sm font-medium text-green-600">{formatCurrency(selectedCoupon.montant_paye || 0)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(groupedData.length / itemsPerPage)}
            totalItems={groupedData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            itemName="groupes de dates"
          />
        </div>
      )}

      {/* Payment Wizard */}
      {showPaymentWizard && (
        <PaymentWizard
          onClose={() => setShowPaymentWizard(false)}
          onSuccess={() => {
            fetchCoupons(); // Refresh coupons
          }}
        />
      )}
    </div>
  );
}

export default Coupons;