import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { FolderOpen, Plus, Layers } from 'lucide-react';

interface Project {
  id: string;
  projet: string;
  emetteur: string;
  representant_masse: string | null;
  email_rep_masse: string | null;
  created_at: string;
}

interface ProjectsProps {
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onSelectProject: (projectId: string) => void;
}

export function Projects({ organization, onLogout, onNavigate, onSelectProject }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projets')
      .select('*')
      .order('created_at', { ascending: false });

    setProjects(data || []);
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="projects"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Mes projets</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau projet</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun projet</h3>
            <p className="text-slate-600 mb-4">Créez votre premier projet pour commencer</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Créer un projet</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-slate-200 text-left"
              >
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
                {project.representant_masse && (
                  <div className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <p className="font-medium">Représentant: {project.representant_masse}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Nouveau projet</h3>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Téléphone du représentant
                </label>
                <input
                  type="tel"
                  value={newProject.rep_masse_tel}
                  onChange={(e) => setNewProject({ ...newProject, rep_masse_tel: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email du gestionnaire
                </label>
                <input
                  type="email"
                  value={newProject.manager_email}
                  onChange={(e) => setNewProject({ ...newProject, manager_email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="gestionnaire@exemple.fr"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
