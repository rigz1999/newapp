import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderOpen, Plus, Layers, Search, Eye, Users, Trash2 } from 'lucide-react';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { CardSkeleton } from '../common/Skeleton';
import { ConfirmModal } from '../common/Modals';
import { toast } from '../../utils/toast';
import { formatCurrency } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import { logAuditEvent } from '../../utils/auditLogger';
import { supabase } from '../../lib/supabase';
import { useProjects } from '../../hooks/useProjects';
import { CreateProjectModal } from './CreateProjectModal';

interface ProjectsProps {
  organization: { id: string; name: string; role: string };
}

export function Projects({ organization }: ProjectsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { projects, filteredProjects, loading, advancedFilters, fetchProjects } = useProjects(
    organization.id
  );

  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) {
      return;
    }

    setDeletingProject(true);
    try {
      const { error } = await supabase.from('projets').delete().eq('id', projectToDelete.id);

      if (error) {
        throw error;
      }

      logAuditEvent({
        action: 'deleted',
        entityType: 'projet',
        entityId: projectToDelete.id,
        description: `a supprimé le projet "${projectToDelete.name}"`,
        orgId: organization.id,
        metadata: { projet: projectToDelete.name },
      });

      toast.success('Projet supprimé avec succès !');

      setShowDeleteModal(false);
      setProjectToDelete(null);

      await fetchProjects();
      triggerCacheInvalidation();
    } catch (err: unknown) {
      logger.error('Erreur lors de la suppression du projet:', err);
      toast.error(
        `Erreur lors de la suppression: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setDeletingProject(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-5 xl:px-6 py-4">
      {/* density-v3 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tous les projets</h1>
            <p className="text-slate-600">
              {projects.length} projet{projects.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          aria-label="Créer un nouveau projet"
          className="flex items-center gap-2 bg-finixar-action-create text-white px-4 py-2 rounded-lg hover:bg-finixar-action-create-hover transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau projet</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un projet par nom ou émetteur..."
              value={advancedFilters.filters.search}
              onChange={e => advancedFilters.setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue text-sm"
            />
          </div>
          {advancedFilters.filters.search && (
            <button
              onClick={() => advancedFilters.setSearch('')}
              className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {advancedFilters.filters.search ? 'Aucun projet trouvé' : 'Aucun projet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {advancedFilters.filters.search
              ? "Essayez avec d'autres termes de recherche"
              : 'Créez votre premier projet pour commencer'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-finixar-brand-blue p-2 rounded-lg flex-shrink-0">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5 truncate">
                      {project.projet}
                    </h3>
                    <p className="text-sm text-slate-600 truncate">{project.emetteur}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Tranches</span>
                    <span className="font-semibold text-slate-900">{project.tranches_count}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Montant levé</span>
                    <span className="font-semibold text-finixar-green">
                      {formatCurrency(project.total_leve)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Investisseurs
                    </span>
                    <span className="font-semibold text-slate-900">
                      {project.investisseurs_count}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-4 py-2 flex gap-2 border-t border-slate-200">
                <button
                  onClick={() => navigate(`/projets/${project.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-finixar-action-view text-white text-sm font-medium rounded-lg hover:bg-finixar-action-view-hover transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Voir détails
                </button>
                <button
                  onClick={e => {
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          organization={organization}
          onClose={() => {
            setShowCreateModal(false);
            fetchProjects();
          }}
        />
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
        confirmText={deletingProject ? 'Suppression...' : 'Supprimer définitivement'}
        cancelText="Annuler"
        isLoading={deletingProject}
      />
    </div>
  );
}

export default Projects;
