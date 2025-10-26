import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrancheWizard } from './TrancheWizard';
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  Users,
  Layers,
  Calendar,
  Plus,
  Loader,
  X,
} from 'lucide-react';

interface ProjectDetailProps {
  organization: { id: string; name: string; role: string };
}

interface Project {
  id: string;
  projet: string;
  emetteur: string;
  siren_emetteur: number | null;
  nom_representant: string | null;
  prenom_representant: string | null;
  email_representant: string | null;
  representant_masse: string | null;
  email_rep_masse: string | null;
  created_at: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
  taux_nominal: number | null;
  periodicite_coupons: string | null;
  date_emission: string | null;
  date_echeance_finale: string | null;
  duree_mois: number | null;
}

interface Subscription {
  id: string;
  id_souscription: string;
  date_souscription: string;
  montant_investi: number;
  nombre_obligations: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
  };
  tranche: {
    tranche_name: string;
    date_emission: string | null;
  };
  prochain_coupon?: {
    date_prochain_coupon: string;
    montant_prochain_coupon: number;
    statut: string;
  };
}

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  statut: string;
}

export function ProjectDetail({ organization }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [editingTranche, setEditingTranche] = useState<Tranche | null>(null);
  const [deletingTranche, setDeletingTranche] = useState<Tranche | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});

  const [stats, setStats] = useState({
    totalLeve: 0,
    investisseursCount: 0,
    tranchesCount: 0,
    nextCouponDate: null as string | null,
    nextCouponAmount: 0,
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    setLoading(true);

    const [projectRes, tranchesRes, subscriptionsRes, paymentsRes, prochainsCouponsRes] = await Promise.all([
      supabase.from('projets').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('tranches').select('*').eq('projet_id', projectId).order('created_at', { ascending: false }),
      supabase.from('souscriptions').select(`
        id, id_souscription, date_souscription, nombre_obligations, montant_investi,
        coupon_net, investisseur_id,
        investisseur:investisseurs(nom_raison_sociale),
        tranche:tranches(tranche_name, date_emission)
      `).eq('projet_id', projectId).order('date_souscription', { ascending: false }),
      supabase.from('paiements').select('id, id_paiement, type, montant, date_paiement, statut').eq('projet_id', projectId).order('date_paiement', { ascending: false }),
      supabase.from('v_prochains_coupons').select('souscription_id, date_prochain_coupon, montant_prochain_coupon, statut')
    ]);

    const projectData = projectRes.data;
    const tranchesData = tranchesRes.data || [];
    const subscriptionsData = subscriptionsRes.data || [];
    const paymentsData = paymentsRes.data || [];
    const prochainsCouponsData = prochainsCouponsRes.data || [];

    // Merge prochain_coupon data into subscriptions
    const subscriptionsWithCoupons = subscriptionsData.map((sub: any) => {
      const prochainCoupon = prochainsCouponsData.find((pc: any) => pc.souscription_id === sub.id);
      return {
        ...sub,
        prochain_coupon: prochainCoupon || null
      };
    });

    setProject(projectData);
    setTranches(tranchesData);
    setSubscriptions(subscriptionsWithCoupons as any);
    setPayments(paymentsData);

    if (subscriptionsWithCoupons.length > 0) {
      const totalLeve = subscriptionsWithCoupons.reduce((sum: number, sub: any) => sum + Number(sub.montant_investi || 0), 0);
      const uniqueInvestors = new Set(subscriptionsWithCoupons.map((s: any) => s.investisseur_id)).size;

      // Get next coupon from the merged data
      const upcomingCoupons = subscriptionsWithCoupons
        .filter((s: any) => s.prochain_coupon?.date_prochain_coupon)
        .sort((a: any, b: any) => 
          new Date(a.prochain_coupon.date_prochain_coupon).getTime() - 
          new Date(b.prochain_coupon.date_prochain_coupon).getTime()
        );

      const nextCoupon = upcomingCoupons[0];
      const nextCouponAmount = upcomingCoupons
        .filter((s: any) => s.prochain_coupon.date_prochain_coupon === nextCoupon?.prochain_coupon?.date_prochain_coupon)
        .reduce((sum: number, s: any) => sum + Number(s.prochain_coupon.montant_prochain_coupon || 0), 0);

      setStats({
        totalLeve,
        investisseursCount: uniqueInvestors,
        tranchesCount: tranchesData.length,
        nextCouponDate: nextCoupon?.prochain_coupon?.date_prochain_coupon || null,
        nextCouponAmount,
      });
    }

    setLoading(false);
  };

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

  const formatFrequence = (freq: string | null) => {
    if (!freq) return '-';
    const map: Record<string, string> = {
      'mensuelle': 'Mensuelle',
      'trimestrielle': 'Trimestrielle',
      'semestrielle': 'Semestrielle',
      'annuelle': 'Annuelle'
    };
    return map[freq.toLowerCase()] || freq;
  };

  const handleDeleteTranche = async (tranche: Tranche) => {
    const trancheSubscriptions = subscriptions.filter(s => s.tranche.tranche_name === tranche.tranche_name);

    let confirmMessage = `Êtes-vous sûr de vouloir supprimer la tranche "${tranche.tranche_name}" ?`;

    if (trancheSubscriptions.length > 0) {
      confirmMessage = `⚠️ ATTENTION: Cette tranche contient ${trancheSubscriptions.length} souscription(s).\n\nSupprimer la tranche supprimera également toutes les souscriptions associées.\n\nÊtes-vous sûr de vouloir continuer ?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all subscriptions first
      if (trancheSubscriptions.length > 0) {
        const subscriptionIds = trancheSubscriptions.map(s => s.id);
        const { error: subsError } = await supabase
          .from('souscriptions')
          .delete()
          .in('id', subscriptionIds);

        if (subsError) throw subsError;
      }

      // Then delete the tranche
      const { error } = await supabase
        .from('tranches')
        .delete()
        .eq('id', tranche.id);

      if (error) throw error;

      setDeletingTranche(null);
      fetchProjectData();
    } catch (error: any) {
      console.error('Error deleting tranche:', error);
      alert('Erreur lors de la suppression de la tranche: ' + error.message);
    }
  };

  const handleDeleteSubscription = async (subscription: Subscription) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette souscription ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('souscriptions')
        .delete()
        .eq('id', subscription.id);

      if (error) throw error;

      fetchProjectData();
    } catch (error: any) {
      console.error('Error deleting subscription:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleUpdateProject = async () => {
    if (!project) return;

    try {
      const { error } = await supabase
        .from('projets')
        .update(editedProject)
        .eq('id', project.id);

      if (error) throw error;

      setShowEditProject(false);
      fetchProjectData();
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert('Erreur lors de la mise à jour: ' + error.message);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (tranches.length > 0) {
      alert(`Impossible de supprimer ce projet car il contient ${tranches.length} tranche(s). Supprimez d'abord les tranches.`);
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project.projet}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projets')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      navigate('/projets');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert('Erreur lors de la suppression du projet: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-slate-600">Projet non trouvé</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/projets')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux projets
          </button>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{project.projet}</h1>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Émetteur:</span> {project.emetteur}</p>
                {project.siren_emetteur && (
                  <p><span className="font-medium">SIREN:</span> {project.siren_emetteur}</p>
                )}
                {project.nom_representant && project.prenom_representant && (
                  <p><span className="font-medium">Représentant:</span> {project.prenom_representant} {project.nom_representant}</p>
                )}
                {project.email_representant && (
                  <p><span className="font-medium">Email:</span> {project.email_representant}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditedProject(project);
                  setShowEditProject(true);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier le projet"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDeleteProject}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer le projet"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Montant Total Levé</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalLeve)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Investisseurs</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.investisseursCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Tranches</p>
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.tranchesCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Prochain Coupon</p>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.nextCouponDate ? formatDate(stats.nextCouponDate) : '-'}
            </p>
            <p className="text-sm text-green-600 font-medium mt-1">
              {stats.nextCouponAmount > 0 ? formatCurrency(stats.nextCouponAmount) : ''}
            </p>
          </div>
        </div>

        {/* Tranches Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Tranches</h2>
            <button
              onClick={() => setShowTrancheWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Tranche
            </button>
          </div>

          {tranches.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Aucune tranche créée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fréquence</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Taux</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Échéance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Souscriptions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tranches.map((tranche) => {
                    const trancheSubscriptions = subscriptions.filter(
                      s => s.tranche.tranche_name === tranche.tranche_name
                    );
                    
                    return (
                      <tr key={tranche.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900">
                            {tranche.tranche_name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600 capitalize">
                            {formatFrequence(tranche.periodicite_coupons)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900 font-medium">
                            {tranche.taux_nominal ? `${tranche.taux_nominal}%` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {formatDate(tranche.date_echeance_finale)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {trancheSubscriptions.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingTranche(tranche);
                                setShowTrancheWizard(true);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Modifier la tranche"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTranche(tranche)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer la tranche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Subscriptions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Souscriptions</h2>

          {subscriptions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Aucune souscription</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Investisseur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tranche</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Montant Investi</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Coupon Net</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Prochain Coupon</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {sub.investisseur?.nom_raison_sociale || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{sub.tranche?.tranche_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {sub.tranche?.date_emission ? formatDate(sub.tranche.date_emission) : formatDate(sub.date_souscription)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {formatCurrency(sub.montant_investi)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                        {sub.coupon_net ? formatCurrency(sub.coupon_net) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {sub.prochain_coupon?.date_prochain_coupon 
                          ? formatDate(sub.prochain_coupon.date_prochain_coupon)
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeleteSubscription(sub)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer la souscription"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Historique des Paiements</h2>

          {payments.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Aucun paiement enregistré</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      payment.statut === 'Payé' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {payment.type || 'Paiement'} - {payment.id_paiement}
                      </p>
                      <p className="text-xs text-slate-600">{formatDate(payment.date_paiement)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(payment.montant)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      payment.statut === 'Payé'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {payment.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TrancheWizard Modal */}
        {showTrancheWizard && (
          <TrancheWizard
            onClose={() => {
              setShowTrancheWizard(false);
              setEditingTranche(null);
            }}
            onSuccess={() => {
              setShowTrancheWizard(false);
              setEditingTranche(null);
              fetchProjectData();
            }}
            preselectedProjectId={projectId}
            editingTranche={editingTranche}
          />
        )}

        {/* Edit Project Modal */}
        {showEditProject && project && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier le Projet</h3>
                    <p className="text-sm text-slate-600 mt-1">Mettre à jour les informations du projet</p>
                  </div>
                  <button onClick={() => setShowEditProject(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Nom du projet</label>
                    <input
                      type="text"
                      value={editedProject.projet || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, projet: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Émetteur</label>
                    <input
                      type="text"
                      value={editedProject.emetteur || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">SIREN</label>
                    <input
                      type="text"
                      value={editedProject.siren_emetteur?.toString() || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, siren_emetteur: parseInt(e.target.value) || null })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Prénom représentant</label>
                      <input
                        type="text"
                        value={editedProject.prenom_representant || ''}
                        onChange={(e) => setEditedProject({ ...editedProject, prenom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Nom représentant</label>
                      <input
                        type="text"
                        value={editedProject.nom_representant || ''}
                        onChange={(e) => setEditedProject({ ...editedProject, nom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Email représentant</label>
                    <input
                      type="email"
                      value={editedProject.email_representant || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, email_representant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Représentant de la masse</label>
                    <input
                      type="text"
                      value={editedProject.representant_masse || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, representant_masse: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Email représentant de la masse</label>
                    <input
                      type="email"
                      value={editedProject.email_rep_masse || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, email_rep_masse: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowEditProject(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdateProject}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ProjectDetail;