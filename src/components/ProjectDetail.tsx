import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
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
} from 'lucide-react';

interface ProjectDetailProps {
  projectId: string;
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onBack: () => void;
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

export function ProjectDetail({ projectId, organization, onLogout, onNavigate, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);

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

    const { data: projectData } = await supabase
      .from('projets')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: tranchesData } = await supabase
      .from('tranches')
      .select('*')
      .eq('projet_id', projectId)
      .order('created_at', { ascending: false });

    const { data: subscriptionsData } = await supabase
      .from('souscriptions')
      .select(`
        *,
        investisseur:investisseurs(nom_raison_sociale),
        tranche:tranches(tranche_name)
      `)
      .eq('projet_id', projectId)
      .order('date_souscription', { ascending: false });

    const { data: paymentsData } = await supabase
      .from('paiements')
      .select('*')
      .eq('projet_id', projectId)
      .order('date_paiement', { ascending: false });

    if (projectData) setProject(projectData);
    if (tranchesData) setTranches(tranchesData);
    if (subscriptionsData) setSubscriptions(subscriptionsData as any);
    if (paymentsData) setPayments(paymentsData);

    if (subscriptionsData) {
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
        tranchesCount: tranchesData?.length || 0,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          organization={organization}
          activePage="projects"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <main className="flex-1 flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-slate-400" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          organization={organization}
          activePage="projects"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600">Projet non trouvé</p>
            <button
              onClick={onBack}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Retour
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="projects"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button
            onClick={onBack}
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
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                              <button className="p-1 text-slate-600 hover:bg-slate-100 rounded">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                            <button className="p-1 text-slate-600 hover:bg-slate-100 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-red-600 hover:bg-red-50 rounded">
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
        </div>
      </main>

      {showTrancheWizard && (
        <TrancheWizard
          onClose={() => setShowTrancheWizard(false)}
          onSuccess={() => {
            setShowTrancheWizard(false);
            fetchProjectData();
          }}
          preselectedProjectId={projectId}
        />
      )}
    </div>
  );
}
