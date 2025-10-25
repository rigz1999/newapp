import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { PaymentProofUpload } from './PaymentProofUpload';

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
}

interface Payment {
  id: string;
  montant: number;
  date_paiement: string;
  statut: string;
  tranche: {
    tranche_name: string;
  };
  investisseur: {
    nom_raison_sociale: string;
  } | null;
}

export function QuickPaymentModal({ onClose, onSuccess }: QuickPaymentModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTranches(selectedProjectId);
      setSelectedTrancheId('');
      setPayments([]);
    } else {
      setTranches([]);
      setSelectedTrancheId('');
      setPayments([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedTrancheId) {
      fetchPayments(selectedTrancheId);
    } else {
      setPayments([]);
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
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTranches = async (projectId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tranches')
        .select('id, tranche_name, projet_id')
        .eq('projet_id', projectId)
        .order('tranche_name');

      if (error) throw error;
      setTranches(data || []);
    } catch (err) {
      console.error('Error fetching tranches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (trancheId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paiements')
        .select(`
          id,
          montant,
          date_paiement,
          statut,
          tranche:tranches(tranche_name),
          investisseur:investisseurs(nom_raison_sociale)
        `)
        .eq('tranche_id', trancheId)
        .in('statut', ['En attente', 'En retard', 'pending', 'late'])
        .order('date_paiement', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as Payment[]);
    } catch (err) {
      console.error('Error fetching payments:', err);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'en attente' || s === 'pending') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">En attente</span>;
    }
    if (s === 'en retard' || s === 'late') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">En retard</span>;
    }
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{status}</span>;
  };

  if (selectedPayment) {
    return (
      <PaymentProofUpload
        payment={selectedPayment}
        onClose={() => {
          setSelectedPayment(null);
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
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Enregistrer un Paiement</h3>
              <p className="text-sm text-slate-600 mt-1">Sélectionnez un projet et une tranche</p>
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Sélectionner une tranche</option>
                {tranches.map((tranche) => (
                  <option key={tranche.id} value={tranche.id}>
                    {tranche.tranche_name}
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

          {!loading && selectedTrancheId && payments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucun paiement en attente pour cette tranche</p>
            </div>
          )}

          {!loading && payments.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Paiements en attente ({payments.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {payments.map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="w-full p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-slate-900">{formatCurrency(payment.montant)}</p>
                      {getStatusBadge(payment.statut)}
                    </div>
                    <p className="text-sm text-slate-600">
                      {payment.investisseur?.nom_raison_sociale || 'Investisseur non spécifié'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Date: {formatDate(payment.date_paiement)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickPaymentModal;
