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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8 mt-8">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Actions Rapides</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => {
            console.log('[DashboardQuickActions] Nouveau Projet button clicked');
            onNewProject();
          }}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all group border border-blue-200"
        >
          <div className="bg-finixar-brand-blue p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 text-sm">Nouveau Projet</p>
            <p className="text-xs text-slate-600">Créer un projet</p>
          </div>
        </button>

        <button
          onClick={onNewTranche}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg transition-all group border border-emerald-200"
        >
          <div className="bg-finixar-action-create p-2 rounded-lg group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 text-sm">Nouvelle Tranche</p>
            <p className="text-xs text-slate-600">Ajouter une tranche</p>
          </div>
        </button>

        <button
          onClick={onNewPayment}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 rounded-lg transition-all group border border-amber-200"
        >
          <div className="bg-amber-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Euro className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 text-sm">Nouveau paiement</p>
            <p className="text-xs text-slate-600">Téléverser le justificatif</p>
          </div>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-lg transition-all group border border-slate-200"
        >
          <div className="bg-slate-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 text-sm">Exporter Synthèse</p>
            <p className="text-xs text-slate-600">Télécharger rapport</p>
          </div>
        </button>
      </div>
    </div>
  );
}
