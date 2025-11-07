import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FolderOpen, Plus, Layers, Search, Eye, Users, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { AlertModal } from '../common/Modals';
import { CardSkeleton } from '../common/Skeleton';
import { formatCurrency, formatMontantDisplay, groupDigitsWithSpaces } from '../../utils/formatters';
import { isValidSIREN } from '../../utils/validators';
import { useAdvancedFilters } from '../../hooks/useAdvancedFilters';
import { MultiSelectFilter } from '../filters/MultiSelectFilter';
import { FilterPresets } from '../filters/FilterPresets';

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  useEffect(() => {
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
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  // Extract unique values for filters
  const uniqueEmetteurs = useMemo(() =>
    Array.from(new Set(projects.map(p => p.emetteur).filter(Boolean))).map(e => ({ value: e, label: e })),
    [projects]
  );

  const uniqueRepresentants = useMemo(() =>
    Array.from(new Set(projects.map(p => p.representant_masse).filter(Boolean))).map(r => ({ value: r!, label: r! })),
    [projects]
  );

  // Apply filters
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

    // Multi-select emetteur filter
    const emetteurFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'emetteur');
    if (emetteurFilter && emetteurFilter.values.length > 0) {
      filtered = filtered.filter(p => emetteurFilter.values.includes(p.emetteur));
    }

    // Multi-select representant filter
    const representantFilter = advancedFilters.filters.multiSelect.find(f => f.field === 'representant');
    if (representantFilter && representantFilter.values.length > 0) {
      filtered = filtered.filter(p => p.representant_masse && representantFilter.values.includes(p.representant_masse));
    }

    return filtered;
  }, [projects, advancedFilters.filters]);

  // Count active filters
  const activeFiltersCount = useMemo(() => [
    advancedFilters.filters.search ? 1 : 0,
    ...advancedFilters.filters.multiSelect.map(f => f.values.length > 0 ? 1 : 0)
  ].reduce((a, b) => a + b, 0), [advancedFilters.filters]);

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

      const projectsWithStats = projectsData.map((project) => {
        const projectTranches = tranchesData.filter(t => t.projet_id === project.id);
        const projectSubscriptions = subscriptionsData.filter((s: any) => s.tranche?.projet_id === project.id);
        const totalLeve = projectSubscriptions.reduce((sum, sub) => sum + (Number(sub.montant_investi) || 0), 0);
        const uniqueInvestors = new Set(projectSubscriptions.map(s => s.investisseur_id)).size;

        return {
          ...project,
          tranches_count: projectTranches.length,
          total_leve: totalLeve,
          investisseurs_count: uniqueInvestors,
        };
      });

      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Projects: Error', error);
    } finally {
      setLoading(false);
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
      const projectToCreate: any = {
        projet: newProjectData.projet,
        type: newProjectData.type || null,
        emetteur: newProjectData.emetteur,
        // Keep SIREN as string to preserve leading zeros (e.g., "012345678")
        siren_emetteur: newProjectData.siren_emetteur || null,
        nom_representant: newProjectData.nom_representant || null,
        prenom_representant: newProjectData.prenom_representant || null,
        email_representant: newProjectData.email_representant || null,
        representant_masse: newProjectData.representant_masse || null,
        email_rep_masse: newProjectData.email_rep_masse || null,
        telephone_rep_masse: newProjectData.telephone_rep_masse || null,
      };

      // Champs optionnels
      if (newProjectData.taux_interet) {
        projectToCreate.taux_nominal = parseFloat(newProjectData.taux_interet);
      }
      if (newProjectData.montant_global_eur) {
        projectToCreate.montant_global = parseInt(newProjectData.montant_global_eur.replace(/\s/g, ''));
      }
      if (newProjectData.periodicite_coupon) {
        projectToCreate.periodicite_coupons = newProjectData.periodicite_coupon;
      }
      if (newProjectData.maturite_mois) {
        projectToCreate.maturite_mois = parseInt(newProjectData.maturite_mois);
      }
      if (newProjectData.base_interet) {
        projectToCreate.base_interet = parseInt(newProjectData.base_interet);
      }

      const { data, error } = await supabase
        .from('projets')
        .insert([projectToCreate])
        .select()
        .single();

      if (error) throw error;

      // Invalidate dashboard cache since new project affects stats
      triggerCacheInvalidation(organization.id);

      setShowCreateModal(false);
      resetNewProjectForm();
      fetchProjects(); // Refresh la liste
    } catch (err: any) {
      console.error('Error creating project:', err);
      alert('Erreur lors de la création du projet: ' + err.message);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tous les Projets</h2>
          <p className="text-slate-600 mt-1">{projects.length} projet{projects.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau Projet</span>
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        {/* Basic Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, émetteur, représentant..."
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

            {/* Multi-select Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MultiSelectFilter
                label="Émetteurs"
                options={uniqueEmetteurs}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'emetteur')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('emetteur', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('emetteur', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('emetteur')}
                placeholder="Sélectionner des émetteurs..."
              />

              <MultiSelectFilter
                label="Représentants de masse"
                options={uniqueRepresentants}
                selectedValues={
                  advancedFilters.filters.multiSelect.find(f => f.field === 'representant')?.values || []
                }
                onAdd={(value) => advancedFilters.addMultiSelectFilter('representant', value)}
                onRemove={(value) => advancedFilters.removeMultiSelectFilter('representant', value)}
                onClear={() => advancedFilters.clearMultiSelectFilter('representant')}
                placeholder="Sélectionner des représentants..."
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
            {activeFiltersCount > 0 ? 'Aucun projet trouvé' : 'Aucun projet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {activeFiltersCount > 0 ? 'Essayez avec d\'autres filtres' : 'Créez votre premier projet pour commencer'}
          </p>
          {activeFiltersCount === 0 && (
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
                  <div className="bg-blue-500 p-3 rounded-lg flex-shrink-0">
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
                    <span className="font-semibold text-green-600">{formatCurrency(project.total_leve)}</span>
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
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EXACT DU DASHBOARD */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
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

            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleCreateProject} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="projet" className="block text-sm font-medium text-slate-900 mb-2">
                      Nom du projet <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="projet"
                      type="text"
                      required
                      value={newProjectData.projet}
                      onChange={(e) => setNewProjectData({ ...newProjectData, projet: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech 2025"
                    />
                  </div>

                  {/* Champs financiers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-slate-900 mb-2">
                        Type d'obligations <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="type"
                        required
                        value={newProjectData.type}
                        onChange={(e) => setNewProjectData({ ...newProjectData, type: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="obligations_simples">Obligations Simples</option>
                        <option value="obligations_convertibles">Obligations Convertibles</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="taux" className="block text-sm font-medium text-slate-900 mb-2">
                        Taux d'intérêt (%) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="taux"
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        value={newProjectData.taux_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, taux_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 8.50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="maturite" className="block text-sm font-medium text-slate-900 mb-2">
                        Maturité (mois) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="maturite"
                        type="number"
                        required
                        min="1"
                        value={newProjectData.maturite_mois}
                        onChange={(e) => setNewProjectData({ ...newProjectData, maturite_mois: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 60 (5 ans)"
                      />
                      <p className="mt-1 text-xs text-slate-600">Durée totale en mois</p>
                    </div>

                    <div>
                      <label htmlFor="base_interet" className="block text-sm font-medium text-slate-900 mb-2">
                        Base de calcul <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="base_interet"
                        required
                        value={newProjectData.base_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, base_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        Montant global à lever (€) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="montant"
                        ref={montantRef}
                        type="text"
                        required
                        inputMode="numeric"
                        value={formatMontantDisplay(newProjectData.montant_global_eur)}
                        onChange={() => {}}
                        onFocus={moveCaretBeforeEuro}
                        onClick={moveCaretBeforeEuro}
                        onBeforeInput={(e: any) => {
                          const data = e.data as string | null;
                          const inputType = e.inputType as string;

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
                          const clipboardData = e.clipboardData || (window as ClipboardEvent).clipboardData;
                          const text = clipboardData?.getData('text') || '';
                          const digits = text.replace(/\D/g, '');
                          setNewProjectData(prev => ({
                            ...prev,
                            montant_global_eur: digits
                          }));
                          requestAnimationFrame(moveCaretBeforeEuro);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 1 500 000 €"
                      />
                    </div>

                    <div>
                      <label htmlFor="periodicite" className="block text-sm font-medium text-slate-900 mb-2">
                        Périodicité du coupon <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="periodicite"
                        required
                        value={newProjectData.periodicite_coupon}
                        onChange={(e) => setNewProjectData({ ...newProjectData, periodicite_coupon: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Choisir…</option>
                        <option value="annuel">Annuel</option>
                        <option value="semestriel">Semestriel</option>
                        <option value="trimestriel">Trimestriel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emetteur" className="block text-sm font-medium text-slate-900 mb-2">
                      Émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="emetteur"
                      type="text"
                      required
                      value={newProjectData.emetteur}
                      onChange={(e) => setNewProjectData({ ...newProjectData, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech SAS"
                    />
                  </div>

                  <div>
                    <label htmlFor="siren" className="block text-sm font-medium text-slate-900 mb-2">
                      SIREN de l'émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="siren"
                      type="text"
                      required
                      pattern="^\d{9}$"
                      title="Le SIREN doit comporter exactement 9 chiffres."
                      value={newProjectData.siren_emetteur}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                        setSirenError('');
                      }}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setSirenError(isValidSIREN(v) ? '' : 'SIREN invalide (9 chiffres + clé Luhn).');
                      }}
                      aria-invalid={!!sirenError}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        sirenError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Ex: 123456789"
                      maxLength={9}
                      inputMode="numeric"
                    />
                    {sirenError && (
                      <p className="mt-1 text-sm text-red-600">{sirenError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prenom" className="block text-sm font-medium text-slate-900 mb-2">
                        Prénom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="prenom"
                        type="text"
                        required
                        value={newProjectData.prenom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, prenom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Jean"
                      />
                    </div>
                    <div>
                      <label htmlFor="nom" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="nom"
                        type="text"
                        required
                        value={newProjectData.nom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, nom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emailrep" className="block text-sm font-medium text-slate-900 mb-2">
                      Email du représentant <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="emailrep"
                      type="email"
                      required
                      value={newProjectData.email_representant}
                      onChange={(e) => setNewProjectData({ ...newProjectData, email_representant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: jean.dupont@example.com"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Représentant de la masse</h4>

                    <div>
                      <label htmlFor="repmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="repmasse"
                        type="text"
                        required
                        value={newProjectData.representant_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, representant_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Cabinet Lefevre"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="emailmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Email du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="emailmasse"
                        type="email"
                        required
                        value={newProjectData.email_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, email_rep_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: contact@cabinet-lefevre.fr"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="telmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Téléphone du représentant de la masse
                      </label>
                      <input
                        id="telmasse"
                        type="tel"
                        pattern="[0-9]*"
                        value={newProjectData.telephone_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, telephone_rep_masse: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 0123456789"
                        maxLength={10}
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {creatingProject ? 'Création...' : 'Créer le projet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;