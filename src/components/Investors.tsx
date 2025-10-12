import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
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
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onSelectInvestor: (investorId: string) => void;
}

type SortField = 'id_investisseur' | 'nom_raison_sociale' | 'type' | 'email' | 'total_investi' | 'nb_souscriptions';
type SortDirection = 'asc' | 'desc';

export function Investors({ organization, onLogout, onNavigate, onSelectInvestor }: InvestorsProps) {
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

  useEffect(() => {
    fetchInvestors();
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

  const fetchInvestors = async () => {
    setLoading(true);

    const { data: investorsData } = await supabase
      .from('investisseurs')
      .select('*')
      .order('nom_raison_sociale');

    if (investorsData) {
      const investorsWithStats = await Promise.all(
        investorsData.map(async (investor) => {
          const { data: subscriptions } = await supabase
            .from('souscriptions')
            .select('montant_investi, tranches(tranche_name, projets(projet))')
            .eq('investisseur_id', investor.id);

          const totalInvesti = subscriptions?.reduce((sum, sub) => sum + Number(sub.montant_investi || 0), 0) || 0;
          const projects = Array.from(new Set(subscriptions?.map(s => (s.tranches as any)?.projets?.projet).filter(Boolean)));
          const tranches = Array.from(new Set(subscriptions?.map(s => (s.tranches as any)?.tranche_name).filter(Boolean)));

          return {
            ...investor,
            total_investi: totalInvesti,
            nb_souscriptions: subscriptions?.length || 0,
            projects,
            tranches,
          };
        })
      );

      setInvestors(investorsWithStats);
      setFilteredInvestors(investorsWithStats);
    }

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

  const availableTranches = projectFilter === 'all'
    ? []
    : Array.from(new Set(
        investors
          .filter(inv => inv.projects?.includes(projectFilter))
          .flatMap(inv => inv.tranches || [])
      ));

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
      'Résidence Fiscale': inv.residence_fiscale || '-',
      'Total Investi': inv.total_investi,
      'Nb Souscriptions': inv.nb_souscriptions,
      'Projets': inv.projects?.join(', ') || '-',
      'Tranches': inv.tranches?.join(', ') || '-',
      'Adresse': inv.adresse || inv.siege_social || '-',
      'Code Postal': inv.code_postal || '-',
      'Ville': inv.ville || '-',
      'Pays': inv.pays || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Investisseurs');

    const fileName = projectFilter !== 'all'
      ? `investisseurs_${projectFilter}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `investisseurs_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-6 py-4 text-left text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        <ArrowUpDown className={`w-4 h-4 ${
          sortField === field ? 'text-blue-600' : 'text-slate-400'
        }`} />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="investors"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tous les Investisseurs</h2>
              <p className="text-slate-600 mt-1">{filteredInvestors.length} investisseur{filteredInvestors.length > 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={exportToExcel}
              disabled={filteredInvestors.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>Exporter Excel</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredInvestors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchTerm || typeFilter !== 'all' ? 'Aucun investisseur trouvé' : 'Aucun investisseur'}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || typeFilter !== 'all'
                  ? 'Essayez avec d\'autres critères'
                  : 'Ajoutez votre premier investisseur'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <SortableHeader field="id_investisseur">ID</SortableHeader>
                      <SortableHeader field="nom_raison_sociale">Nom / Raison Sociale</SortableHeader>
                      <SortableHeader field="type">Type</SortableHeader>
                      <SortableHeader field="email">Email</SortableHeader>
                      <SortableHeader field="total_investi">Total Investi</SortableHeader>
                      <SortableHeader field="nb_souscriptions">Souscriptions</SortableHeader>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestors.map((investor) => (
                      <tr key={investor.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-slate-600">{investor.id_investisseur}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              investor.type.toLowerCase() === 'morale' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {investor.type.toLowerCase() === 'morale' ? (
                                <Building2 className="w-4 h-4 text-purple-600" />
                              ) : (
                                <User className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{investor.nom_raison_sociale}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            investor.type.toLowerCase() === 'morale'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {investor.type.toLowerCase() === 'morale' ? 'Morale' : 'Physique'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{investor.email || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(investor.total_investi)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-900 font-medium">{investor.nb_souscriptions}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
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
                              title="Éditer"
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
            </div>
          )}
        </div>
      </main>

      {showDetailsModal && selectedInvestor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Détails de l'investisseur</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <div className={`p-3 rounded-xl ${
                  selectedInvestor.type.toLowerCase() === 'morale' ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  {selectedInvestor.type.toLowerCase() === 'morale' ? (
                    <Building2 className="w-8 h-8 text-purple-600" />
                  ) : (
                    <User className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedInvestor.nom_raison_sociale}</h4>
                  <p className="text-sm text-slate-600">{selectedInvestor.id_investisseur}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Total Investi</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedInvestor.total_investi)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Souscriptions</p>
                  <p className="text-xl font-bold text-slate-900">{selectedInvestor.nb_souscriptions}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold text-slate-900">Informations générales</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedInvestor.type.toLowerCase() === 'morale' ? 'Personne Morale' : 'Personne Physique'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Téléphone</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.telephone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Résidence Fiscale</p>
                    <p className="text-sm font-medium text-slate-900">{selectedInvestor.residence_fiscale || '-'}</p>
                  </div>
                </div>
              </div>

              {selectedInvestor.type.toLowerCase() === 'physique' && (
                <div className="space-y-3">
                  <h5 className="font-semibold text-slate-900">Personne Physique</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Nom</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.nom || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Prénom</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.prenom || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date de Naissance</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(selectedInvestor.date_naissance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Lieu de Naissance</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.lieu_naissance || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nationalité</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.nationalite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pièce d'identité</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedInvestor.type_piece_identite || '-'} {selectedInvestor.numero_piece_identite || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedInvestor.type.toLowerCase() === 'morale' && (
                <div className="space-y-3">
                  <h5 className="font-semibold text-slate-900">Personne Morale</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">SIREN</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.siren || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Forme Juridique</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.forme_juridique || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Représentant Légal</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.representant_legal || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date de Création</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(selectedInvestor.date_creation)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Capital Social</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedInvestor.capital_social ? formatCurrency(selectedInvestor.capital_social) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Numéro RCS</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.numero_rcs || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h5 className="font-semibold text-slate-900">Adresse</h5>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Adresse</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedInvestor.adresse || selectedInvestor.siege_social || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Code Postal</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.code_postal || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Ville</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.ville || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pays</p>
                      <p className="text-sm font-medium text-slate-900">{selectedInvestor.pays || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedInvestor && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Modifier l'investisseur</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom / Raison Sociale *</label>
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
                    type="text"
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
