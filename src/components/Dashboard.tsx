import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Home,
  Receipt,
  FolderOpen,
  Users,
  TrendingUp,
  CheckCircle2,
  Folder,
  Clock,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface Stats {
  totalInvested: number;
  couponsPaidThisMonth: number;
  activeProjects: number;
  upcomingCoupons: number;
  nextCouponDays: number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  status: string;
  subscription: {
    investor: {
      investisseur_nom?: string;
      raison_sociale?: string;
    };
  };
}

interface UpcomingCoupon {
  id: string;
  prochaine_date_coupon: string;
  coupon_brut: number;
  investor: {
    investisseur_nom?: string;
    raison_sociale?: string;
  };
}

export function Dashboard({ organization, onLogout, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalInvested: 0,
    couponsPaidThisMonth: 0,
    activeProjects: 0,
    upcomingCoupons: 0,
    nextCouponDays: 90,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcomingCoupons, setUpcomingCoupons] = useState<UpcomingCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  const fetchData = async () => {
    const isRefresh = !loading;
    if (isRefresh) setRefreshing(true);

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', organization.id);

    const projectIds = projects?.map((p) => p.id) || [];

    let totalInvested = 0;
    let activeProjectCount = 0;
    let couponsPaidThisMonth = 0;
    let upcomingCount = 0;

    if (projectIds.length > 0) {
      activeProjectCount = projectIds.length;

      const { data: tranches } = await supabase
        .from('tranches')
        .select('id')
        .in('project_id', projectIds);

      const trancheIds = tranches?.map((t) => t.id) || [];

      if (trancheIds.length > 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('montant_investi')
          .in('tranche_id', trancheIds);

        totalInvested = subscriptions?.reduce((sum, s) => sum + parseFloat(s.montant_investi.toString()), 0) || 0;

        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        const { data: subscriptionIds } = await supabase
          .from('subscriptions')
          .select('id')
          .in('tranche_id', trancheIds);

        const subIds = subscriptionIds?.map((s) => s.id) || [];

        if (subIds.length > 0) {
          const { data: monthPayments } = await supabase
            .from('payments')
            .select('amount')
            .in('subscription_id', subIds)
            .eq('status', 'paid')
            .gte('payment_date', firstOfMonth.toISOString().split('T')[0]);

          couponsPaidThisMonth = monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

          const today = new Date();
          const in90Days = new Date();
          in90Days.setDate(today.getDate() + 90);

          const { data: upcoming } = await supabase
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .in('tranche_id', trancheIds)
            .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
            .lte('prochaine_date_coupon', in90Days.toISOString().split('T')[0]);

          upcomingCount = upcoming?.count || 0;
        }
      }
    }

    setStats({
      totalInvested,
      couponsPaidThisMonth,
      activeProjects: activeProjectCount,
      upcomingCoupons: upcomingCount,
      nextCouponDays: 90,
    });

    if (projectIds.length > 0) {
      const { data: tranches } = await supabase
        .from('tranches')
        .select('id')
        .in('project_id', projectIds);

      const trancheIds = tranches?.map((t) => t.id) || [];

      if (trancheIds.length > 0) {
        const { data: subscriptionIds } = await supabase
          .from('subscriptions')
          .select('id')
          .in('tranche_id', trancheIds);

        const subIds = subscriptionIds?.map((s) => s.id) || [];

        if (subIds.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select(`
              id,
              payment_date,
              amount,
              status,
              subscription:subscriptions(
                investor:investors(
                  investisseur_nom,
                  raison_sociale
                )
              )
            `)
            .in('subscription_id', subIds)
            .order('payment_date', { ascending: false })
            .limit(5);

          setRecentPayments(payments as any || []);
        }

        const today = new Date();
        const { data: coupons } = await supabase
          .from('subscriptions')
          .select(`
            id,
            prochaine_date_coupon,
            coupon_brut,
            investor:investors(
              investisseur_nom,
              raison_sociale
            )
          `)
          .in('tranche_id', trancheIds)
          .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
          .order('prochaine_date_coupon', { ascending: true })
          .limit(5);

        setUpcomingCoupons(coupons as any || []);
      }
    }

    setLoading(false);
    if (isRefresh) setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [organization.id]);

  const handleRefresh = () => {
    fetchData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    if (diffDays < 0) return `Il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
    return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">InvestFlow</span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activePage === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setActivePage('coupons');
                onNavigate('coupons');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activePage === 'coupons' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>Tous les Coupons</span>
            </button>
            <button
              onClick={() => {
                setActivePage('projects');
                onNavigate('projects');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activePage === 'projects' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span>Projets</span>
            </button>
            <button
              onClick={() => {
                setActivePage('investors');
                onNavigate('subscriptions');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activePage === 'investors' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Investisseurs</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-semibold">
              {organization.role === 'admin' ? 'AM' : organization.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{organization.role === 'admin' ? 'Admin' : organization.name}</p>
              <p className="text-sm text-slate-400 capitalize">{organization.role === 'admin' ? 'Manager' : organization.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-1">Voici ce qui se passe cette semaine</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 text-sm">Montant total investi</span>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(stats.totalInvested)}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 text-sm">Coupons payés ce mois</span>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{formatCurrency(stats.couponsPaidThisMonth)}</p>
                  <p className="text-sm text-green-600">{stats.couponsPaidThisMonth > 0 ? 'paiement' : '0 paiement'}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 text-sm">Projets actifs</span>
                    <Folder className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats.activeProjects}</p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 text-sm">Coupons à venir</span>
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{stats.upcomingCoupons}</p>
                  <p className="text-sm text-slate-600">{stats.nextCouponDays} prochains jours</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Évolution des Montants Levés</h2>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-lg">
                  <div className="text-center text-slate-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Graphique en développement</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Derniers Paiements</h2>
                  {recentPayments.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Aucun paiement récent</p>
                  ) : (
                    <div className="space-y-3">
                      {recentPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 text-sm">
                              {payment.subscription?.investor?.raison_sociale || payment.subscription?.investor?.investisseur_nom || 'Investisseur'}
                            </p>
                            <p className="text-xs text-slate-600">{formatDate(payment.payment_date)} • Payé</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {payment.status === 'paid' ? 'Remboursement Nominal' : payment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate('subscriptions')}
                    className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    Voir tout <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Coupons à Venir</h2>
                  {upcomingCoupons.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Aucun coupon à venir</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingCoupons.map((coupon) => (
                        <div key={coupon.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-bold text-slate-900">{formatCurrency(parseFloat(coupon.coupon_brut.toString()))}</p>
                            <p className="text-xs text-slate-600">{getRelativeDate(coupon.prochaine_date_coupon)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate('coupons')}
                    className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    Voir tout <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
