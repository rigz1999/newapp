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
    // Nouveaux champs
    taux_interet: '',           // % ex "8.50"
    montant_global_eur: '',     // € ex "1500000"
    periodicite_coupon: '',     // 'annuel' | 'semestriel' | 'trimestriel'
    // Anciens champs
    emetteur: '',
    siren_emetteur: '',
    nom_representant: '',
    prenom_representant: '',
    email_representant: '',
    representant_masse: '',
    email_rep_masse: '',
    telephone_rep_masse: '' // SEUL champ non requis
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
      const cachedData = getCachedData();
      if (cachedData && !isRefresh) {
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

      const [projectsRes, tranchesRes, subscriptionsRes, monthPaymentsRes, chartSubsRes] = await Promise.all([
        supabase.from('projets').select('id'),
        supabase.from('tranches').select('id, projet_id'),
        supabase.from('souscriptions').select('montant_investi, tranche_id, prochaine_date_coupon, date_souscription'),
        supabase.from('paiements').select('montant').eq('statut', 'paid').gte('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        supabase.from('souscriptions').select('montant_investi, date_souscription')
      ]);

      const projects = projectsRes.data || [];
      const tranches = tranchesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const monthPayments = monthPaymentsRes.data || [];
      const chartSubscriptions = chartSubsRes.data || [];

      const projectIds = projects.map((p) => p.id);
      const trancheIds = tranches.map((t) => t.id);

      const totalInvested = subscriptions.reduce((sum, s) => sum + parseFloat(s.montant_investi?.toString() || '0'), 0);
      const couponsPaidThisMonth = monthPayments.reduce((sum, p) => sum + parseFloat(p.montant.toString()), 0);
      const upcomingCount = subscriptions.filter(
        s => s.prochaine_date_coupon &&
             s.prochaine_date_coupon >= today.toISOString().split('T')[0] &&
             s.prochaine_date_coupon <= in90Days.toISOString().split('T')[0]
      ).length;

      setStats({
        totalInvested,
        couponsPaidThisMonth,
        activeProjects: projectIds.length,
        upcomingCoupons: upcomingCount,
        nextCouponDays: 90,
      });

      let recentPaymentsData: any[] = [];
      let groupedCoupons: any[] = [];

      if (trancheIds.length > 0) {
        const [paymentsRes, couponsRes] = await Promise.all([
          supabase.from('paiements').select(`
              id, id_paiement, montant, date_paiement, statut,
              tranche:tranches(tranche_name, projet_id)
            `).in('tranche_id', trancheIds).in('statut', ['Payé', 'paid']).order('date_paiement', { ascending: false }).limit(5),
          supabase.from('souscriptions').select(`
              id, tranche_id, prochaine_date_coupon, coupon_brut, investisseur_id,
              tranche:tranches(
                tranche_name, projet_id,
                projet:projets(projet)
              )
            `).in('tranche_id', trancheIds).gte('prochaine_date_coupon', today.toISOString().split('T')[0]).order('prochaine_date_coupon', { ascending: true }).limit(10)
        ]);

        recentPaymentsData = paymentsRes.data || [];
        setRecentPayments(recentPaymentsData as any);

        groupedCoupons = (couponsRes.data || []).reduce((acc: any[], coupon: any) => {
          const key = `${coupon.tranche_id}-${coupon.prochaine_date_coupon}`;
          const existing = acc.find(c => `${c.tranche_id}-${c.prochaine_date_coupon}` === key);

          if (existing) {
            existing.investor_count += 1;
            existing.coupon_brut = parseFloat(existing.coupon_brut) + parseFloat(coupon.coupon_brut);
          } else {
            acc.push({ ...coupon, investor_count: 1 });
          }
          return acc;
        }, []);

        setUpcomingCoupons(groupedCoupons.slice(0, 5));
      }

      const monthlyDataResult = processMonthlyData(chartSubscriptions, selectedYear, startMonth, endMonth);
      setMonthlyData(monthlyDataResult);

      const cacheData = {
        stats: {
          totalInvested,
          couponsPaidThisMonth,
          activeProjects: projectIds.length,
          upcomingCoupons: upcomingCount,
          nextCouponDays: 90,
        },
        recentPayments: recentPaymentsData,
        upcomingCoupons: groupedCoupons.slice(0, 5),
        monthlyData: monthlyDataResult
      };
      setCachedData(cacheData);

      setLoading(false);
      if (isRefresh) setRefreshing(false);
    } catch (error) {
      console.error('Dashboard: Error fetching data', error);
      localStorage.removeItem(CACHE_KEY);
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const processMonthlyData = (subscriptions: any[], year: number, start: number, end: number) => {
    if (!subscriptions || subscriptions.length === 0) return [];

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

    return chartData;
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      isMounted = false;
      setStats({
        totalInvested: 0,
        couponsPaidThisMonth: 0,
        activeProjects: 0,
        upcomingCoupons: 0,
        nextCouponDays: 90,
      });
      setRecentPayments([]);
      setUpcomingCoupons([]);
      setMonthlyData([]);
    };
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

  // Validation SIREN (exactement 9 chiffres)
  const isSirenValid = /^\d{9}$/.test(newProjectData.siren_emetteur || '');

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
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
                    onClick={() => setShowNewProject(true)}
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
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-
