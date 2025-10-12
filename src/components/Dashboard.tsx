import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { TrancheWizard } from './TrancheWizard';
import { PaymentWizard } from './PaymentWizard';
import {
  TrendingUp,
  CheckCircle2,
  Folder,
  Clock,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Users,
  AlertTriangle,
  X,
  Plus,
  DollarSign,
  FileText,
  Download
} from 'lucide-react';

interface DashboardProps {
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string, options?: { openCreateModal?: boolean }) => void;
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

interface Alert {
  id: string;
  type: 'deadline' | 'late_payment' | 'upcoming_coupons';
  message: string;
  count?: number;
}

interface MonthlyData {
  month: string;
  amount: number;
  cumulative?: number;
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
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'example-deadline',
      type: 'deadline',
      message: 'Échéance proche : Tranche A dans 15 jours (27 oct. 2025)',
    },
    {
      id: 'example-late',
      type: 'late_payment',
      message: '3 paiements en retard',
      count: 3,
    },
    {
      id: 'example-coupons',
      type: 'upcoming_coupons',
      message: '5 coupons à payer cette semaine (Total: 12 500 €)',
      count: 5,
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showPaymentWizard, setShowPaymentWizard] = useState(false);

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
          .order('prochaine_date_coupon', { ascending: true });

        const groupedCoupons = (coupons || []).reduce((acc: any[], coupon: any) => {
          const key = `${coupon.tranche_id}-${coupon.prochaine_date_coupon}`;
          const existing = acc.find(c => `${c.tranche_id}-${c.prochaine_date_coupon}` === key);

          if (existing) {
            existing.investor_count += 1;
            existing.coupon_brut = parseFloat(existing.coupon_brut) + parseFloat(coupon.coupon_brut);
          } else {
            acc.push({
              ...coupon,
              investor_count: 1
            });
          }
          return acc;
        }, []);

        setUpcomingCoupons(groupedCoupons.slice(0, 5));

        // Fetch alerts - TEMPORARILY DISABLED TO SHOW EXAMPLES
        // const alertsData: Alert[] = [];
        // const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        // const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        // // Check for upcoming deadlines (30 days)
        // const { data: tranchesProches } = await supabase
        //   .from('tranches')
        //   .select('tranche_name, date_echeance')
        //   .in('id', trancheIds)
        //   .gte('date_echeance', today.toISOString().split('T')[0])
        //   .lte('date_echeance', in30Days.toISOString().split('T')[0]);

        // if (tranchesProches && tranchesProches.length > 0) {
        //   tranchesProches.forEach((tranche) => {
        //     const daysUntil = Math.ceil(
        //       (new Date(tranche.date_echeance).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        //     );
        //     alertsData.push({
        //       id: `deadline-${tranche.tranche_name}`,
        //       type: 'deadline',
        //       message: `Échéance proche : ${tranche.tranche_name} dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''} (${formatDate(tranche.date_echeance)})`,
        //     });
        //   });
        // }

        // // Check for late payments
        // const { data: paiementsRetard } = await supabase
        //   .from('paiements')
        //   .select('*')
        //   .in('investisseur_id', [organization.id])
        //   .ilike('statut', 'En retard');

        // if (paiementsRetard && paiementsRetard.length > 0) {
        //   alertsData.push({
        //     id: 'late-payments',
        //     type: 'late_payment',
        //     message: `${paiementsRetard.length} paiement${paiementsRetard.length > 1 ? 's' : ''} en retard`,
        //     count: paiementsRetard.length,
        //   });
        // }

        // // Check for coupons due this week
        // const { data: couponsThisWeek } = await supabase
        //   .from('souscriptions')
        //   .select('coupon_net, prochaine_date_coupon')
        //   .in('tranche_id', trancheIds)
        //   .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
        //   .lte('prochaine_date_coupon', in7Days.toISOString().split('T')[0]);

        // if (couponsThisWeek && couponsThisWeek.length > 0) {
        //   const total = couponsThisWeek.reduce(
        //     (sum, c) => sum + parseFloat(c.coupon_net?.toString() || '0'),
        //     0
        //   );
        //   alertsData.push({
        //     id: 'upcoming-coupons',
        //     type: 'upcoming_coupons',
        //     message: `${couponsThisWeek.length} coupon${couponsThisWeek.length > 1 ? 's' : ''} à payer cette semaine (Total: ${formatCurrency(total)})`,
        //     count: couponsThisWeek.length,
        //   });
        // }

        // setAlerts(alertsData);
      }
    }

    await fetchMonthlyData(selectedYear, startMonth, endMonth);

    setLoading(false);
    if (isRefresh) setRefreshing(false);
  };

  const fetchMonthlyData = async (year: number, start: number, end: number) => {
    const { data: subscriptions, error } = await supabase
      .from('souscriptions')
      .select('montant_investi, date_souscription');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      setMonthlyData([]);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      setMonthlyData([]);
      return;
    }

    const monthlyTotals: { [key: string]: number } = {};
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    for (let month = start; month <= end; month++) {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = 0;
    }

    subscriptions.forEach((sub) => {
      if (sub.date_souscription) {
        const date = new Date(sub.date_souscription);
        const subYear = date.getFullYear();
        const subMonth = date.getMonth();
        const monthKey = `${subYear}-${String(subMonth + 1).padStart(2, '0')}`;

        if (subYear === year && subMonth >= start && subMonth <= end) {
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(sub.montant_investi?.toString() || '0');
        }
      }
    });

    const chartData: MonthlyData[] = [];
    let cumulative = 0;
    for (let month = start; month <= end; month++) {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthAmount = monthlyTotals[monthKey] || 0;
      cumulative += monthAmount;
      chartData.push({
        month: monthNames[month],
        amount: monthAmount,
        cumulative: cumulative,
      });
    }

    setMonthlyData(chartData);
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
              {alerts.length > 0 && (
                <div className="mb-6 mt-6">
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        {alerts.map((alert, index) => (
                          <p key={alert.id} className="text-sm font-medium text-amber-900">
                            {index > 0 && '• '}{alert.message}
                          </p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setAlerts([])}
                      className="text-amber-600 hover:text-amber-800 transition-colors ml-4"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8 mt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Actions Rapides</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => onNavigate('projects', { openCreateModal: true })}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all group border border-blue-200"
                  >
                    <div className="bg-blue-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 text-sm">Nouveau Projet</p>
                      <p className="text-xs text-slate-600">Créer un projet</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowTrancheWizard(true)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all group border border-green-200"
                  >
                    <div className="bg-green-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 text-sm">Nouvelle Tranche</p>
                      <p className="text-xs text-slate-600">Ajouter une tranche</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowPaymentWizard(true)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all group border border-purple-200"
                  >
                    <div className="bg-purple-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 text-sm">Enregistrer Paiement</p>
                      <p className="text-xs text-slate-600">Payer un coupon</p>
                    </div>
                  </button>

                  <button
                    onClick={() => alert('Export en cours de développement')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Évolution des Montants Levés</h2>
                  <div className="flex items-center gap-4">
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as 'monthly' | 'cumulative')}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                    >
                      <option value="monthly">Vue par mois</option>
                      <option value="cumulative">Vue cumulée</option>
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const year = parseInt(e.target.value);
                        setSelectedYear(year);
                        fetchMonthlyData(year, startMonth, endMonth);
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                    <select
                      value={`${startMonth}-${endMonth}`}
                      onChange={(e) => {
                        const [start, end] = e.target.value.split('-').map(Number);
                        setStartMonth(start);
                        setEndMonth(end);
                        fetchMonthlyData(selectedYear, start, end);
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="0-11">Année complète</option>
                      <option value="0-2">Q1 (Jan-Mar)</option>
                      <option value="3-5">Q2 (Avr-Juin)</option>
                      <option value="6-8">Q3 (Juil-Sep)</option>
                      <option value="9-11">Q4 (Oct-Déc)</option>
                      <option value="0-5">S1 (Jan-Juin)</option>
                      <option value="6-11">S2 (Juil-Déc)</option>
                    </select>
                  </div>
                </div>
                {monthlyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-lg">
                    <div className="text-center text-slate-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune donnée disponible</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 flex items-end justify-between gap-2 px-4 pb-4">
                    {monthlyData.map((data, index) => {
                      const displayAmount = viewMode === 'cumulative' ? (data.cumulative || 0) : data.amount;
                      const maxAmount = Math.max(...monthlyData.map(d => viewMode === 'cumulative' ? (d.cumulative || 0) : d.amount), 1);
                      const heightPercentage = Math.max((displayAmount / maxAmount) * 85, displayAmount > 0 ? 5 : 0);
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
                          <div className="relative group flex-1 w-full flex flex-col justify-end items-center">
                            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
                                <div className="font-semibold">{data.month}</div>
                                {viewMode === 'monthly' ? (
                                  <div>{formatCurrency(data.amount)}</div>
                                ) : (
                                  <>
                                    <div className="text-slate-300">Mensuel: {formatCurrency(data.amount)}</div>
                                    <div className="font-semibold">Cumulé: {formatCurrency(data.cumulative || 0)}</div>
                                  </>
                                )}
                              </div>
                              <div className="w-2 h-2 bg-slate-900 transform rotate-45 mx-auto -mt-1"></div>
                            </div>
                            {displayAmount > 0 && (
                              <div className="mb-1 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                {formatCurrency(displayAmount)}
                              </div>
                            )}
                            <div
                              className={`w-full rounded-t-lg transition-all hover:opacity-90 cursor-pointer shadow-md ${
                                viewMode === 'cumulative'
                                  ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-700 hover:to-emerald-500'
                                  : 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500'
                              }`}
                              style={{ height: `${heightPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{data.month}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Derniers Paiements</h2>
                    <button
                      onClick={() => onNavigate('subscriptions')}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      Voir tout <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
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
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Coupons à Venir</h2>
                    <button
                      onClick={() => onNavigate('coupons')}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      Voir tout <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {upcomingCoupons.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Aucun coupon à venir</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingCoupons.map((coupon) => {
                        const daysUntil = Math.ceil(
                          (new Date(coupon.prochaine_date_coupon).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const isUrgent = daysUntil <= 7;

                        return (
                          <div key={coupon.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-slate-900">{formatCurrency(parseFloat(coupon.coupon_brut.toString()))}</p>
                                {isUrgent && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                    <AlertCircle className="w-3 h-3" />
                                    Urgent
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {coupon.tranche?.projet?.projet || 'Projet'} • {coupon.tranche?.tranche_name || 'Tranche'}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                <Users className="w-3 h-3" />
                                <span>{coupon.investor_count} investisseur{coupon.investor_count > 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-900">{formatDate(coupon.prochaine_date_coupon)}</p>
                              <p className="text-xs text-slate-600">{getRelativeDate(coupon.prochaine_date_coupon)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showTrancheWizard && (
        <TrancheWizard
          onClose={() => setShowTrancheWizard(false)}
          onSuccess={() => {
            setShowTrancheWizard(false);
            fetchData();
          }}
        />
      )}

      {showPaymentWizard && (
        <PaymentWizard
          onClose={() => setShowPaymentWizard(false)}
          onSuccess={() => {
            setShowPaymentWizard(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
