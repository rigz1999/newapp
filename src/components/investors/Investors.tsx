import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Search, Eye, Edit2, Trash2, Building2, User, ArrowUpDown, X, AlertTriangle, Download, Upload, FileText, RefreshCw, Mail, AlertCircle, CheckCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ExcelJS from 'exceljs';
import { ConfirmModal, AlertModal } from '../common/Modals';
import { TableSkeleton } from '../common/Skeleton';
import { toast } from '../../utils/toast';
import { Pagination, paginate } from '../common/Pagination';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';
import { isValidSIREN } from '../../utils/validators';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';

interface Investor {
  id: string;
  id_investisseur: string;
  type: string;
  nom_raison_sociale: string;
  email: string | null;
  cgp: string | null;
  email_cgp: string | null;
  siren: number | null;
  residence_fiscale: string | null;
  created_at: string;
  nom?: string | null;
  prenom?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  date_naissance?: string | null;
  lieu_naissance?: string | null;
  nationalite?: string | null;
  numero_piece_identite?: string | null;
  type_piece_identite?: string | null;
  representant_legal?: string | null;
  forme_juridique?: string | null;
  date_creation?: string | null;
  capital_social?: number | null;
  numero_rcs?: string | null;
  siege_social?: string | null;
  rib_file_path?: string | null;
  rib_uploaded_at?: string | null;
  rib_status?: string | null;
}

interface InvestorWithStats extends Investor {
  total_investi: number;
  nb_souscriptions: number;
  projects?: string[];
  tranches?: string[];
}

interface InvestorsProps {
  organization: { id: string; name: string; role: string };
}

type SortField = 'id_investisseur' | 'nom_raison_sociale' | 'type' | 'cgp' | 'total_investi' | 'nb_souscriptions';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to normalize investor type
const normalizeType = (type: string | null | undefined): 'physique' | 'morale' => {
  if (!type) return 'physique';
  const normalized = type.toLowerCase().trim();
  return normalized.includes('morale') ? 'morale' : 'physique';
};

// Helper function to check if investor is morale
const isMorale = (type: string | null | undefined): boolean => {
  return normalizeType(type) === 'morale';
};

// Helper function to format type for display
const formatType = (type: string | null | undefined): string => {
  return isMorale(type) ? 'Personne Morale' : 'Personne Physique';
};

function Investors({ organization: _organization }: InvestorsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [investors, setInvestors] = useState<InvestorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nom_raison_sociale');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [ribSortDirection, setRibSortDirection] = useState<'none' | 'asc' | 'desc'>('none');

  // Advanced filters
  const advancedFilters = useAdvancedFilters({
    persistKey: 'investors-filters',
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithStats | null>(null);
  const [editFormData, setEditFormData] = useState<Investor | null>(null);
  
  const [showRibModal, setShowRibModal] = useState(false);
  const [ribFile, setRibFile] = useState<File | null>(null);
  const [ribPreview, setRibPreview] = useState<string | null>(null);
  const [uploadingRib, setUploadingRib] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // RIB View Modal states
  const [showRibViewModal, setShowRibViewModal] = useState(false);
  const [ribViewUrl, setRibViewUrl] = useState<string | null>(null);
  const [ribViewLoading, setRibViewLoading] = useState(false);
  const [currentRibInvestor, setCurrentRibInvestor] = useState<InvestorWithStats | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Modal states for replacing alert() and confirm()
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ title: '', message: '', onConfirm: () => {} });
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const [allTranches, setAllTranches] = useState<Array<{
    id: string;
    tranche_name: string;
    projet_id: string;
    projet_nom: string
  }>>([]);

  const [allCgps, setAllCgps] = useState<string[]>([]);

  // Bulk delete states
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await fetchInvestors();
      }
    };
    loadData();
    return () => {
      isMounted = false;
      setInvestors([]);
    };
  }, []);

  // Open details modal if ID is in URL params (from search)
  useEffect(() => {
    const investorId = searchParams.get('id');
    if (investorId && investors.length > 0) {
      const investor = investors.find(inv => inv.id === investorId);
      if (investor) {
        setSelectedInvestor(investor);
        setShowDetailsModal(true);
        // Remove the ID from URL to avoid reopening on refresh
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, investors]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedInvestorIds(new Set());
  }, [advancedFilters.filters, currentPage]);

  // Extract unique values for filters
  const uniqueTypes = useMemo(() => [
    { value: 'physique', label: 'Personne Physique' },
    { value: 'morale', label: 'Personne Morale' },
  ], []);

  const uniqueProjects = useMemo(() =>
    Array.from(new Set(investors.flatMap(inv => inv.projects || []))).map(p => ({ value: p, label: p })),
    [investors]
  );

  const uniqueTranches = useMemo(() =>
    Array.from(new Set(investors.flatMap(inv => inv.tranches || []))).map(t => ({ value: t, label: t })),
    [investors]
  );

  const uniqueCgps = useMemo(() =>
    Array.from(new Set(investors.map(inv => inv.cgp).filter(Boolean))).map(c => ({ value: c!, label: c! })),
    [investors]
  );

  const uniqueRibStatus = useMemo(() => [
    { value: 'with-rib', label: 'Avec RIB' },
    { value: 'without-rib', label: 'Sans RIB' },
  ], []);

  // Sort function - defined before use
  const sortInvestors = (data: InvestorWithStats[], field: SortField, direction: SortDirection) => {
    return [...data].sort((a, b) => {
      let aValue: any = a[field];
      let bValue: any = b[field];

      if (field === 'nom_raison_sociale' || field === 'id_investisseur' || field === 'cgp' || field === 'type') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Apply filters and sorting
  const filteredInvestors = useMemo(() => {
    let filtered = [...investors];

    // Search filter
    if (advancedFilters.filters.search) {
      const term = advancedFilters.filters.search.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.nom_raison_sociale.toLowerCase().includes(term) ||
        inv.id_investisseur.toLowerCase().includes(term) ||
        (inv.cgp && inv.cgp.toLowerCase().includes(term)) ||
        (inv.email && inv.email.toLowerCase().includes(term))
      );
    }

    // Multi-select type filter
    const typeFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'type');
    if (typeFilter && typeFilter.values.length > 0) {
      filtered = filtered.filter(inv => typeFilter.values.includes(normalizeType(inv.type)));
    }

    // Multi-select project filter
    const projectFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'project');
    if (projectFilter && projectFilter.values.length > 0) {
      filtered = filtered.filter(inv =>
        inv.projects?.some(p => projectFilter.values.includes(p))
      );
    }

    // Multi-select tranche filter
    const trancheFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'tranche');
    if (trancheFilter && trancheFilter.values.length > 0) {
      filtered = filtered.filter(inv =>
        inv.tranches?.some(t => trancheFilter.values.includes(t))
      );
    }

    // Multi-select CGP filter
    const cgpFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'cgp');
    if (cgpFilter && cgpFilter.values.length > 0) {
      filtered = filtered.filter(inv => inv.cgp && cgpFilter.values.includes(inv.cgp));
    }

    // Multi-select RIB status filter
    const ribFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'ribStatus');
    if (ribFilter && ribFilter.values.length > 0) {
      filtered = filtered.filter(inv => {
        const hasRib = inv.rib_file_path && inv.rib_status === 'valide';
        return ribFilter.values.some(val => {
          if (val === 'with-rib') return hasRib;
          if (val === 'without-rib') return !hasRib;
          return false;
        });
      });
    }

    // Apply sorting
    filtered = sortInvestors(filtered, sortField, sortDirection);

    if (ribSortDirection !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const aHasRib = a.rib_file_path && a.rib_status === 'valide' ? 1 : 0;
        const bHasRib = b.rib_file_path && b.rib_status === 'valide' ? 1 : 0;
        return ribSortDirection === 'asc' ? aHasRib - bHasRib : bHasRib - aHasRib;
      });
    }

    return filtered;
  }, [investors, advancedFilters.filters, sortField, sortDirection, ribSortDirection]);

  // Count active filters
  const activeFiltersCount = useMemo(() => [
    advancedFilters.filters.search ? 1 : 0,
    ...advancedFilters.filters.multiSelect.map(f => f.values.length > 0 ? 1 : 0)
  ].reduce((a, b) => a + b, 0), [advancedFilters.filters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [advancedFilters.filters]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDetailsModal) {
          console.log('ESC pressed in Investor Details Modal');
          setShowDetailsModal(false);
        } else if (showEditModal) {
          console.log('ESC pressed in Investor Edit Modal');
          setShowEditModal(false);
        } else if (showDeleteModal) {
          console.log('ESC pressed in Investor Delete Modal');
          setShowDeleteModal(false);
        } else if (showRibModal) {
          console.log('ESC pressed in RIB Upload Modal');
          setShowRibModal(false);
        } else if (showRibViewModal) {
          console.log('ESC pressed in RIB View Modal');
          setShowRibViewModal(false);
        }
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [showDetailsModal, showEditModal, showDeleteModal, showRibModal, showRibViewModal]);

  const fetchInvestors = async () => {
    setLoading(true);

    const [investorsRes, subscriptionsRes, tranchesRes] = await Promise.all([
      supabase
        .from('investisseurs')
        .select('*')
        .order('nom_raison_sociale')
        .limit(1000), // Safety limit to prevent loading too much data
      supabase.from('souscriptions').select(`
        investisseur_id, montant_investi,
        tranche:tranches(tranche_name, projet:projets(projet))
      `),
      supabase.from('tranches').select(`
        id, tranche_name, projet_id,
        projet:projets(projet)
      `)
    ]);

    const investorsData = investorsRes.data || [];
    const subscriptionsData = subscriptionsRes.data || [];
    const tranchesData = tranchesRes.data || [];

    const formattedTranches = tranchesData.map((t: any) => ({
      id: t.id,
      tranche_name: t.tranche_name,
      projet_id: t.projet_id,
      projet_nom: t.projet?.projet || ''
    }));

    setAllTranches(formattedTranches);

    const uniqueCgps = Array.from(
      new Set(
        investorsData
          .map((inv: any) => inv.cgp)
          .filter(Boolean)
      )
    ).sort();
    setAllCgps(uniqueCgps as string[]);

    const investorsWithStats = investorsData.map((investor) => {
      const investorSubs = subscriptionsData.filter((s: any) => s.investisseur_id === investor.id);
      const totalInvesti = investorSubs.reduce((sum, sub: any) => sum + Number(sub.montant_investi || 0), 0);
      const projects = Array.from(new Set(investorSubs.map((s: any) => s.tranche?.projet?.projet).filter(Boolean)));
      const tranches = Array.from(new Set(investorSubs.map((s: any) => s.tranche?.tranche_name).filter(Boolean)));

      return {
        ...investor,
        total_investi: totalInvesti,
        nb_souscriptions: investorSubs.length,
        projects,
        tranches,
      };
    });

    setInvestors(investorsWithStats);
    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setRibSortDirection('none');
  };

  const handleSortRib = () => {
    if (ribSortDirection === 'none' || ribSortDirection === 'desc') {
      setRibSortDirection('asc');
    } else {
      setRibSortDirection('desc');
    }
  };

  const handleViewDetails = (investor: InvestorWithStats) => {
    setSelectedInvestor(investor);
    setShowDetailsModal(true);
  };

  const handleEditClick = (investor: InvestorWithStats) => {
    setSelectedInvestor(investor);
    setEditFormData(investor);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editFormData || !selectedInvestor) return;

    // Validate SIREN for personne morale
    if (isMorale(editFormData.type) && editFormData.siren) {
      const sirenString = String(editFormData.siren);
      if (!isValidSIREN(sirenString)) {
        toast.error('Le numéro SIREN doit contenir 9 chiffres et être valide selon l\'algorithme de Luhn.');
        return;
      }
    }

    const { error } = await supabase
      .from('investisseurs')
      .update(editFormData)
      .eq('id', selectedInvestor.id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }

    toast.success('Investisseur mis à jour avec succès !');
    setShowEditModal(false);
    fetchInvestors();
  };

  const handleDeleteClick = (investor: InvestorWithStats) => {
    setSelectedInvestor(investor);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInvestor) return;

    const { error } = await supabase
      .from('investisseurs')
      .delete()
      .eq('id', selectedInvestor.id);

    if (error) {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la suppression',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    setShowDeleteModal(false);
    fetchInvestors();
  };

  // Bulk delete functions
  const handleSelectInvestor = (investorId: string) => {
    const newSelected = new Set(selectedInvestorIds);
    if (newSelected.has(investorId)) {
      newSelected.delete(investorId);
    } else {
      newSelected.add(investorId);
    }
    setSelectedInvestorIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvestorIds.size === filteredInvestors.length) {
      setSelectedInvestorIds(new Set());
    } else {
      setSelectedInvestorIds(new Set(filteredInvestors.map(inv => inv.id)));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedInvestorIds.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedInvestorIds.size === 0) return;

    const idsToDelete = Array.from(selectedInvestorIds);

    const { error } = await supabase
      .from('investisseurs')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
      return;
    }

    toast.success(`${idsToDelete.length} investisseur(s) supprimé(s) avec succès`);
    setShowBulkDeleteModal(false);
    setSelectedInvestorIds(new Set());
    fetchInvestors();
  };

  const handleRibUpload = async (investor: InvestorWithStats) => {
    setSelectedInvestor(investor);
    setShowRibModal(true);
    setRibFile(null);
    setRibPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file before accepting it
    const validation = validateFile(file, FILE_VALIDATION_PRESETS.rib);
    if (!validation.valid) {
      setUploadError(validation.error || 'Fichier invalide');
      return;
    }

    setRibFile(file);
    setUploadError(''); // Clear any previous errors

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setRibPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setRibPreview(null);
    }
  };

  const handleRibUploadConfirm = async () => {
    if (!ribFile || !selectedInvestor) return;

    setUploadingRib(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadSuccess(false);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const fileExt = ribFile.name.split('.').pop();
      const fileName = `${selectedInvestor.id}_${Date.now()}.${fileExt}`;
      const filePath = `ribs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, ribFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      const { error: updateError } = await supabase
        .from('investisseurs')
        .update({
          rib_file_path: filePath,
          rib_uploaded_at: new Date().toISOString(),
          rib_status: 'valide'
        })
        .eq('id', selectedInvestor.id);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setUploadSuccess(true);

      // Close modal after showing success
      setTimeout(() => {
        setShowRibModal(false);
        setUploadingRib(false);
        setUploadProgress(0);
        setUploadSuccess(false);
        setRibFile(null);
        setRibPreview(null);
        fetchInvestors();
      }, 2000);

    } catch (error: any) {
      setUploadError(error.message || 'Erreur lors de l\'upload du RIB');
      setUploadingRib(false);
      setUploadProgress(0);
    }
  };

  const handleViewRib = async (investor: InvestorWithStats) => {
    if (!investor.rib_file_path) return;

    setCurrentRibInvestor(investor);
    setShowRibViewModal(true);
    setRibViewLoading(true);

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(investor.rib_file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      setRibViewUrl(url);
    } catch {
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors du chargement du RIB',
        type: 'error'
      });
      setShowAlertModal(true);
      setShowRibViewModal(false);
    } finally {
      setRibViewLoading(false);
    }
  };

  const handleCloseRibView = () => {
    if (ribViewUrl) {
      window.URL.revokeObjectURL(ribViewUrl);
    }
    setRibViewUrl(null);
    setShowRibViewModal(false);
    setCurrentRibInvestor(null);
  };

  const handleDownloadFromView = () => {
    if (!currentRibInvestor || !ribViewUrl) return;

    const a = document.createElement('a');
    a.href = ribViewUrl;
    a.download = `RIB_${currentRibInvestor.nom_raison_sociale}.${currentRibInvestor.rib_file_path?.split('.').pop()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteRib = (investor: InvestorWithStats) => {
    if (!investor.rib_file_path) return;

    setConfirmModalConfig({
      title: 'Supprimer le RIB',
      message: `Êtes-vous sûr de vouloir supprimer le RIB de ${investor.nom_raison_sociale} ?\n\nCette action est irréversible.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([investor.rib_file_path!]);

          if (storageError) throw storageError;

          const { error: updateError } = await supabase
            .from('investisseurs')
            .update({
              rib_file_path: null,
              rib_uploaded_at: null,
              rib_status: 'manquant'
            })
            .eq('id', investor.id);

          if (updateError) throw updateError;

          toast.success('RIB supprimé avec succès !');
          fetchInvestors();
        } catch {
          toast.error('Erreur lors de la suppression du RIB');
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleExportExcel = async () => {
    const exportData = filteredInvestors.map(inv => ({
      'ID': inv.id_investisseur,
      'Nom / Raison Sociale': inv.nom_raison_sociale,
      'Type': formatType(inv.type),
      'CGP': inv.cgp || '',
      'Email CGP': inv.email_cgp || '',
      'Téléphone': inv.telephone || '',
      'Total Investi': inv.total_investi,
      'Nb Souscriptions': inv.nb_souscriptions,
      'Projets': inv.projects?.join(', ') || '',
      'RIB': inv.rib_status === 'valide' ? 'Oui' : 'Non'
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Investisseurs');

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
    link.download = `investisseurs_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Investisseurs</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <TableSkeleton rows={10} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Investisseurs</h1>
            <p className="text-slate-600">
              {filteredInvestors.length} investisseur{filteredInvestors.length > 1 ? 's' : ''}
              {selectedInvestorIds.size > 0 && (
                <span className="ml-2 text-finixar-teal font-semibold">
                  ({selectedInvestorIds.size} sélectionné{selectedInvestorIds.size > 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedInvestorIds.size > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-2 px-4 py-2 bg-finixar-red text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer ({selectedInvestorIds.size})
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-finixar-action-view text-white rounded-lg hover:bg-finixar-action-view-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        {/* Basic Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, ID, CGP, email..."
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

            {/* Multi-select Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MultiSelectFilter
                label="Type d'investisseur"
                options={uniqueTypes}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'type')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('type', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('type', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('type')}
                placeholder="Sélectionner des types..."
              />

              <MultiSelectFilter
                label="Projets"
                options={uniqueProjects}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'project')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('project', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('project', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('project')}
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
                options={uniqueCgps}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'cgp')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('cgp', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('cgp', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('cgp')}
                placeholder="Sélectionner des CGP..."
              />

              <MultiSelectFilter
                label="Statut RIB"
                options={uniqueRibStatus}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'ribStatus')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('ribStatus', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('ribStatus', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('ribStatus')}
                placeholder="Sélectionner un statut..."
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedInvestorIds.size === filteredInvestors.length && filteredInvestors.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-finixar-teal border-slate-300 rounded focus:ring-finixar-teal cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('nom_raison_sociale')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900">
                    Nom / Raison Sociale <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('type')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900">
                    Type <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('cgp')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900">
                    CGP <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('total_investi')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900">
                    Total Investi <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => handleSort('nb_souscriptions')} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900">
                    Souscriptions <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center">
                  <button onClick={handleSortRib} className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900 mx-auto">
                    RIB <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-3 text-center">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginate(filteredInvestors, currentPage, itemsPerPage).map((investor) => {
                const hasRib = investor.rib_file_path && investor.rib_status === 'valide';
                const isInvestorMorale = isMorale(investor.type);
                
                return (
                  <tr key={investor.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvestorIds.has(investor.id)}
                        onChange={() => handleSelectInvestor(investor.id)}
                        className="w-4 h-4 text-finixar-teal border-slate-300 rounded focus:ring-finixar-teal cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isInvestorMorale ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {isInvestorMorale ? (
                            <Building2 className="w-5 h-5 text-purple-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{investor.nom_raison_sociale}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isInvestorMorale
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {formatType(investor.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <p>{investor.cgp || '-'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-finixar-green">
                      {formatCurrency(investor.total_investi)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {investor.nb_souscriptions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {hasRib ? (
                          <>
                            <button
                              onClick={() => handleViewRib(investor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium"
                              title="Voir le RIB"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Voir
                            </button>
                            <button
                              onClick={() => handleDeleteRib(investor)}
                              className="p-1.5 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer le RIB"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRibUpload(investor)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-xs font-medium"
                            title="Mettre en ligne un RIB"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Mettre en ligne
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetails(investor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(investor)}
                          className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredInvestors.length / itemsPerPage)}
            totalItems={filteredInvestors.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            itemName="investisseurs"
          />
        </div>
      </div>

      {/* Modals remain the same - I'll include key fixes in the details modal */}
      {showDetailsModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  isMorale(selectedInvestor.type) ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {isMorale(selectedInvestor.type) ? (
                    <Building2 className="w-8 h-8 text-purple-600" />
                  ) : (
                    <User className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedInvestor.nom_raison_sociale}</h3>
                  <p className="text-sm text-slate-600">{selectedInvestor.id_investisseur}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditClick(selectedInvestor);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-finixar-action-edit text-white rounded-lg hover:bg-finixar-action-edit-hover transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total Investi</p>
                  <p className="text-2xl font-bold text-finixar-green">{formatCurrency(selectedInvestor.total_investi)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Nombre de souscriptions</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedInvestor.nb_souscriptions}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  Conseiller en Gestion de Patrimoine
                </h4>
                
                {selectedInvestor.cgp ? (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-slate-900">
                        {selectedInvestor.cgp}
                      </p>
                      {selectedInvestor.email_cgp && (
                        <a 
                          href={`mailto:${selectedInvestor.email_cgp}`}
                          className="text-sm text-amber-700 hover:text-amber-900 flex items-center gap-1 mt-1"
                        >
                          <Mail className="w-4 h-4" />
                          {selectedInvestor.email_cgp}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Aucun CGP assigné</p>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEditClick(selectedInvestor);
                      }}
                      className="mt-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
                    >
                      Assigner un CGP
                    </button>
                  </div>
                )}
              </div>

              {selectedInvestor.projects && selectedInvestor.projects.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Projets</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvestor.projects.map((project) => (
                      <span key={project} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {project}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvestor.tranches && selectedInvestor.tranches.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Tranches</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvestor.tranches.map((tranche) => (
                      <span key={tranche} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        {tranche}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 mb-4">Informations</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Type</p>
                    <p className="text-sm font-medium text-slate-900">{formatType(selectedInvestor.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Téléphone</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.telephone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Résidence Fiscale</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.residence_fiscale || '-'}</p>
                  </div>
                  {isMorale(selectedInvestor.type) && selectedInvestor.siren && (
                    <div>
                      <p className="text-sm text-slate-600">SIREN</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.siren}</p>
                    </div>
                  )}
                  {selectedInvestor.adresse && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-600">Adresse</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedInvestor.adresse}
                        {selectedInvestor.code_postal && `, ${selectedInvestor.code_postal}`}
                        {selectedInvestor.ville && ` ${selectedInvestor.ville}`}
                        {selectedInvestor.pays && `, ${selectedInvestor.pays}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - keeping existing code but with type handling improvements */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Modifier l'investisseur</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-slate-900">Informations générales</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nom / Raison sociale</label>
                      <input
                        type="text"
                        value={editFormData.nom_raison_sociale}
                        onChange={(e) => setEditFormData({ ...editFormData, nom_raison_sociale: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                      <select
                        value={normalizeType(editFormData.type)}
                        onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value === 'morale' ? 'Morale' : 'Physique' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="physique">Personne Physique</option>
                        <option value="morale">Personne Morale</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editFormData.telephone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Résidence fiscale</label>
                      <input
                        type="text"
                        value={editFormData.residence_fiscale || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, residence_fiscale: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h5 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-600" />
                    Conseiller en Gestion de Patrimoine
                  </h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nom du CGP *
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.cgp || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, cgp: e.target.value })}
                        placeholder="Ex: Jean Dupont"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email du CGP *
                      </label>
                      <input
                        type="email"
                        required
                        value={editFormData.email_cgp || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email_cgp: e.target.value })}
                        placeholder="cgp@email.com"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Le CGP sera utilisé pour toutes les souscriptions de cet investisseur
                  </p>
                </div>

                {isMorale(editFormData.type) ? (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-slate-900">Personne Morale</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">SIREN</label>
                        <input
                          type="number"
                          value={editFormData.siren || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, siren: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Forme Juridique</label>
                        <input
                          type="text"
                          value={editFormData.forme_juridique || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, forme_juridique: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Représentant Légal</label>
                        <input
                          type="text"
                          value={editFormData.representant_legal || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, representant_legal: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-slate-900">Personne Physique</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
                        <input
                          type="text"
                          value={editFormData.nom || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
                        <input
                          type="text"
                          value={editFormData.prenom || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nationalité</label>
                        <input
                          type="text"
                          value={editFormData.nationalite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nationalite: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="font-semibold text-slate-900">Adresse</h5>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
                      <input
                        type="text"
                        value={editFormData.adresse || editFormData.siege_social || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, adresse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Code Postal</label>
                        <input
                          type="text"
                          value={editFormData.code_postal || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, code_postal: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                        <input
                          type="text"
                          value={editFormData.ville || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, ville: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pays</label>
                        <input
                          type="text"
                          value={editFormData.pays || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, pays: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-finixar-red" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Supprimer l'investisseur</h3>
              <p className="text-slate-600 text-center mb-4">
                Êtes-vous sûr de vouloir supprimer <strong>{selectedInvestor.nom_raison_sociale}</strong> ?
                Cette action est irréversible.
              </p>
              {selectedInvestor.nb_souscriptions > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    Attention : Cet investisseur a {selectedInvestor.nb_souscriptions} souscription
                    {selectedInvestor.nb_souscriptions > 1 ? 's' : ''} active{selectedInvestor.nb_souscriptions > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-finixar-action-delete text-white rounded-lg hover:bg-finixar-action-delete-hover transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIB Upload Modal */}
      {showRibModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  📄 Upload RIB - {selectedInvestor.nom_raison_sociale}
                </h3>
                <button
                  onClick={() => setShowRibModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💡 Le RIB est nécessaire pour effectuer les virements de coupons à cet investisseur.
                  Formats acceptés : PDF, JPG, PNG
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const fakeEvent = {
                      target: { files: [file] }
                    } as React.ChangeEvent<HTMLInputElement>;
                    handleFileChange(fakeEvent);
                  }
                }}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 mb-4 text-center hover:border-blue-400 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => document.getElementById('rib-file-input')?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      Glissez votre fichier ici
                    </p>
                    <p className="text-xs text-slate-500">
                      ou cliquez pour parcourir
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>PDF, JPG, PNG • Max 10 MB</span>
                  </div>
                </div>
              </div>

              <input
                id="rib-file-input"
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />

              {ribPreview && (
                <div className="mb-4 border rounded-lg p-4 bg-slate-50">
                  <p className="text-xs text-slate-600 mb-2 font-medium">Aperçu :</p>
                  <img 
                    src={ribPreview} 
                    alt="Preview RIB" 
                    className="max-h-48 mx-auto rounded shadow-sm"
                  />
                </div>
              )}

              {ribFile && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-5 h-5 text-finixar-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{ribFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(ribFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setRibFile(null);
                        setRibPreview(null);
                      }}
                      className="text-slate-400 hover:text-finixar-red transition-colors"
                      disabled={uploadingRib}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploadingRib && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      Upload en cours...
                    </span>
                    <span className="text-sm font-semibold text-blue-900">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-finixar-teal h-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Success */}
              {uploadSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-finixar-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">
                        RIB uploadé avec succès !
                      </p>
                      <p className="text-xs text-green-700">
                        Le document a été enregistré et validé
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        Erreur lors de l'upload
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {uploadError}
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadError('')}
                      className="text-finixar-red hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowRibModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                disabled={uploadingRib}
              >
                Annuler
              </button>
              <button
                onClick={handleRibUploadConfirm}
                disabled={!ribFile || uploadingRib}
                className="px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingRib ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Uploader le RIB
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIB View Modal */}
      {showRibViewModal && currentRibInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                RIB - {currentRibInvestor.nom_raison_sociale}
              </h3>
              <button
                onClick={handleCloseRibView}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {ribViewLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-sm text-slate-600">Chargement du RIB...</p>
                  </div>
                </div>
              ) : ribViewUrl ? (
                <div className="flex items-center justify-center">
                  {currentRibInvestor.rib_file_path?.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={ribViewUrl}
                      className="w-full h-[600px] border rounded-lg"
                      title="RIB PDF"
                    />
                  ) : (
                    <img
                      src={ribViewUrl}
                      alt="RIB"
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  )}
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={handleCloseRibView}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleDownloadFromView}
                className="px-4 py-2 bg-finixar-teal text-white rounded-lg hover:bg-finixar-teal-hover transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        type={confirmModalConfig.type}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Supprimer les investisseurs"
        message={`Êtes-vous sûr de vouloir supprimer ${selectedInvestorIds.size} investisseur${selectedInvestorIds.size > 1 ? 's' : ''} ?\n\nCette action est irréversible et supprimera également toutes les souscriptions associées.`}
        type="danger"
      />
    </div>
  );
}

export default Investors;