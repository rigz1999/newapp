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
  frequence: string;
  taux_interet: string;
  date_echeance: string | null;
  maturite_mois: number | null;
}

interface Subscription {
  id: string;
  id_souscription: string;
  date_souscription: string;
  montant_investi: number;
  nombre_obligations: number;
  coupon_net: number;
  prochaine_date_coupon: string | null;
  investisseur: {
    nom_raison_sociale: string;
  };
  tranche: {
    tranche_name: string;
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

    const [projectRes, tranchesRes, subscriptionsRes, paymentsRes] = await Promise.all([
      supabase.from('projets').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('tranches').select('*').eq('projet_id', projectId).order('created_at', { ascending: false }),
      supabase.from('souscriptions').select(`
        id, id_souscription, date_souscription, nombre_obligations, montant_investi,
        coupon_brut, coupon_net, prochaine_date_coupon, investisseur_id,
        investisseur:investisseurs(nom_raison_sociale),
        tranche:tranches(tranche_name)
      `).eq('projet_id', projectId).order('date_souscription', { ascending: false }),
      supabase.from('paiements').select('id, id_paiement, type, montant, date_paiement, statut').eq('projet_id', projectId).order('date_paiement', { ascending: false })
    ]);

    const projectData = projectRes.data;
    const tranchesData = tranchesRes.data || [];
    const subscriptionsData = subscriptionsRes.data || [];
    const paymentsData = paymentsRes.data || [];

    setProject(projectData);
    setTranches(tranchesData);
    setSubscriptions(subscriptionsData as any);
    setPayments(paymentsData);

    if (subscriptionsData.length > 0) {
      const totalLeve = subscriptionsData.reduce((sum, sub) => sum + Number(sub.montant_investi || 0), 0);
      const uniqueInvestors = new Set(subscriptionsData.map(s => s.investisseur_id)).size;

      const upcomingCoupons = subscriptionsData.filter(s => s.prochaine_date_coupon);
      upcomingCoupons.sort((a, b) =>
        new Date(a.prochaine_date_coupon!).getTime() - new Date(b.prochaine_date_coupon!).getTime()
      );

      const nextCoupon = upcomingCoupons[0];
      const nextCouponAmount = upcomingCoupons
        .filter(s => s.prochaine_date_coupon === nextCoupon?.prochaine_date_coupon)
        .reduce((sum, s) => sum + Number(s.coupon_net || 0), 0);

      setStats({
        totalLeve,
        investisseursCount: uniqueInvestors,
        tranchesCount: tranchesData.length,
        nextCouponDate: nextCoupon?.prochaine_date_coupon || null,
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

  const handleDeleteProject = async () => {
    if (tranches.length > 0) {
      alert(`Impossible de supprimer ce projet car il contient ${tranches.length} tranche(s). Supprimez d'abord les tranches.`);
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project?.projet}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projets')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      navigate('/projets');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert('Erreur lors de la suppression du projet: ' + error.message);
    }
  };

  const handleUpdateProject = async () => {
    try {
      const { error } = await supabase
        .from('projets')
        .update(editedProject)
        .eq('id', projectId);

      if (error) throw error;

      setShowEditProject(false);
      fetchProjectData();
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert('Erreur lors de la mise à jour du projet: ' + error.message);
    }
  };

  const handleDeleteSubscription = async (subscription: Subscription) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la souscription de ${subscription.investisseur.nom_raison_sociale} ?`)) {
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
      alert('Erreur lors de la suppression de la souscription: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-600">Projet non trouvé</p>
          <button
            onClick={() => navigate('/projets')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={() => navigate('/projets')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour aux projets</span>
        </button>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{project.projet}</h1>
                <div className="space-y-1 text-sm text-slate-600">
                  <p><span className="font-medium">Émetteur:</span> {project.emetteur}</p>
                  {project.siren_emetteur && (
                    <p><span className="font-medium">SIREN:</span> {project.siren_emetteur}</p>
                  )}
                  {project.nom_representant && (
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
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Montant Total Levé</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalLeve)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Investisseurs</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.investisseursCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Tranches</span>
                <Layers className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.tranchesCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Prochain Coupon</span>
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
              {stats.nextCouponDate ? (
                <>
                  <p className="text-lg font-bold text-slate-900">{formatDate(stats.nextCouponDate)}</p>
                  <p className="text-sm text-green-600 font-semibold">{formatCurrency(stats.nextCouponAmount)}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Aucun à venir</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Tranches</h2>
              <button
                onClick={() => setShowTrancheWizard(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Tranche
              </button>
            </div>

            {tranches.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucune tranche créée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Nom</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Fréquence</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Taux</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Échéance</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Souscriptions</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tranches.map((tranche) => {
                      const trancheSubscriptions = subscriptions.filter(s => s.tranche.tranche_name === tranche.tranche_name);
                      return (
                        <tr key={tranche.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{tranche.tranche_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{tranche.frequence} mois</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{tranche.taux_interet}%</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(tranche.date_echeance)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{trancheSubscriptions.length}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingTranche(tranche);
                                  setShowTrancheWizard(true);
                                }}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Souscriptions</h2>

            {subscriptions.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucune souscription</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Investisseur</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tranche</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Montant Investi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Coupon Net</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Prochain Coupon</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {sub.investisseur.nom_raison_sociale}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{sub.tranche.tranche_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(sub.date_souscription)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          {formatCurrency(sub.montant_investi)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(sub.coupon_net)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(sub.prochaine_date_coupon)}</td>
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
