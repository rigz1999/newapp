import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Eye, Edit2, Trash2, Building2, User, ArrowUpDown, X, AlertTriangle, Download, Upload, FileText, RefreshCw, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmModal, AlertModal } from './Modals';

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

export function Investors({ organization }: InvestorsProps) {
  const [investors, setInvestors] = useState<InvestorWithStats[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [trancheFilter, setTrancheFilter] = useState<string>('all');
  const [cgpFilter, setCgpFilter] = useState<string>('all');
  const [ribFilter, setRibFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('nom_raison_sociale');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [ribSortDirection, setRibSortDirection] = useState<'none' | 'asc' | 'desc'>('none');
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
      setFilteredInvestors([]);
    };
  }, []);

  useEffect(() => {
    let filtered = investors;

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.nom_raison_sociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id_investisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.cgp && inv.cgp.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => normalizeType(inv.type) === typeFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(inv => inv.projects?.includes(projectFilter));
    }

    if (trancheFilter !== 'all') {
      filtered = filtered.filter(inv => inv.tranches?.includes(trancheFilter));
    }

    if (cgpFilter !== 'all') {
      filtered = filtered.filter(inv => inv.cgp === cgpFilter);
    }

    if (ribFilter === 'with-rib') {
      filtered = filtered.filter(inv => inv.rib_file_path && inv.rib_status === 'valide');
    } else if (ribFilter === 'without-rib') {
      filtered = filtered.filter(inv => !inv.rib_file_path || inv.rib_status !== 'valide');
    }

    filtered = sortInvestors(filtered, sortField, sortDirection);

    if (ribSortDirection !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const aHasRib = a.rib_file_path && a.rib_status === 'valide' ? 1 : 0;
        const bHasRib = b.rib_file_path && b.rib_status === 'valide' ? 1 : 0;
        return ribSortDirection === 'asc' ? aHasRib - bHasRib : bHasRib - aHasRib;
      });
    }

    setFilteredInvestors(filtered);
  }, [searchTerm, typeFilter, projectFilter, trancheFilter, cgpFilter, ribFilter, investors, sortField, sortDirection, ribSortDirection]);

  const fetchInvestors = async () => {
    setLoading(true);

    const [investorsRes, subscriptionsRes, tranchesRes] = await Promise.all([
      supabase.from('investisseurs').select('*').order('nom_raison_sociale'),
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
    setFilteredInvestors(investorsWithStats);
    setLoading(false);
  };

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

    const { error } = await supabase
      .from('investisseurs')
      .update(editFormData)
      .eq('id', selectedInvestor.id);

    if (error) {
      console.error('Error updating investor:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors de la mise à jour',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

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
      console.error('Error deleting investor:', error);
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

  const handleRibUpload = async (investor: InvestorWithStats) => {
    setSelectedInvestor(investor);
    setShowRibModal(true);
    setRibFile(null);
    setRibPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRibFile(file);

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
      console.error('Erreur upload RIB:', error);
      setUploadError(error.message || 'Erreur lors de l\'upload du RIB');
      setUploadingRib(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadRib = async (investor: InvestorWithStats) => {
    if (!investor.rib_file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(investor.rib_file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RIB_${investor.nom_raison_sociale}.${investor.rib_file_path.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement RIB:', error);
      setAlertModalConfig({
        title: 'Erreur',
        message: 'Erreur lors du téléchargement du RIB',
        type: 'error'
      });
      setShowAlertModal(true);
    }
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

          setAlertModalConfig({
            title: 'Succès',
            message: 'RIB supprimé avec succès !',
            type: 'success'
          });
          setShowAlertModal(true);
          fetchInvestors();
        } catch (error) {
          console.error('Erreur suppression RIB:', error);
          setAlertModalConfig({
            title: 'Erreur',
            message: 'Erreur lors de la suppression du RIB',
            type: 'error'
          });
          setShowAlertModal(true);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleExportExcel = () => {
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

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Investisseurs');
    XLSX.writeFile(wb, `investisseurs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const uniqueProjects = Array.from(new Set(investors.flatMap(inv => inv.projects || [])));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des investisseurs...</p>
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
            <p className="text-slate-600">{filteredInvestors.length} investisseur{filteredInvestors.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les types</option>
            <option value="physique">Personne Physique</option>
            <option value="morale">Personne Morale</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les projets</option>
            {uniqueProjects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>

          <select
            value={trancheFilter}
            onChange={(e) => setTrancheFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les tranches</option>
            {allTranches.map(tranche => (
              <option key={tranche.id} value={tranche.tranche_name}>
                {tranche.tranche_name} ({tranche.projet_nom})
              </option>
            ))}
          </select>

          <select
            value={cgpFilter}
            onChange={(e) => setCgpFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les CGP</option>
            {allCgps.map(cgp => (
              <option key={cgp} value={cgp}>{cgp}</option>
            ))}
          </select>

          <select
            value={ribFilter}
            onChange={(e) => setRibFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les RIB</option>
            <option value="with-rib">Avec RIB</option>
            <option value="without-rib">Sans RIB</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
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
              {filteredInvestors.map((investor) => {
                const hasRib = investor.rib_file_path && investor.rib_status === 'valide';
                const isInvestorMorale = isMorale(investor.type);
                
                return (
                  <tr key={investor.id} className="hover:bg-slate-50 transition-colors">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
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
                              onClick={() => handleDownloadRib(investor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-xs font-medium"
                              title="Télécharger le RIB"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Télécharger
                            </button>
                            <button
                              onClick={() => handleDeleteRib(investor)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>
      </div>

      {/* Modals remain the same - I'll include key fixes in the details modal */}
      {showDetailsModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedInvestor.total_investi)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Nombre de Souscriptions</p>
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                      <select
                        value={normalizeType(editFormData.type)}
                        onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value === 'morale' ? 'Morale' : 'Physique' })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                      <input
                        type="tel"
                        value={editFormData.telephone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Résidence fiscale</label>
                      <input
                        type="text"
                        value={editFormData.residence_fiscale || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, residence_fiscale: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Forme Juridique</label>
                        <input
                          type="text"
                          value={editFormData.forme_juridique || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, forme_juridique: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Représentant Légal</label>
                        <input
                          type="text"
                          value={editFormData.representant_legal || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, representant_legal: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Prénom</label>
                        <input
                          type="text"
                          value={editFormData.prenom || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nationalité</label>
                        <input
                          type="text"
                          value={editFormData.nationalite || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, nationalite: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Code Postal</label>
                        <input
                          type="text"
                          value={editFormData.code_postal || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, code_postal: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                        <input
                          type="text"
                          value={editFormData.ville || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, ville: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pays</label>
                        <input
                          type="text"
                          value={editFormData.pays || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, pays: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                <AlertTriangle className="w-6 h-6 text-red-600" />
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
                    } as any;
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
                accept=".pdf,.jpg,.jpeg,.png"
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
                      <FileText className="w-5 h-5 text-green-600" />
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
                      className="text-slate-400 hover:text-red-600 transition-colors"
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
                      className="bg-blue-600 h-full transition-all duration-300 ease-out"
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
                      <CheckCircle className="w-5 h-5 text-green-600" />
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
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
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
                      className="text-red-600 hover:text-red-800"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
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
    </div>
  );
}

export default Investors;