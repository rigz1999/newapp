import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Eye, Edit2, Trash2, Building2, User, ArrowUpDown, X, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Investor {
  id: string;
  id_investisseur: string;
  type: string;
  nom_raison_sociale: string;
  email: string | null;
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

type SortField = 'id_investisseur' | 'nom_raison_sociale' | 'type' | 'email' | 'total_investi' | 'nb_souscriptions';
type SortDirection = 'asc' | 'desc';

export function Investors({ organization }: InvestorsProps) {
  const [investors, setInvestors] = useState<InvestorWithStats[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [trancheFilter, setTrancheFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('nom_raison_sociale');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithStats | null>(null);
  const [editFormData, setEditFormData] = useState<Investor | null>(null);
  
  // ✅ AJOUT : État pour stocker toutes les tranches
  const [allTranches, setAllTranches] = useState<Array<{ 
    id: string; 
    tranche_name: string; 
    projet_id: string; 
    projet_nom: string 
  }>>([]);

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
        (inv.email && inv.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => inv.type.toLowerCase() === typeFilter.toLowerCase());
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(inv => inv.projects?.includes(projectFilter));
    }

    if (trancheFilter !== 'all') {
      filtered = filtered.filter(inv => inv.tranches?.includes(trancheFilter));
    }

    filtered = sortInvestors(filtered, sortField, sortDirection);

    setFilteredInvestors(filtered);
  }, [searchTerm, typeFilter, projectFilter, trancheFilter, investors, sortField, sortDirection]);

  // ✅ MODIFICATION : Récupérer toutes les tranches
  const fetchInvestors = async () => {
    setLoading(true);

    const [investorsRes, subscriptionsRes, tranchesRes] = await Promise.all([
      supabase.from('investisseurs').select('*').order('nom_raison_sociale'),
      supabase.from('souscriptions').select(`
        investisseur_id, montant_investi,
        tranche:tranches(tranche_name, projet:projets(projet))
      `),
      // NOUVEAU : Récupérer toutes les tranches avec leur projet
      supabase.from('tranches').select(`
        id, tranche_name, projet_id,
        projet:projets(projet)
      `)
    ]);

    const investorsData = investorsRes.data || [];
    const subscriptionsData = subscriptionsRes.data || [];
    const tranchesData = tranchesRes.data || [];

    // Formater les tranches pour faciliter le filtrage
    const formattedTranches = tranchesData.map((t: any) => ({
      id: t.id,
      tranche_name: t.tranche_name,
      projet_id: t.projet_id,
      projet_nom: t.projet?.projet || ''
    }));

    setAllTranches(formattedTranches);

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

      if (field === 'nom_raison_sociale' || field === 'id_investisseur' || field === 'email' || field === 'type') {
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

    if (!error) {
      setShowEditModal(false);
      fetchInvestors();
    }
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

    if (!error) {
      setShowDeleteModal(false);
      setSelectedInvestor(null);
      fetchInvestors();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const uniqueProjects = Array.from(new Set(investors.flatMap(inv => inv.projects || [])));

  // ✅ CORRECTION : Filtrer les tranches depuis allTranches selon le projet sélectionné
  const availableTranches = projectFilter === 'all'
    ? []
    : allTranches
        .filter(t => t.projet_nom === projectFilter)
        .map(t => t.tranche_name);

  const handleProjectChange = (project: string) => {
    setProjectFilter(project);
    setTrancheFilter('all');
  };

  const exportToExcel = () => {
    const exportData = filteredInvestors.map(inv => ({
      'ID': inv.id_investisseur,
      'Nom / Raison Sociale': inv.nom_raison_sociale,
      'Type': inv.type === 'Morale' ? 'Personne Morale' : 'Personne Physique',
      'Email': inv.email || '-',
      'Téléphone': inv.telephone || '-',
      'Total Investi': inv.total_investi,
      'Nombre de Souscriptions': inv.nb_souscriptions,
      'Projets': (inv.projects || []).join(', '),
      'Tranches': (inv.tranches || []).join(', '),
      'Résidence Fiscale': inv.residence_fiscale || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Investisseurs');

    const fileName = projectFilter !== 'all'
      ? `investisseurs_${projectFilter}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `investisseurs_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tous les Investisseurs</h2>
          <p className="text-slate-600 mt-1">
            {filteredInvestors.length} investisseur{filteredInvestors.length > 1 ? 's' : ''} 
            {investors.length !== filteredInvestors.length && ` (sur ${investors.length})`}
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Exporter Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, ID ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="Physique">Personne Physique</option>
                <option value="Morale">Personne Morale</option>
              </select>

              <select
                value={projectFilter}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tous les projets</option>
                {uniqueProjects.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>

              <select
                value={trancheFilter}
                onChange={(e) => setTrancheFilter(e.target.value)}
                disabled={projectFilter === 'all'}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">Toutes les tranches</option>
                {availableTranches.map((tranche) => (
                  <option key={tranche} value={tranche}>
                    {tranche}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredInvestors.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun investisseur trouvé</h3>
            <p className="text-slate-600">
              {searchTerm || typeFilter !== 'all' || projectFilter !== 'all' || trancheFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Aucun investisseur enregistré pour le moment'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('id_investisseur')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      ID
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('nom_raison_sociale')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      Nom / Raison Sociale
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      Type
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      Contact
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('total_investi')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      Total Investi
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('nb_souscriptions')}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-900"
                    >
                      Souscriptions
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvestors.map((investor) => (
                  <tr key={investor.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {investor.id_investisseur}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          investor.type.toLowerCase() === 'morale' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {investor.type.toLowerCase() === 'morale' ? (
                            <Building2 className="w-5 h-5 text-purple-600" />
                          ) : (
                            <User className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{investor.nom_raison_sociale}</p>
                          {investor.projects && investor.projects.length > 0 && (
                            <p className="text-xs text-slate-600">
                              {investor.projects.length} projet{investor.projects.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        investor.type.toLowerCase() === 'morale'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {investor.type === 'Morale' ? 'Personne Morale' : 'Personne Physique'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div>
                        <p>{investor.email || '-'}</p>
                        {investor.telephone && (
                          <p className="text-xs text-slate-500">{investor.telephone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(investor.total_investi)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {investor.nb_souscriptions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(investor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(investor)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showDetailsModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedInvestor.type.toLowerCase() === 'morale' ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {selectedInvestor.type.toLowerCase() === 'morale' ? (
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
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
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
                    <p className="text-sm font-medium text-slate-900">
                      {selectedInvestor.type === 'Morale' ? 'Personne Morale' : 'Personne Physique'}
                    </p>
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
                  {selectedInvestor.type.toLowerCase() === 'morale' && selectedInvestor.siren && (
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

      {/* Modal Édition */}
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

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom / Raison Sociale</label>
                  <input
                    type="text"
                    value={editFormData.nom_raison_sociale}
                    onChange={(e) => setEditFormData({ ...editFormData, nom_raison_sociale: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Résidence Fiscale</label>
                  <input
                    type="text"
                    value={editFormData.residence_fiscale || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, residence_fiscale: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {editFormData.type.toLowerCase() === 'physique' && (
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

              {editFormData.type.toLowerCase() === 'morale' && (
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

      {/* Modal Suppression */}
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
    </div>
  );
}

export default Investors;