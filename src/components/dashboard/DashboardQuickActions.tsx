import { Plus, FileText, Euro, Download } from 'lucide-react';

interface DashboardQuickActionsProps {
  onNewProject: () => void;
  onNewTranche: () => void;
  onNewPayment: () => void;
  onExport: () => void;
}

export function DashboardQuickActions({
  onNewProject,
  onNewTranche,
  onNewPayment,
  onExport,
}: DashboardQuickActionsProps) {
  return (
    <div className="absolute right-0 top-full mt-1 z-40 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
      <button
        onClick={onNewProject}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-finixar-brand-blue p-1.5 rounded-md">
          <Plus className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Nouveau projet</p>
          <p className="text-xs text-slate-500">Créer un projet</p>
        </div>
      </button>

      <button
        onClick={onNewTranche}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-finixar-action-create p-1.5 rounded-md">
          <FileText className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Nouvelle tranche</p>
          <p className="text-xs text-slate-500">Ajouter une tranche</p>
        </div>
      </button>

      <button
        onClick={onNewPayment}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-amber-600 p-1.5 rounded-md">
          <Euro className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Nouveau paiement</p>
          <p className="text-xs text-slate-500">Enregistrer un paiement</p>
        </div>
      </button>

      <div className="border-t border-slate-100 my-1" />

      <button
        onClick={onExport}
        className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="bg-slate-600 p-1.5 rounded-md">
          <Download className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Exporter synthèse</p>
          <p className="text-xs text-slate-500">Télécharger rapport</p>
        </div>
      </button>
    </div>
  );
}
