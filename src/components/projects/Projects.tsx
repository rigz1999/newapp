import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FolderOpen, Plus, Layers, Search, Eye, Users, X, Trash2 } from 'lucide-react';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { CardSkeleton } from '../common/Skeleton';
import { ConfirmModal } from '../common/Modals';
import { toast } from '../../utils/toast';
import { isValidSIREN } from '../../utils/validators';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { formatCurrency, formatMontantDisplay } from '../../utils/formatters';

interface ProjectWithStats {
  id: string;
  projet: string;
  emetteur: string;
  representant_masse: string | null;
  email_rep_masse: string | null;
  created_at: string;
  tranches_count: number;
  total_leve: number;
  investisseurs_count: number;
}

interface ProjectsProps {
  organization: { id: string; name: string; role: string };
}

export function Projects({ organization }: ProjectsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const montantRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Advanced filters
  const advancedFilters = useAdvancedFilters({
    persistKey: 'projects-filters',
  });

  // États identiques au Dashboard
  const [newProjectData, setNewProjectData] = useState({
    projet: '',
    type: 'obligations_simples',
    taux_interet: '',
    montant_global_eur: '',
    periodicite_coupon: '',
    maturite_mois: '',
    base_interet: '360',
    emetteur: '',
    siren_emetteur: '',
    nom_representant: '',
    prenom_representant: '',
    email_representant: '',
    representant_masse: '',
    email_rep_masse: '',
    telephone_rep_masse: '',
  });

  const [sirenError, setSirenError] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // For superadmin: organization selection
  const isSuperAdmin = organization.id === 'admin';
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  useEffect(() => {
    // Clear legacy advanced filters from localStorage
    const filterKey = 'projects-filters';
    const stored = localStorage.getItem(filterKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Clear multiSelect filters if they exist
        if (parsed.filters?.multiSelect?.length > 0) {
          parsed.filters.multiSelect = [];
          localStorage.setItem(filterKey, JSON.stringify(parsed));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchProjects();
    };
    loadData();
    return () => {
      isMounted = false;
      setProjects([]);
    };
  }, [organization.id]);

  useEffect(() => {
    const createParam = searchParams.get('create');
    console.log('[Projects] URL param create:', createParam);
    if (createParam === 'true') {
      console.log('[Projects] Opening create modal');
      setShowCreateModal(true);
    }
  }, [searchParams]);

  // Fetch organizations for superadmin
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchOrganizations = async () => {
        const { data } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name', { ascending: true });
        setOrganizations(data || []);
      };
      fetchOrganizations();
    }
  }, [isSuperAdmin]);

  // ESC key handler for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) {
        resetNewProjectForm();
        setShowCreateModal(false);
      }
    };

    if (showCreateModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showCreateModal]);

  // Validate SIREN whenever it changes
  useEffect(() => {
    if (newProjectData.siren_emetteur && newProjectData.siren_emetteur.length === 9) {
      setSirenError(
        isValidSIREN(newProjectData.siren_emetteur) ? '' : 'SIREN invalide (9 chiffres + clé Luhn).'
      );
    } else if (newProjectData.siren_emetteur) {
      setSirenError('');
    }
  }, [newProjectData.siren_emetteur]);

  // Apply search filter
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (advancedFilters.filters.search) {
      const term = advancedFilters.filters.search.toLowerCase();
      filtered = filtered.filter(project =>
        project.projet.toLowerCase().includes(term) ||
        project.emetteur.toLowerCase().includes(term) ||
        (project.representant_masse && project.representant_masse.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [projects, advancedFilters.filters.search]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [projectsRes, tranchesRes, subscriptionsRes] = await Promise.all([
        supabase.from('projets').select('*').order('created_at', { ascending: false }),
        supabase.from('tranches').select('id, projet_id'),
        supabase.from('souscriptions').select('montant_investi, investisseur_id, tranche:tranches!inner(projet_id)')
      ]);

      const projectsData = projectsRes.data || [];
      const tranchesData = tranchesRes.data || [];
      const subscriptionsData = subscriptionsRes.data || [];

      const projectsWithStats = projectsData.map((project: any) => {
        const projectTranches = tranchesData.filter((t: any) => t.projet_id === project.id);
        const projectSubscriptions = subscriptionsData.filter((s: any) => s.tranche?.projet_id === project.id);
        const totalLeve = projectSubscriptions.reduce((sum: number, sub: any) => sum + (Number(sub.montant_investi) || 0), 0);
        const uniqueInvestors = new Set(projectSubscriptions.map((s: any) => s.investisseur_id)).size;

        return {
          ...project,
          tranches_count: projectTranches.length,
          total_leve: totalLeve,
          investisseurs_count: uniqueInvestors,
        };
      });

      setProjects(projectsWithStats);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeletingProject(true);
    try {
      const { error } = await supabase
        .from('projets')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      toast.success('Projet supprimé avec succès !');

      // Close modal and reset state
      setShowDeleteModal(false);
      setProjectToDelete(null);

      // Refresh project list
      await fetchProjects();
      triggerCacheInvalidation();
    } catch (err: any) {
      console.error('Erreur lors de la suppression du projet:', err);
      toast.error(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setDeletingProject(false);
    }
  };

  // Fonction identique au Dashboard
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newProjectData.siren_emetteur && !isValidSIREN(newProjectData.siren_emetteur)) {
      setSirenError('SIREN invalide (9 chiffres + clé Luhn).');
      return;
    }

    setCreatingProject(true);

    try {
      // Parse numeric fields
      const tauxValue = newProjectData.taux_interet && newProjectData.taux_interet.trim() !== ''
        ? parseFloat(newProjectData.taux_interet)
        : null;
      const montantGlobal = newProjectData.montant_global_eur
        ? parseInt(newProjectData.montant_global_eur.replace(/\s/g, ''))
        : null;
      const maturite = newProjectData.maturite_mois
        ? parseInt(newProjectData.maturite_mois)
        : null;
      const baseInteret = newProjectData.base_interet
        ? parseInt(newProjectData.base_interet)
        : 360;

      const projectToCreate: any = {
        projet: newProjectData.projet,
        type: newProjectData.type || null,
        emetteur: newProjectData.emetteur,
        siren_emetteur: newProjectData.siren_emetteur || null,
        nom_representant: newProjectData.nom_representant || null,
        prenom_representant: newProjectData.prenom_representant || null,
        email_representant: newProjectData.email_representant || null,
        representant_masse: newProjectData.representant_masse || null,
        email_rep_masse: newProjectData.email_rep_masse || null,
        telephone_rep_masse: newProjectData.telephone_rep_masse || null,
        taux_interet: tauxValue,
        taux_nominal: tauxValue,
        montant_global_eur: montantGlobal,
        periodicite_coupons: newProjectData.periodicite_coupon || null,
        maturite_mois: maturite,
        duree_mois: maturite,
        base_interet: baseInteret,
      };

      // Determine org_id based on user type
      if (isSuperAdmin) {
        // Superadmin: use selected organization (or null if none selected)
        projectToCreate.org_id = selectedOrgId || null;
      } else {
        // Regular user: automatically assign to their organization
        projectToCreate.org_id = organization.id;
      }

      const { data: _data, error } = await supabase
        .from('projets')
        .insert([projectToCreate] as never)
        .select()
        .single();

      if (error) throw error;

      // Invalidate dashboard cache since new project affects stats
      triggerCacheInvalidation(organization.id);

      toast.success('Projet créé avec succès !');
      setShowCreateModal(false);
      resetNewProjectForm();
      fetchProjects(); // Refresh la liste
    } catch (err: any) {
      toast.error('Erreur lors de la création du projet: ' + err.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const resetNewProjectForm = () => {
    setNewProjectData({
      projet: '',
      type: 'obligations_simples',
      taux_interet: '',
      montant_global_eur: '',
      periodicite_coupon: '',
      maturite_mois: '',
      base_interet: '360',
      emetteur: '',
      siren_emetteur: '',
      nom_representant: '',
      prenom_representant: '',
      email_representant: '',
      representant_masse: '',
      email_rep_masse: '',
      telephone_rep_masse: '',
    });
    setSirenError('');
    setSelectedOrgId('');
  };

  const isFormValid = newProjectData.projet.trim() !== '' &&
    newProjectData.emetteur.trim() !== '' &&
    newProjectData.siren_emetteur.trim() !== '' &&
    !sirenError &&
    newProjectData.prenom_representant.trim() !== '' &&
    newProjectData.nom_representant.trim() !== '' &&
    newProjectData.email_representant.trim() !== '' &&
    newProjectData.representant_masse.trim() !== '' &&
    newProjectData.email_rep_masse.trim() !== '';

  const moveCaretBeforeEuro = () => {
    const input = montantRef.current;
    if (!input) return;
    const val = input.value;
    const euroIndex = val.lastIndexOf('€');
    if (euroIndex > 0) {
      const pos = euroIndex - 1;
      input.setSelectionRange(pos, pos);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FolderOpen className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tous les Projets</h1>
            <p className="text-slate-600">{projects.length} projet{projects.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-finixar-action-create text-white px-4 py-2 rounded-lg hover:bg-finixar-action-create-hover transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Projet</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un projet par nom ou émetteur..."
              value={advancedFilters.filters.search}
              onChange={(e) => advancedFilters.setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            />
          </div>
          {advancedFilters.filters.search && (
            <button
              onClick={() => advancedFilters.setSearch('')}
              className="px-4 py-3 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {advancedFilters.filters.search ? 'Aucun projet trouvé' : 'Aucun projet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {advancedFilters.filters.search ? 'Essayez avec d\'autres termes de recherche' : 'Créez votre premier projet pour commencer'}
          </p>
          {!advancedFilters.filters.search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Créer un projet</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-finixar-brand-blue p-3 rounded-lg flex-shrink-0">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{project.projet}</h3>
                    <p className="text-sm text-slate-600 truncate">{project.emetteur}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Tranches</span>
                    <span className="font-semibold text-slate-900">{project.tranches_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Montant levé</span>
                    <span className="font-semibold text-finixar-green">{formatCurrency(project.total_leve)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Investisseurs
                    </span>
                    <span className="font-semibold text-slate-900">{project.investisseurs_count}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3 flex gap-2 border-t border-slate-200">
                <button
                  onClick={() => navigate(`/projets/${project.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-finixar-action-view text-white text-sm font-medium rounded-lg hover:bg-finixar-action-view-hover transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Voir détails
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id, project.projet);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  title="Supprimer le projet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EXACT DU DASHBOARD */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetNewProjectForm();
              setShowCreateModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Nouveau Projet</h3>
                <p className="text-sm text-slate-600 mt-1">Créer un nouveau projet obligataire</p>
              </div>
              <button
                onClick={() => {
                  resetNewProjectForm();
                  setShowCreateModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              <form onSubmit={handleCreateProject} className="p-6 bg-white" autoComplete="off">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="projet" className="block text-sm font-medium text-slate-900 mb-2">
                      Nom du projet <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="projet"
                      name="project_title"
                      type="text"
                      required
                      autoComplete="nope"
                      value={newProjectData.projet}
                      onChange={(e) => setNewProjectData({ ...newProjectData, projet: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: GreenTech 2025"
                      data-form-type="other"
                    />
                  </div>

                  {/* Organization selection for superadmin */}
                  {isSuperAdmin && (
                    <div>
                      <label htmlFor="organization" className="block text-sm font-medium text-slate-900 mb-2">
                        Organisation
                      </label>
                      <select
                        id="organization"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="">Aucune organisation (visible par tous)</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-600">
                        Si aucune organisation n'est sélectionnée, le projet sera visible par tous les utilisateurs
                      </p>
                    </div>
                  )}

                  {/* Champs financiers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-slate-900 mb-2">
                        Type d'obligations <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="type"
                        required
                        value={newProjectData.type}
                        onChange={(e) => setNewProjectData({ ...newProjectData, type: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="obligations_simples">Obligations Simples</option>
                        <option value="obligations_convertibles">Obligations Convertibles</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="taux" className="block text-sm font-medium text-slate-900 mb-2">
                        Taux d'intérêt (%) <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="taux"
                        name="interest_rate_field"
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        autoComplete="off"
                        value={newProjectData.taux_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, taux_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 8.50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="maturite" className="block text-sm font-medium text-slate-900 mb-2">
                        Maturité (mois) <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="maturite"
                        name="maturity_months_field"
                        type="number"
                        required
                        min="1"
                        autoComplete="off"
                        value={newProjectData.maturite_mois}
                        onChange={(e) => setNewProjectData({ ...newProjectData, maturite_mois: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 60 (5 ans)"
                      />
                      <p className="mt-1 text-xs text-slate-600">Durée totale en mois</p>
                    </div>

                    <div>
                      <label htmlFor="base_interet" className="block text-sm font-medium text-slate-900 mb-2">
                        Base de calcul <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="base_interet"
                        required
                        value={newProjectData.base_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, base_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="360">360 jours (30/360) - Standard</option>
                        <option value="365">365 jours (Exact/365)</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-600">💡 Standard: 360 jours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="montant" className="block text-sm font-medium text-slate-900 mb-2">
                        Montant global à lever (€) <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="montant"
                        name="montant_global"
                        ref={montantRef}
                        type="text"
                        required
                        autoComplete="off"
                        inputMode="numeric"
                        value={formatMontantDisplay(newProjectData.montant_global_eur)}
                        onInput={(e: any) => {
                          // onInput catches browser autocomplete better than onChange
                          const value = e.target.value;
                          const digitsOnly = value.replace(/\D/g, '');
                          if (digitsOnly !== newProjectData.montant_global_eur) {
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: digitsOnly
                            }));
                          }
                        }}
                        onChange={(e) => {
                          // Fallback for browsers that use onChange for autocomplete
                          const value = e.target.value;
                          const digitsOnly = value.replace(/\D/g, '');
                          if (digitsOnly !== newProjectData.montant_global_eur) {
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: digitsOnly
                            }));
                          }
                        }}
                        onFocus={moveCaretBeforeEuro}
                        onClick={moveCaretBeforeEuro}
                        onBeforeInput={(e: any) => {
                          const data = e.data as string | null;
                          const inputType = e.inputType as string;

                          // Allow insertReplacementText (autocomplete) and multi-character insertions
                          if (inputType === 'insertReplacementText' || (inputType === 'insertText' && data && data.length > 1)) {
                            return; // Let onInput/onChange handle autocomplete
                          }

                          if (inputType === 'insertText' && data && /^\d$/.test(data)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + data
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }
                          if (inputType === 'insertText') {
                            e.preventDefault();
                            return;
                          }
                        }}
                        onKeyDown={(e) => {
                          const navKeys = ['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
                          if (navKeys.includes(e.key)) return;

                          if (/^\d$/.test(e.key)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + e.key
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: prev.montant_global_eur.slice(0, -1)
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          e.preventDefault();
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const clipboardData = e.clipboardData;
                          const text = clipboardData?.getData('text') || '';
                          const digits = text.replace(/\D/g, '');
                          setNewProjectData(prev => ({
                            ...prev,
                            montant_global_eur: digits
                          }));
                          requestAnimationFrame(moveCaretBeforeEuro);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 1 500 000 €"
                      />
                    </div>

                    <div>
                      <label htmlFor="periodicite" className="block text-sm font-medium text-slate-900 mb-2">
                        Périodicité du coupon <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="periodicite"
                        required
                        value={newProjectData.periodicite_coupon}
                        onChange={(e) => setNewProjectData({ ...newProjectData, periodicite_coupon: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="" disabled>Choisir…</option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestriel">Trimestriel</option>
                        <option value="semestriel">Semestriel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emetteur" className="block text-sm font-medium text-slate-900 mb-2">
                      Émetteur <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="emetteur"
                      name="company_issuer"
                      type="text"
                      required
                      autoComplete="nope"
                      value={newProjectData.emetteur}
                      onChange={(e) => setNewProjectData({ ...newProjectData, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: GreenTech SAS"
                      data-form-type="other"
                    />
                  </div>

                  <div>
                    <label htmlFor="siren" className="block text-sm font-medium text-slate-900 mb-2">
                      SIREN de l'émetteur <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="siren"
                      name="company_siren"
                      type="text"
                      required
                      autoComplete="nope"
                      pattern="^\d{9}$"
                      title="Le SIREN doit comporter exactement 9 chiffres."
                      value={newProjectData.siren_emetteur}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const digits = pastedText.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                      }}
                      aria-invalid={!!sirenError}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue ${
                        sirenError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Ex: 123456789"
                      maxLength={9}
                      inputMode="numeric"
                      data-form-type="other"
                    />
                    {sirenError && (
                      <p className="mt-1 text-sm text-finixar-red">{sirenError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prenom" className="block text-sm font-medium text-slate-900 mb-2">
                        Prénom du représentant <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="prenom"
                        name="rep_given_name"
                        type="text"
                        required
                        autoComplete="nope"
                        value={newProjectData.prenom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, prenom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Jean"
                        data-form-type="other"
                      />
                    </div>
                    <div>
                      <label htmlFor="nom" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="nom"
                        name="rep_family_name"
                        type="text"
                        required
                        autoComplete="nope"
                        value={newProjectData.nom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, nom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Dupont"
                        data-form-type="other"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emailrep" className="block text-sm font-medium text-slate-900 mb-2">
                      Email du représentant <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="emailrep"
                      name="rep_contact_email"
                      type="email"
                      required
                      autoComplete="nope"
                      value={newProjectData.email_representant}
                      onChange={(e) => setNewProjectData({ ...newProjectData, email_representant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: jean.dupont@example.com"
                      data-form-type="other"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Représentant de la masse</h4>

                    <div>
                      <label htmlFor="repmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant de la masse <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="repmasse"
                        name="masse_rep_name"
                        type="text"
                        required
                        autoComplete="nope"
                        value={newProjectData.representant_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, representant_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Cabinet Lefevre"
                        data-form-type="other"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="emailmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Email du représentant de la masse <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="emailmasse"
                        name="masse_contact_email"
                        type="email"
                        required
                        autoComplete="nope"
                        value={newProjectData.email_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, email_rep_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: contact@cabinet-lefevre.fr"
                        data-form-type="other"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="telmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Téléphone du représentant de la masse
                      </label>
                      <input
                        id="telmasse"
                        name="masse_phone"
                        type="tel"
                        pattern="[0-9]*"
                        autoComplete="nope"
                        value={newProjectData.telephone_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, telephone_rep_masse: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 0123456789"
                        maxLength={10}
                        data-form-type="other"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { resetNewProjectForm(); setShowCreateModal(false); }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={creatingProject}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProject || !isFormValid}
                    className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {creatingProject ? 'Création...' : 'Créer le projet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal && !!projectToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setProjectToDelete(null);
        }}
        onConfirm={confirmDeleteProject}
        type="danger"
        title="Supprimer le projet"
        message={
          projectToDelete
            ? `Êtes-vous sûr de vouloir supprimer le projet "${projectToDelete.name}" ?\n\nCette action supprimera également toutes les tranches, souscriptions et coupons associés.\n\n⚠️ Cette action est irréversible.`
            : ''
        }
        confirmText={deletingProject ? "Suppression..." : "Supprimer définitivement"}
        cancelText="Annuler"
        isLoading={deletingProject}
      />
    </div>
  );
}

export default Projects;