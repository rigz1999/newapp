import { Lock, FolderOpen } from 'lucide-react';
import type { Project, Tranche } from './types';

interface PaymentProjectSelectProps {
  projects: Project[];
  tranches: Tranche[];
  selectedProjectId: string;
  selectedTrancheId: string;
  preselectedProjectId?: string;
  preselectedTrancheId?: string;
  displayProjectName?: string;
  displayTrancheName?: string;
  onProjectChange: (projectId: string) => void;
  onTrancheChange: (trancheId: string) => void;
}

export function PaymentProjectSelect({
  projects,
  tranches,
  selectedProjectId,
  selectedTrancheId,
  preselectedProjectId,
  preselectedTrancheId,
  displayProjectName,
  displayTrancheName,
  onProjectChange,
  onTrancheChange,
}: PaymentProjectSelectProps) {
  return (
    <div className="space-y-4">
      {preselectedProjectId && displayProjectName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="status">
          <p className="text-sm text-blue-900 flex items-center gap-2">
            <span className="font-semibold">Projet:</span> {displayProjectName}
            <span className="ml-2 text-blue-600 text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Présélectionné
            </span>
          </p>
        </div>
      )}

      {!preselectedProjectId && (
        <div>
          <label
            htmlFor="payment-project-select"
            className="block text-sm font-semibold text-slate-900 mb-2"
          >
            Projet
          </label>
          <select
            id="payment-project-select"
            value={selectedProjectId}
            onChange={e => onProjectChange(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue bg-white"
            aria-required="true"
          >
            <option value="">Sélectionnez un projet</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.projet}
              </option>
            ))}
          </select>
        </div>
      )}

      {preselectedTrancheId && displayTrancheName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="status">
          <p className="text-sm text-blue-900 flex items-center gap-2">
            <span className="font-semibold">Tranche:</span> {displayTrancheName}
            <span className="ml-2 text-blue-600 text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" aria-hidden="true" />
              Présélectionné
            </span>
          </p>
        </div>
      )}

      {!preselectedTrancheId && (
        <div>
          <label
            htmlFor="payment-tranche-select"
            className="block text-sm font-semibold text-slate-900 mb-2"
          >
            Tranche
          </label>
          <select
            id="payment-tranche-select"
            value={selectedTrancheId}
            onChange={e => onTrancheChange(e.target.value)}
            disabled={!selectedProjectId}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            aria-required="true"
            aria-disabled={!selectedProjectId}
          >
            <option value="">
              {selectedProjectId ? 'Sélectionnez une tranche' : "Sélectionnez d'abord un projet"}
            </option>
            {tranches.map(tranche => (
              <option key={tranche.id} value={tranche.id}>
                {tranche.tranche_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProjectId && tranches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4" role="alert">
          <div className="flex items-start gap-2">
            <FolderOpen
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-yellow-900">Aucune tranche trouvée</p>
              <p className="text-xs text-yellow-700 mt-1">
                Ce projet n'a pas encore de tranches créées.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
