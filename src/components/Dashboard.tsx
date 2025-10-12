import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import {
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
  date_paiement: string;
  montant: number;
  statut: string;
  tranche_id: string;
  type: string;
  tranche?: {
    tranche_name: string;
    projet_id: string;
  };
}

interface UpcomingCoupon {
  id: string;
  prochaine_date_coupon: string;
  coupon_brut: number;
  investisseur_id: string;
  tranche_id: string;
  tranche?: {
    tranche_name: string;
    projet_id: string;
    projet?: {
      projet: string;
    };
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
      .from('projets')
      .select('id');

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
        .in('projet_id', projectIds);

      const trancheIds = tranches?.map((t) => t.id) || [];

      if (trancheIds.length > 0) {
        const { data: subscriptions } = await supabase
          .from('souscriptions')
          .select('montant_investi')
          .in('tranche_id', trancheIds);

        totalInvested = subscriptions?.reduce((sum, s) => sum + parseFloat(s.montant_investi.toString()), 0) || 0;

        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        const { data: monthPayments } = await supabase
          .from('paiements')
          .select('montant')
          .eq('statut', 'paid')
          .gte('date_paiement', firstOfMonth.toISOString().split('T')[0]);

        couponsPaidThisMonth = monthPayments?.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0) || 0;

        const today = new Date();
        const in90Days = new Date();
        in90Days.setDate(today.getDate() + 90);

        const { data: upcoming } = await supabase
          .from('souscriptions')
          .select('id', { count: 'exact', head: true })
          .in('tranche_id', trancheIds)
          .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
          .lte('prochaine_date_coupon', in90Days.toISOString().split('T')[0]);

        upcomingCount = upcoming?.count || 0;
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
        .in('projet_id', projectIds);

      const trancheIds = tranches?.map((t) => t.id) || [];

      if (trancheIds.length > 0) {
        const { data: payments } = await supabase
          .from('paiements')
          .select(`
            *,
            tranche:tranches(
              tranche_name,
              projet_id
            )
          `)
          .in('tranche_id', trancheIds)
          .order('date_paiement', { ascending: false })
          .limit(5);

        setRecentPayments(payments as any || []);

        const today = new Date();
        const { data: coupons } = await supabase
          .from('souscriptions')
          .select(`
            *,
            tranche:tranches(
              tranche_name,
              projet_id,
              projet:projets(
                projet
              )
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
    window.location.reload();
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
      <Sidebar
        organization={organization}
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          onNavigate(page);
        }}
        onLogout={onLogout}
      />

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
                              {payment.tranche?.tranche_name || 'Tranche'}
                            </p>
                            <p className="text-xs text-slate-600">
                              {formatDate(payment.date_paiement)} • {payment.type || 'Coupon'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm">{formatCurrency(payment.montant)}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              payment.statut?.toLowerCase() === 'payé' || payment.statut?.toLowerCase() === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : payment.statut?.toLowerCase() === 'en attente'
                                ? 'bg-yellow-100 text-yellow-700'
                                : payment.statut?.toLowerCase() === 'en retard'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {payment.statut}
                            </span>
                          </div>
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
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{formatCurrency(parseFloat(coupon.coupon_brut.toString()))}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {coupon.tranche?.projet?.projet || 'Projet'} • {coupon.tranche?.tranche_name || 'Tranche'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">{formatDate(coupon.prochaine_date_coupon)}</p>
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
