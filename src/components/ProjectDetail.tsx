import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TrancheWizard } from './TrancheWizard';
import { PaymentWizard } from './PaymentWizard';
import { EcheancierCard } from './EcheancierCard';
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
  AlertTriangle,
  CalendarDays,
  Coins,
  UserCircle,
  BarChart3,
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
  // Champs financiers
  taux_nominal: number | null;
  periodicite_coupons: string | null;
  maturite_mois: number | null;
  base_interet: number | null;
  type: string | null;
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
  const [showEditSubscription, setShowEditSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);
  const [showEcheancierModal, setShowEcheancierModal] = useState(false);
  const [selectedTrancheForEcheancier, setSelectedTrancheForEcheancier] = useState<Tranche | null>(null);
  const [showAllTranches, setShowAllTranches] = useState(false);
  const [showAllSubscriptions, setShowAllSubscriptions] = useState(false);

  const TRANCHES_LIMIT = 5;
  const SUBSCRIPTIONS_LIMIT = 10;

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
      supabase.from('tranches').select('*').eq('projet_id', projectId).order('date_emission', { ascending: true }), // ← Ordre chronologique
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
      confirmMessage += `\n\n⚠️ ATTENTION : Cette tranche contient ${trancheSubscriptions.length} souscription(s) pour un montant total de ${formatCurrency(
        trancheSubscriptions.reduce((sum, s) => sum + s.montant_investi, 0)
      )}.`;
      confirmMessage += '\n\nToutes les souscriptions et échéances associées seront également supprimées.';
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase.from('tranches').delete().eq('id', tranche.id);

      if (error) throw error;

      alert('✅ Tranche supprimée avec succès');
      fetchProjectData();
    } catch (err: any) {
      console.error('Error deleting tranche:', err);
      alert('❌ Erreur lors de la suppression de la tranche : ' + err.message);
    }
  };

  const handleUpdateProject = async () => {
    if (!project) return;

    // Vérification si des champs financiers critiques changent
    const hasFinancialChanges = 
      editedProject.periodicite_coupons !== undefined && editedProject.periodicite_coupons !== project.periodicite_coupons ||
      editedProject.taux_nominal !== undefined && editedProject.taux_nominal !== project.taux_nominal ||
      editedProject.maturite_mois !== undefined && editedProject.maturite_mois !== project.maturite_mois;

    if (hasFinancialChanges && subscriptions.length > 0) {
      const confirmMsg = `⚠️ ATTENTION : Vous modifiez des paramètres financiers critiques.\n\n` +
        `Cela va automatiquement :\n` +
        `• Mettre à jour toutes les tranches du projet\n` +
        `• Recalculer tous les coupons nets\n` +
        `• Régénérer toutes les échéances de paiement\n\n` +
        `${subscriptions.length} souscription(s) seront impactées.\n\n` +
        `Voulez-vous continuer ?`;

      if (!window.confirm(confirmMsg)) return;
    }

    try {
      const { error } = await supabase
        .from('projets')
        .update(editedProject)
        .eq('id', project.id);

      if (error) throw error;

      setShowEditProject(false);
      
      // Recharger toutes les données
      await fetchProjectData();
      
      alert('✅ Projet mis à jour avec succès' + (hasFinancialChanges ? '\n\nLes coupons et échéances ont été recalculés automatiquement.' : ''));
    } catch (err: any) {
      console.error('Error updating project:', err);
      alert('❌ Erreur lors de la mise à jour : ' + err.message);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          montant_investi: editingSubscription.montant_investi,
          nombre_obligations: editingSubscription.nombre_obligations,
          date_souscription: editingSubscription.date_souscription,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      setShowEditSubscription(false);
      setEditingSubscription(null);
      await fetchProjectData();
      alert('✅ Souscription mise à jour avec succès');
    } catch (err: any) {
      console.error('Error updating subscription:', err);
      alert('❌ Erreur lors de la mise à jour : ' + err.message);
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
      <div className="text-center py-12">
        <p className="text-slate-600">Projet introuvable</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{project.projet}</h1>
              <p className="text-slate-600 mt-1">{project.emetteur}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditedProject(project);
              setShowEditProject(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-sm"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-slate-600 text-sm">Montant Total Levé</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalLeve)}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-slate-600 text-sm">Investisseurs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.investisseursCount}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-slate-600 text-sm">Tranches</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.tranchesCount}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-slate-600 text-sm">Prochain Coupon</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {stats.nextCouponDate ? formatDate(stats.nextCouponDate) : '-'}
                </p>
                <p className="text-sm font-semibold text-green-600 mt-1">
                  {stats.nextCouponAmount > 0 ? formatCurrency(stats.nextCouponAmount) : '-'}
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Détails du Projet</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">SIREN</p>
              <p className="text-base font-medium text-slate-900">{project.siren_emetteur || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Représentant</p>
              <p className="text-base font-medium text-slate-900">
                {project.prenom_representant && project.nom_representant
                  ? `${project.prenom_representant} ${project.nom_representant}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Email Représentant</p>
              <p className="text-base font-medium text-slate-900">{project.email_representant || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Type d'obligation</p>
              <p className="text-base font-medium text-slate-900">
                {project.type === 'obligations_simples' ? 'Obligations simples' : 
                 project.type === 'obligations_convertibles' ? 'Obligations convertibles' : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Taux Nominal</p>
              <p className="text-base font-medium text-slate-900">
                {project.taux_nominal ? `${project.taux_nominal}%` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Périodicité des Coupons</p>
              <p className="text-base font-medium text-slate-900">
                {formatFrequence(project.periodicite_coupons)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Maturité</p>
              <p className="text-base font-medium text-slate-900">
                {project.maturite_mois ? `${project.maturite_mois} mois` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Base de calcul</p>
              <p className="text-base font-medium text-slate-900">
                {project.base_interet ? `${project.base_interet} jours` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Tranches Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Tranches</h2>
            <button
              onClick={() => setShowTrancheWizard(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Tranche
            </button>
          </div>

          {tranches.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Aucune tranche créée</p>
          ) : (
            <>
              <div className="space-y-4">
                {(showAllTranches ? tranches : tranches.slice(0, TRANCHES_LIMIT)).map((tranche) => {
                const trancheSubscriptions = subscriptions.filter(
                  (s) => s.tranche.tranche_name === tranche.tranche_name
                );
                const totalInvested = trancheSubscriptions.reduce((sum, s) => sum + s.montant_investi, 0);

                return (
                  <div
                    key={tranche.id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 min-w-[150px]">{tranche.tranche_name}</p>
                      <span className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(tranche.date_emission)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Coins className="w-3.5 h-3.5" />
                        {formatCurrency(totalInvested)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-600">
                        <UserCircle className="w-3.5 h-3.5" />
                        {trancheSubscriptions.length} souscripteur(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTranche(tranche);
                          setShowTrancheWizard(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Modifier la tranche"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTranche(tranche)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer la tranche"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>

              {tranches.length > TRANCHES_LIMIT && !showAllTranches && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllTranches(true)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Voir toutes les tranches ({tranches.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Subscriptions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Souscriptions</h2>

          {subscriptions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Aucune souscription enregistrée</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Investisseur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Tranche
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Prochain Coupon
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(showAllSubscriptions ? subscriptions : subscriptions.slice(0, SUBSCRIPTIONS_LIMIT)).map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {sub.investisseur.nom_raison_sociale}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{sub.tranche.tranche_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(sub.date_souscription)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                        {formatCurrency(sub.montant_investi)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {sub.prochain_coupon ? (
                          <div>
                            <p className="text-slate-900 font-medium">
                              {formatDate(sub.prochain_coupon.date_prochain_coupon)}
                            </p>
                            <p className="text-slate-600 text-xs">
                              {formatCurrency(sub.prochain_coupon.montant_prochain_coupon)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingSubscription(sub);
                              setShowEditSubscription(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier la souscription"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Êtes-vous sûr de vouloir supprimer la souscription de ${sub.investisseur.nom_raison_sociale} ?`
                                )
                              ) {
                                try {
                                  const { error } = await supabase
                                    .from('souscriptions')
                                    .delete()
                                    .eq('id', sub.id);

                                  if (error) throw error;

                                  alert('✅ Souscription supprimée avec succès');
                                  fetchProjectData();
                                } catch (err: any) {
                                  console.error('Error deleting subscription:', err);
                                  alert('❌ Erreur lors de la suppression : ' + err.message);
                                }
                              }
                            }}
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

            {subscriptions.length > SUBSCRIPTIONS_LIMIT && !showAllSubscriptions && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllSubscriptions(true)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Voir toutes les souscriptions ({subscriptions.length})
                </button>
              </div>
            )}
          </>
          )}
        </div>

        {/* Écheancier Section */}
        <EcheancierCard 
          projectId={projectId!} 
          tranches={tranches}
          onPaymentClick={(trancheId) => {
            // Ouvrir le PaymentWizard pour cette tranche
            setShowPaymentWizard(true);
          }}
        />

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
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
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
                {/* Avertissement si modifications financières */}
                {(editedProject.periodicite_coupons !== project.periodicite_coupons ||
                  editedProject.taux_nominal !== project.taux_nominal ||
                  editedProject.maturite_mois !== project.maturite_mois) && 
                  subscriptions.length > 0 && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <p className="font-semibold mb-1">Modification de paramètres financiers détectée</p>
                      <p>Les coupons et échéances de toutes les souscriptions seront automatiquement recalculés.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Section Informations Générales */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                      Informations Générales
                    </h4>
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

                      <div className="grid grid-cols-2 gap-4">
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-900 mb-2">Type d'obligation</label>
                        <select
                          value={editedProject.type || ''}
                          onChange={(e) => setEditedProject({ ...editedProject, type: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="obligations_simples">Obligations simples</option>
                          <option value="obligations_convertibles">Obligations convertibles</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section Paramètres Financiers */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                      Paramètres Financiers
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Taux Nominal (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editedProject.taux_nominal?.toString() || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, taux_nominal: parseFloat(e.target.value) || null })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Périodicité des Coupons
                          </label>
                          <select
                            value={editedProject.periodicite_coupons || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, periodicite_coupons: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Sélectionner...</option>
                            <option value="mensuelle">Mensuelle</option>
                            <option value="trimestrielle">Trimestrielle</option>
                            <option value="semestrielle">Semestrielle</option>
                            <option value="annuelle">Annuelle</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Maturité (mois)
                          </label>
                          <input
                            type="number"
                            value={editedProject.maturite_mois?.toString() || ''}
                            onChange={(e) => setEditedProject({ ...editedProject, maturite_mois: parseInt(e.target.value) || null })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 24"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-900 mb-2">
                            Base de calcul
                          </label>
                          <select
                            value={editedProject.base_interet?.toString() || '360'}
                            onChange={(e) => setEditedProject({ ...editedProject, base_interet: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="360">360 jours</option>
                            <option value="365">365 jours</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Représentants */}
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                      Représentants
                    </h4>
                    <div className="space-y-4">
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
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setShowEditProject(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdateProject}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Subscription Modal */}
        {showEditSubscription && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier la Souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {editingSubscription.investisseur.nom_raison_sociale}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Date de souscription
                    </label>
                    <input
                      type="date"
                      value={editingSubscription.date_souscription || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          date_souscription: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Montant investi (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSubscription.montant_investi || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          montant_investi: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Nombre d'obligations
                    </label>
                    <input
                      type="number"
                      value={editingSubscription.nombre_obligations || ''}
                      onChange={(e) =>
                        setEditingSubscription({
                          ...editingSubscription,
                          nombre_obligations: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tranche :</span>
                      <span className="font-medium text-slate-900">
                        {editingSubscription.tranche.tranche_name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-600">Coupon net :</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(editingSubscription.coupon_net)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditSubscription(false);
                      setEditingSubscription(null);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUpdateSubscription}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Wizard Modal */}
        {showPaymentWizard && (
          <PaymentWizard
            onClose={() => setShowPaymentWizard(false)}
            onSuccess={() => {
              setShowPaymentWizard(false);
              fetchProjectData();
            }}
          />
        )}
      </div>
    </>
  );
}

export default ProjectDetail;