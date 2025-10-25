import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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

export function Dashboard({ organization }: DashboardProps) {
  const navigate = useNavigate();
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
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    projet: '',
    emetteur: '',
    siren_emetteur: '',
    nom_representant: '',
    prenom_representant: '',
    email_representant: '',
    representant_masse: '',
    email_rep_masse: '',
    telephone_rep_masse: '',
    periodicite_coupon: '',
    maturite_mois: '',
    type_obligations: ''
  });
  const [creatingProject, setCreatingProject] = useState(false);

  const CACHE_KEY = 'saad_dashboard_cache';
  const CACHE_DURATION = 5 * 60 * 1000;

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  const setCachedData = (data: any) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  };

  const fetchData = async () => {
    const isRefresh = !loading;
    if (isRefresh) setRefreshing(true);

    try {
      console.log('Dashboard: Starting data fetch...');

      const cachedData = getCachedData();
      if (cachedData && !isRefresh) {
        console.log('Dashboard: Using cached data');
        setStats(cachedData.stats);
        setRecentPayments(cachedData.recentPayments || []);
        setUpcomingCoupons(cachedData.upcomingCoupons || []);
        setMonthlyData(cachedData.monthlyData || []);
        setLoading(false);
      }

      const today = new Date();
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);
      const in90Days = new Date();
      in90Days.setDate(today.getDate() + 90);

      console.log('Dashboard: Fetching initial data (5 queries in parallel)...');
      const [projectsRes, tranchesRes, subscriptionsRes, monthPaymentsRes, chartSubsRes] = await Promise.all([
        supabase.from('projets').select('id'),
        supabase.from('tranches').select('id, projet_id'),
        supabase.from('souscriptions').select('montant_investi, tranche_id, prochaine_date_coupon, date_souscription'),
        supabase.from('paiements').select('montant').gte('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        supabase.from('souscriptions').select('montant_investi, date_souscription')
      ]);

      console.log('Dashboard: Initial data fetched', {
        projects: projectsRes.data?.length,
        tranches: tranchesRes.data?.length,
        subscriptions: subscriptionsRes.data?.length
      });

      const projects = projectsRes.data || [];
      const tranches = tranchesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const monthPayments = monthPaymentsRes.data || [];
      const chartSubscriptions = chartSubsRes.data || [];

      const projectIds = projects.map((p) => p.id);
      const trancheIds = tranches.map((t) => t.id);

      const activeProjectIds = new Set<string>();
      tranches.forEach((t) => {
        if (subscriptions.some((s) => s.tranche_id === t.id)) {
          activeProjectIds.add(t.projet_id);
        }
      });

      const totalInvested = subscriptions.reduce((sum, sub) => sum + (sub.montant_investi || 0), 0);

      const couponsPaidThisMonth = monthPayments.reduce((sum, p) => sum + (p.montant || 0), 0);

      const upcomingCouponsList = subscriptions.filter((s) => {
        if (!s.prochaine_date_coupon) return false;
        const couponDate = new Date(s.prochaine_date_coupon);
        return couponDate >= today && couponDate <= in90Days;
      });

      const upcomingCouponsCount = upcomingCouponsList.length;

      let nextCouponDays = 90;
      if (upcomingCouponsList.length > 0) {
        const sortedCoupons = upcomingCouponsList
          .map((s) => new Date(s.prochaine_date_coupon!))
          .sort((a, b) => a.getTime() - b.getTime());
        const nextCoupon = sortedCoupons[0];
        nextCouponDays = Math.ceil((nextCoupon.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      console.log('Dashboard: Fetching payments and coupons...');
      const [paymentsRes, couponsRes] = await Promise.all([
        supabase
          .from('paiements')
          .select(`
            id,
            date_paiement,
            montant,
            tranche_id,
            type,
            tranche:tranches(tranche_name, projet_id)
          `)
          .order('date_paiement', { ascending: false })
          .limit(5),
        supabase
          .from('souscriptions')
          .select(`
            id,
            prochaine_date_coupon,
            coupon_brut,
            investisseur_id,
            tranche_id,
            tranche:tranches(
              tranche_name,
              projet_id,
              projet:projets(projet)
            )
          `)
          .not('prochaine_date_coupon', 'is', null)
          .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
          .order('prochaine_date_coupon', { ascending: true })
          .limit(5)
      ]);

      const payments = paymentsRes.data || [];
      const coupons = couponsRes.data || [];

      console.log('Dashboard: Processing monthly data...');
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const monthlyAmounts: { [key: string]: number } = {};

      chartSubscriptions.forEach((sub) => {
        if (sub.date_souscription) {
          const date = new Date(sub.date_souscription);
          if (date.getFullYear() === selectedYear) {
            const monthIndex = date.getMonth();
            const monthKey = monthNames[monthIndex];
            monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + (sub.montant_investi || 0);
          }
        }
      });

      const monthlyDataArray: MonthlyData[] = monthNames.slice(startMonth, endMonth + 1).map((month, idx) => ({
        month,
        amount: monthlyAmounts[month] || 0,
      }));

      let cumulative = 0;
      monthlyDataArray.forEach((data) => {
        cumulative += data.amount;
        data.cumulative = cumulative;
      });

      const newStats = {
        totalInvested,
        couponsPaidThisMonth,
        activeProjects: activeProjectIds.size,
        upcomingCoupons: upcomingCouponsCount,
        nextCouponDays,
      };

      console.log('Dashboard: Data fetch complete!');

      setStats(newStats);
      setRecentPayments(payments);
      setUpcomingCoupons(coupons);
      setMonthlyData(monthlyDataArray);

      setCachedData({
        stats: newStats,
        recentPayments: payments,
        upcomingCoupons: coupons,
        monthlyData: monthlyDataArray,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear, startMonth, endMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const maxAmount = Math.max(...monthlyData.map((d) => (viewMode === 'monthly' ? d.amount : d.cumulative || 0)), 1);

  const QuickActionCard = ({ icon: Icon, title, onClick }: any) => (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
    >
      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <span className="font-medium text-slate-900">{title}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Vue d'ensemble de vos investissements</p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Investi</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalInvested)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Coupons Payés (mois)</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.couponsPaidThisMonth)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Folder className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Projets Actifs</p>
          <p className="text-2xl font-bold text-slate-900">{stats.activeProjects}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Prochains Coupons</p>
          <p className="text-2xl font-bold text-slate-900">{stats.upcomingCoupons}</p>
          <p className="text-xs text-slate-500 mt-1">Dans {stats.nextCouponDays} jours</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard icon={Plus} title="Nouveau Projet" onClick={() => setShowNewProject(true)} />
          <QuickActionCard icon={FileText} title="Nouvelle Tranche" onClick={() => setShowTrancheWizard(true)} />
          <QuickActionCard icon={DollarSign} title="Enregistrer Paiement" onClick={() => setShowQuickPayment(true)} />
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Alertes</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  alert.type === 'deadline'
                    ? 'bg-orange-50 border border-orange-200'
                    : alert.type === 'late_payment'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                {alert.type === 'deadline' && <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'late_payment' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                {alert.type === 'upcoming_coupons' && <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Investissements {selectedYear}</h2>
            <div className="flex items-center gap-2">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'monthly' | 'cumulative')}
                className="px-3 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Mensuel</option>
                <option value="cumulative">Cumulatif</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64">
            {monthlyData.length > 0 ? (
              <div className="flex items-end justify-between h-full gap-2">
                {monthlyData.map((data, index) => {
                  const value = viewMode === 'monthly' ? data.amount : data.cumulative || 0;
                  const height = maxAmount > 0 ? (value / maxAmount) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative flex-1 w-full flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer group"
                          style={{ height: `${height}%` }}
                          title={`${data.month}: ${formatCurrency(value)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatCurrency(value)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 font-medium">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Paiements Récents</h2>
            <button
              onClick={() => navigate('/paiements')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{payment.tranche?.tranche_name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{formatDate(payment.date_paiement)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(payment.montant)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>Aucun paiement récent</p>
            </div>
          )}
        </div>

        {/* Upcoming Coupons */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Prochains Coupons</h2>
            <button
              onClick={() => navigate('/souscriptions')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {upcomingCoupons.length > 0 ? (
            <div className="space-y-3">
              {upcomingCoupons.map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{coupon.tranche?.projet?.projet || 'N/A'}</p>
                      <p className="text-sm text-slate-600">{coupon.tranche?.tranche_name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{formatDate(coupon.prochaine_date_coupon)}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(coupon.coupon_brut)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p>Aucun coupon à venir</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTrancheWizard && (
        <TrancheWizard
          onClose={() => setShowTrancheWizard(false)}
          onSuccess={() => {
            setShowTrancheWizard(false);
            fetchData();
          }}
        />
      )}

      {showQuickPayment && (
        <PaymentWizard
          onClose={() => setShowQuickPayment(false)}
          onSuccess={() => {
            setShowQuickPayment(false);
            fetchData();
          }}
        />
      )}

      {showNewProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Nouveau Projet</h3>
                  <p className="text-sm text-slate-600 mt-1">Créer un nouveau projet obligataire</p>
                </div>
                <button onClick={() => setShowNewProject(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setCreatingProject(true);

                try {
                  const projectToCreate: any = {
                    projet: newProjectData.projet,
                    emetteur: newProjectData.emetteur,
                    siren_emetteur: parseInt(newProjectData.siren_emetteur),
                    nom_representant: newProjectData.nom_representant,
                    prenom_representant: newProjectData.prenom_representant,
                    email_representant: newProjectData.email_representant,
                    representant_masse: newProjectData.representant_masse,
                    email_rep_masse: newProjectData.email_rep_masse,
                    periodicite_coupon: newProjectData.periodicite_coupon,
                    maturite_mois: parseInt(newProjectData.maturite_mois),
                    type_obligations: newProjectData.type_obligations
                  };

                  if (newProjectData.telephone_rep_masse) {
                    projectToCreate.telephone_rep_masse = parseInt(newProjectData.telephone_rep_masse);
                  }

                  const { data, error } = await supabase
                    .from('projets')
                    .insert([projectToCreate])
                    .select()
                    .single();

                  if (error) throw error;

                  setShowNewProject(false);
                  setNewProjectData({
                    projet: '',
                    emetteur: '',
                    siren_emetteur: '',
                    nom_representant: '',
                    prenom_representant: '',
                    email_representant: '',
                    representant_masse: '',
                    email_rep_masse: '',
                    telephone_rep_masse: '',
                    periodicite_coupon: '',
                    maturite_mois: '',
                    type_obligations: ''
                  });

                  navigate(`/projets/${data.id}`);
                } catch (err: any) {
                  console.error('Error creating project:', err);
                  alert('Erreur lors de la création du projet: ' + err.message);
                } finally {
                  setCreatingProject(false);
                }
              }}>
                <div className="space-y-4">
                  {/* Nom du projet */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Nom du projet <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectData.projet}
                      onChange={(e) => setNewProjectData({ ...newProjectData, projet: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech 2025"
                    />
                  </div>

                  {/* Émetteur */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newProjectData.emetteur}
                      onChange={(e) => setNewProjectData({ ...newProjectData, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech SAS"
                    />
                  </div>

                  {/* SIREN */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      SIREN de l'émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]*"
                      value={newProjectData.siren_emetteur}
                      onChange={(e) => setNewProjectData({ ...newProjectData, siren_emetteur: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 123456789"
                      maxLength={9}
                    />
                  </div>

                  {/* Type d'obligations */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Type d'obligations <span className="text-red-600">*</span>
                    </label>
                    <select
                      required
                      value={newProjectData.type_obligations}
                      onChange={(e) => setNewProjectData({ ...newProjectData, type_obligations: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionnez le type</option>
                      <option value="Obligations simples">Obligations simples</option>
                      <option value="Obligations convertibles">Obligations convertibles</option>
                      <option value="Obligations remboursables en actions">Obligations remboursables en actions (ORA)</option>
                      <option value="Autres">Autres</option>
                    </select>
                  </div>

                  {/* Fréquence des coupons */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Fréquence des coupons <span className="text-red-600">*</span>
                    </label>
                    <select
                      required
                      value={newProjectData.periodicite_coupon}
                      onChange={(e) => setNewProjectData({ ...newProjectData, periodicite_coupon: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionnez la fréquence</option>
                      <option value="Mensuel">Mensuel</option>
                      <option value="Trimestriel">Trimestriel</option>
                      <option value="Semestriel">Semestriel</option>
                      <option value="Annuel">Annuel</option>
                    </select>
                  </div>

                  {/* Maturité en mois */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Maturité (en mois) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newProjectData.maturite_mois}
                      onChange={(e) => setNewProjectData({ ...newProjectData, maturite_mois: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 60 (pour 5 ans)"
                    />
                  </div>

                  {/* Prénom et Nom du représentant */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Prénom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newProjectData.prenom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, prenom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Jean"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newProjectData.nom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, nom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Dupont"
                      />
                    </div>
                  </div>

                  {/* Email du représentant */}
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Email du représentant <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newProjectData.email_representant}
                      onChange={(e) => setNewProjectData({ ...newProjectData, email_representant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: jean.dupont@example.com"
                    />
                  </div>

                  {/* Représentant de la masse */}
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Représentant de la masse</h4>

                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newProjectData.representant_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, representant_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Cabinet Lefevre"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Email du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newProjectData.email_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, email_rep_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: contact@cabinet-lefevre.fr"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-900 mb-2">
                        Téléphone du représentant de la masse
                      </label>
                      <input
                        type="tel"
                        value={newProjectData.telephone_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, telephone_rep_masse: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 0123456789"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                    disabled={creatingProject}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={creatingProject}
                  >
                    {creatingProject ? 'Création...' : 'Créer le projet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}