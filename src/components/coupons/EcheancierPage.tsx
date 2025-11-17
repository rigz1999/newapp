import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EcheancierContent } from './EcheancierContent';

export function EcheancierPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">ID du projet manquant</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/projets/${projectId}`)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Retour au projet"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Échéancier Complet</h1>
              <p className="text-sm text-slate-600">Vue détaillée des paiements de coupons</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
          <EcheancierContent
            projectId={projectId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            isFullPage={true}
          />
        </div>
      </div>
    </div>
  );
}
