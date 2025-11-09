import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { PaymentProofUpload } from '../payments/PaymentProofUpload';

interface QuickPaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  projet: string;
  emetteur: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
  projet_id: string;
  subscription_count: number;
  total_amount: number;
}

interface Subscription {
  id: string;
  id_souscription: string;
  montant_investi: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
  };
}

export function QuickPaymentModal({ onClose, onSuccess }: QuickPaymentModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTranches(selectedProjectId);
      setSelectedTrancheId('');
      setSubscriptions([]);
    } else {
      setTranches([]);
      setSelectedTrancheId('');
      setSubscriptions([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedTrancheId) {
      fetchSubscriptions(selectedTrancheId);
    } else {
      setSubscriptions([]);
    }
  }, [selectedTrancheId]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projets')
        .select('id, projet, emetteur')
        .order('projet');

      if (error) throw error;
      setProjects(data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchTranches = async (projectId: string) => {
    setLoading(true);
    try {
      const { data: tranchesData, error: tranchesError } = await supabase
        .from('tranches')
        .select('id, tranche_name, projet_id')
        .eq('projet_id', projectId)
        .order('tranche_name');

      if (tranchesError) throw tranchesError;

      const tranchesWithStats = await Promise.all(
        (tranchesData || []).map(async (tranche) => {
          const { data: subs, error: subsError } = await supabase
            .from('souscriptions')
            .select('coupon_net')
            .eq('tranche_id', tranche.id);

          if (subsError) {
            return {
              ...tranche,
              subscription_count: 0,
              total_amount: 0,
            };
          }

          const total = (subs || []).reduce((sum, sub) => sum + (Number(sub.coupon_net) || 0), 0);

          return {
            ...tranche,
            subscription_count: subs?.length || 0,
            total_amount: total,
          };
        })
      );

      setTranches(tranchesWithStats);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async (trancheId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('souscriptions')
        .select(`
          id,
          id_souscription,
          montant_investi,
          coupon_net,
          investisseur:investisseurs(nom_raison_sociale)
        `)
        .eq('tranche_id', trancheId)
        .order('id_souscription');

      if (error) throw error;
      setSubscriptions((data || []) as Subscription[]);
    } catch {
    } finally {
      setLoading(false);
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

  const getTotalPayment = () => {
    return subscriptions.reduce((sum, sub) => sum + (Number(sub.coupon_net) || 0), 0);
  };

  if (showUpload && selectedTrancheId) {
    return (
      <PaymentProofUpload
        trancheId={selectedTrancheId}
        subscriptions={subscriptions}
        onClose={() => {
          setShowUpload(false);
        }}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Enregistrer un Paiement de Tranche</h3>
              <p className="text-sm text-slate-600 mt-1">Sélectionnez un projet et une tranche à payer</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Projet</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finxar-cta"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projet} - {project.emetteur}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Tranche</label>
              <select
                value={selectedTrancheId}
                onChange={(e) => setSelectedTrancheId(e.target.value)}
                disabled={!selectedProjectId || tranches.length === 0}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finxar-cta disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner une tranche</option>
                {tranches.map((tranche) => (
                  <option key={tranche.id} value={tranche.id}>
                    {tranche.tranche_name} ({tranche.subscription_count} investisseurs - Total: {formatCurrency(tranche.total_amount)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          )}

          {!loading && selectedTrancheId && subscriptions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucune souscription trouvée pour cette tranche</p>
            </div>
          )}

          {!loading && subscriptions.length > 0 && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">Paiement de Tranche</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Cette tranche contient {subscriptions.length} investisseur{subscriptions.length > 1 ? 's' : ''}.
                  Le justificatif de paiement doit contenir tous les paiements individuels.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Montant total à payer:</span>
                  <span className="text-lg font-bold text-blue-900">{formatCurrency(getTotalPayment())}</span>
                </div>
              </div>

              <h4 className="font-medium text-slate-900 mb-3">Détails des Paiements ({subscriptions.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="p-3 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {subscription.investisseur?.nom_raison_sociale || 'Investisseur non spécifié'}
                        </p>
                        <p className="text-xs text-slate-500">{subscription.id_souscription}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(Number(subscription.coupon_net) || 0)}</p>
                        <p className="text-xs text-slate-500">À payer</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowUpload(true)}
                className="w-full px-6 py-3 bg-finxar-cta text-white rounded-lg hover:bg-finxar-accent transition-colors font-medium"
              >
                Télécharger le Justificatif de Paiement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickPaymentModal;
