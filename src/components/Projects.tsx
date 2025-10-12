import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { FolderOpen, Plus, Layers, Search, Edit, Trash2, Eye, Users } from 'lucide-react';

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
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onSelectProject: (projectId: string) => void;
  openCreateModal?: boolean;
  onModalClose?: () => void;
}

export function Projects({ organization, onLogout, onNavigate, onSelectProject, openCreateModal = false, onModalClose }: ProjectsProps) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(openCreateModal);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProject, setNewProject] = useState({
    project_name: '',
    emetteur: '',
    representant_masse: '',
    rep_masse_email: '',
    rep_masse_tel: '',
    manager_email: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [organization.id]);

  useEffect(() => {
    if (openCreateModal) {
      setShowCreateModal(true);
    }
  }, [openCreateModal]);

  useEffect(() => {
    const filtered = projects.filter(project =>
      project.projet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.emetteur.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchTerm, projects]);

  const fetchProjects = async () => {
    setLoading(true);

    const { data: projectsData } = await supabase
      .from('projets')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsData) {
      const projectsWithStats = await Promise.all(
        projectsData.map(async (project) => {
          const { count: tranchesCount } = await supabase
            .from('tranches')
            .select('*', { count: 'exact', head: true })
            .eq('projet_id', project.id);

          const { data: subscriptions } = await supabase
            .from('souscriptions')
            .select('montant_investi, investisseur_id')
            .eq('projet_id', project.id);

          const totalLeve = subscriptions?.reduce((sum, sub) => sum + (Number(sub.montant_investi) || 0), 0) || 0;
          const uniqueInvestors = new Set(subscriptions?.map(s => s.investisseur_id)).size;

          return {
            ...project,
            tranches_count: tranchesCount || 0,
            total_leve: totalLeve,
            investisseurs_count: uniqueInvestors,
          };
        })
      );

      setProjects(projectsWithStats);
      setFilteredProjects(projectsWithStats);
    }

    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const { error } = await supabase.from('projets').insert({
      projet: newProject.project_name,
      emetteur: newProject.emetteur,
      representant_masse: newProject.representant_masse,
      email_rep_masse: newProject.rep_masse_email,
    });

    if (!error) {
      setShowCreateModal(false);
      onModalClose?.();
      setNewProject({
        project_name: '',
        emetteur: '',
        representant_masse: '',
        rep_masse_email: '',
        rep_masse_tel: '',
        manager_email: '',
      });
      fetchProjects();
    }
    setCreating(false);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    onModalClose?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="projects"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto ml-64">
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

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom ou émetteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchTerm ? 'Aucun projet trouvé' : 'Aucun projet'}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchTerm ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier projet pour commencer'}
              </p>
              {!searchTerm && (
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
                        <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
                          {project.projet}
                        </h3>
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
                      onClick={() => onSelectProject(project.id)}
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

          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900">Nouveau Projet</h3>
                </div>

                <form onSubmit={handleCreate} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom du projet *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProject.project_name}
                      onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Ex: Émission 2025-A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Émetteur *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProject.emetteur}
                      onChange={(e) => setNewProject({ ...newProject, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Nom de l'émetteur"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Représentant de la masse
                    </label>
                    <input
                      type="text"
                      value={newProject.representant_masse}
                      onChange={(e) =>
                        setNewProject({ ...newProject, representant_masse: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Nom du représentant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email du représentant
                    </label>
                    <input
                      type="email"
                      value={newProject.rep_masse_email}
                      onChange={(e) => setNewProject({ ...newProject, rep_masse_email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="email@exemple.fr"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {creating ? 'Création...' : 'Créer le projet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
