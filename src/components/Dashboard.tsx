import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

/* ===========================
   Helpers (pure utils)
=========================== */
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

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

// SIREN validation: exactly 9 digits + Luhn (mod-10)
const isValidSIREN = (value: string) => {
  if (!/^\d{9}$/.test(value)) return false;
  // Luhn for 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(value.charAt(i), 10);
    if ((i % 2) === 1) { // double every second digit (index starting at 0)
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

const groupDigitsWithSpaces = (digitsOnly: string) =>
  digitsOnly ? digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';

const formatMontantDisplay = (digitsOnly: string) => {
  const grouped = groupDigitsWithSpaces(digitsOnly);
  return grouped ? `${grouped} €` : '';
};

/**
 * Génère les alertes dynamiques basées sur les données réelles
 */
const generateAlerts = (
  upcomingCoupons: UpcomingCoupon[],
  recentPayments: Payment[]
): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  
  // 1. PAIEMENTS EN RETARD
  const latePayments = recentPayments.filter(p => {
    if (p.statut === 'payé') return false;
    const paymentDate = new Date(p.date_paiement);
    return paymentDate < now;
  });
  
  if (latePayments.length > 0) {
    const totalLate = latePayments.reduce((sum, p) => sum + p.montant, 0);
    alerts.push({
      id: 'late-payments',
      type: 'late_payment',
      message: `${latePayments.length} paiement${latePayments.length > 1 ? 's' : ''} en retard (${formatCurrency(totalLate)})`,
      count: latePayments.length,
    });
  }

  // 2. COUPONS À PAYER CETTE SEMAINE
  const weekThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = upcomingCoupons.filter(c => {
    const couponDate = new Date(c.prochaine_date_coupon);
    return couponDate >= now && couponDate <= weekThreshold;
  });

  if (upcomingThisWeek.length > 0) {
    const totalAmount = upcomingThisWeek.reduce((sum, c) => sum + c.coupon_brut, 0);
    alerts.push({
      id: 'upcoming-week',
      type: 'upcoming_coupons',
      message: `${upcomingThisWeek.length} coupon${upcomingThisWeek.length > 1 ? 's' : ''} à payer cette semaine (${formatCurrency(totalAmount)})`,
      count: upcomingThisWeek.length,
    });
  }

  // 3. ÉCHÉANCES URGENTES (dans les 3 jours)
  const urgentThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const urgentCoupons = upcomingCoupons.filter(c => {
    const couponDate = new Date(c.prochaine_date_coupon);
    return couponDate >= now && couponDate <= urgentThreshold;
  });

  if (urgentCoupons.length > 0) {
    // Grouper par tranche
    const byTranche = urgentCoupons.reduce((acc, c) => {
      const trancheName = c.tranche?.tranche_name || 'Inconnu';
      if (!acc[trancheName]) {
        acc[trancheName] = { 
          count: 0, 
          date: c.prochaine_date_coupon,
        };
      }
      acc[trancheName].count++;
      return acc;
    }, {} as Record<string, { count: number; date: string }>);

    Object.entries(byTranche).forEach(([tranche, data]) => {
      alerts.push({
        id: `deadline-${tranche}`,
        type: 'deadline',
        message: `Échéance urgente : ${tranche} - ${getRelativeDate(data.date)} (${formatDate(data.date)})`,
        count: data.count,
      });
    });
  }
// 4. RIB MANQUANTS
const { data: ribManquants } = await supabase
  .from('investisseurs')
  .select('id')
  .or('rib_file_path.is.null,rib_status.eq.manquant');

if (ribManquants && ribManquants.length > 0) {
  alerts.push({
    id: 'missing-ribs',
    type: 'deadline',
    message: `${ribManquants.length} investisseur${ribManquants.length > 1 ? 's n\'ont' : ' n\'a'} pas de RIB enregistré`,
    count: ribManquants.length,
  });
}
  // Si aucune alerte, ajouter un message positif
if (alerts.length === 0) {
  alerts.push({
    id: 'no-alerts',
    type: 'deadline',
    message: 'Aucune action urgente. Tous les paiements sont à jour.',
    count: 0,
  });
}
  return alerts;
};

/* ===========================
   Types
=========================== */

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

/* ===========================
   Component
=========================== */

export function Dashboard({ organization }: DashboardProps) {
  const navigate = useNavigate();
  const montantRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  const [stats, setStats] = useState<Stats>({
    totalInvested: 0,
    couponsPaidThisMonth: 0,
    activeProjects: 0,
    upcomingCoupons: 0,
    nextCouponDays: 90,
  });

  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcomingCoupons, setUpcomingCoupons] = useState<UpcomingCoupon[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chart state + cache of raw subs for local filtering
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [chartSubscriptionsAll, setChartSubscriptionsAll] = useState<{ montant_investi: any; date_souscription: string }[]>([]);

  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  const [newProjectData, setNewProjectData] = useState({
    projet: '',
    // Champs financiers (strings for inputs)
    type: 'obligations_simples',  // NEW
    taux_interet: '',           // % ex "8.50"
    montant_global_eur: '',     // digits only
    periodicite_coupon: '',     // 'annuel' | 'semestriel' | 'trimestriel'
    maturite_mois: '',          // NEW
    base_interet: '360',        // NEW
    // Autres champs
    emetteur: '',
    siren_emetteur: '',         // keep as string to preserve leading zeros
    nom_representant: '',
    prenom_representant: '',
    email_representant: '',
    representant_masse: '',
    email_rep_masse: '',
    telephone_rep_masse: ''     // keep as string (leading zeros, +33, etc.)
  });

  const [sirenError, setSirenError] = useState<string>('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Cache with org-specific key + version
  const CACHE_VERSION = 1;
  const CACHE_KEY = `saad_dashboard_cache_v${CACHE_VERSION}_${organization.id}`;
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

  // Mask caret before " €"
  const moveCaretBeforeEuro = () => {
    const el = montantRef.current;
    if (!el) return;
    const display = el.value;
    const pos = Math.max(0, display.length - 2);
    requestAnimationFrame(() => {
      el.setSelectionRange(pos, pos);
    });
  };

 const resetNewProjectForm = useCallback(() => {
    setNewProjectData({
      projet: '',
      type: 'obligations_simples',
      taux_interet: '',
      montant_global_eur: '',
      periodicite_coupon: '',
      maturite_mois: '',
      base_interet: '360',
      emetteur: '',
      siren_emetteur: '',
      nom_representant: '',
      prenom_representant: '',
      email_representant: '',
      representant_masse: '',
      email_rep_masse: '',
      telephone_rep_masse: ''
    });
    setSirenError('');
    requestAnimationFrame(() => moveCaretBeforeEuro());
  }, []);

  // Body scroll lock when modal open
  useEffect(() => {
    if (showNewProject || showTrancheWizard || showQuickPayment) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [showNewProject, showTrancheWizard, showQuickPayment]);

  // Focus trap + Escape close for New Project modal
  useEffect(() => {
    if (!showNewProject) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetNewProjectForm();
        setShowNewProject(false);
      }
      if (e.key === 'Tab' && modalRef.current && firstFocusableRef.current && lastFocusableRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showNewProject, resetNewProjectForm]);

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
        setChartSubscriptionsAll(cachedData.chartSubscriptionsAll || []);
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

      if (projectsRes.error) console.warn('Supabase error projets:', projectsRes.error);
      if (tranchesRes.error) console.warn('Supabase error tranches:', tranchesRes.error);
      if (subscriptionsRes.error) console.warn('Supabase error souscriptions:', subscriptionsRes.error);
      if (monthPaymentsRes.error) console.warn('Supabase error paiements:', monthPaymentsRes.error);
      if (chartSubsRes.error) console.warn('Supabase error chart souscriptions:', chartSubsRes.error);

      const projects = projectsRes.data || [];
      const tranches = tranchesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const monthPayments = monthPaymentsRes.data || [];
      const chartSubscriptions = chartSubsRes.data || [];

      const trancheIds = tranches.map((t) => t.id);

      const totalInvested = subscriptions.reduce((sum, s) => sum + parseFloat(s.montant_investi?.toString() || '0'), 0);
      const couponsPaidThisMonth = monthPayments.reduce((sum, p) => sum + parseFloat(p.montant?.toString() || '0'), 0);
      const upcomingCount = subscriptions.filter(
        s => s.prochaine_date_coupon &&
             s.prochaine_date_coupon >= today.toISOString().split('T')[0] &&
             s.prochaine_date_coupon <= in90Days.toISOString().split('T')[0]
      ).length;

      setStats({
        totalInvested,
        couponsPaidThisMonth,
        activeProjects: projects.length,
        upcomingCoupons: upcomingCount,
        nextCouponDays: 90,
      });

      let recentPaymentsData: any[] = [];
      let groupedCoupons: any[] = [];

      if (trancheIds.length > 0) {
        const [paymentsRes2, couponsRes] = await Promise.all([
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

        if (paymentsRes2.error) console.warn('Supabase error paiements 2:', paymentsRes2.error);
        if (couponsRes.error) console.warn('Supabase error coupons:', couponsRes.error);

        recentPaymentsData = paymentsRes2.data || [];

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
      }

      // Precompute monthly data locally from cached chartSubscriptions
      setChartSubscriptionsAll(chartSubscriptions);
      const monthlyDataResult = processMonthlyData(chartSubscriptions, selectedYear, startMonth, endMonth);
      setMonthlyData(monthlyDataResult);

      const cacheData = {
        stats: {
          totalInvested,
          couponsPaidThisMonth,
          activeProjects: projects.length,
          upcomingCoupons: upcomingCount,
          nextCouponDays: 90,
        },
        recentPayments: recentPaymentsData,
        upcomingCoupons: groupedCoupons.slice(0, 5),
        monthlyData: monthlyDataResult,
        chartSubscriptionsAll: chartSubscriptions
      };
      setRecentPayments(recentPaymentsData as any);
      setUpcomingCoupons(groupedCoupons.slice(0, 5));
      // Générer les alertes dynamiques
      const dynamicAlerts = generateAlerts(groupedCoupons.slice(0, 5), recentPaymentsData as any);
      setAlerts(dynamicAlerts);
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
    let mounted = true;
    (async () => { if (mounted) await fetchData(); })();
    return () => {
      mounted = false;
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
      setChartSubscriptionsAll([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  const handleRefresh = () => window.location.reload();

  // Recompute monthly data locally when year/range changes
  useEffect(() => {
    const data = processMonthlyData(chartSubscriptionsAll, selectedYear, startMonth, endMonth);
    setMonthlyData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, startMonth, endMonth, chartSubscriptionsAll]);

  // Chart max computed once
  const chartMax = useMemo(() => {
    if (!monthlyData.length) return 1;
    return Math.max(
      ...monthlyData.map(d => (viewMode === 'cumulative' ? (d.cumulative || 0) : d.amount)),
      1
    );
  }, [monthlyData, viewMode]);

  // Form validity (front)
  const isFormValid = useMemo(() => {
    const d = newProjectData;
    return (
      !!d.projet &&
      !!d.type &&
      !!d.taux_interet &&
      !!d.montant_global_eur &&
      !!d.periodicite_coupon &&
      !!d.maturite_mois &&
      !!d.base_interet &&
      !!d.emetteur &&
      !!d.siren_emetteur &&
      !!d.prenom_representant &&
      !!d.nom_representant &&
      !!d.email_representant &&
      !!d.representant_masse &&
      !!d.email_rep_masse &&
      !sirenError &&
      isValidSIREN(d.siren_emetteur)
    );
  }, [newProjectData, sirenError]);

  return (
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
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
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
                onClick={() => { setShowNewProject(true); }}
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
                onClick={() => setShowQuickPayment(true)}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all group border border-purple-200"
              >
                <div className="bg-purple-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 text-sm">Nouveau paiement</p>
                  <p className="text-xs text-slate-600">Téléverser le justificatif</p>
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
                  aria-label="Mode d'affichage"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'monthly' | 'cumulative')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                >
                  <option value="monthly">Vue par mois</option>
                  <option value="cumulative">Vue cumulée</option>
                </select>
                <select
                  aria-label="Année"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
                <select
                  aria-label="Plage de mois"
                  value={`${startMonth}-${endMonth}`}
                  onChange={(e) => {
                    const [start, end] = e.target.value.split('-').map(Number);
                    setStartMonth(start);
                    setEndMonth(end);
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
                  const heightPercentage = Math.max((displayAmount / chartMax) * 85, displayAmount > 0 ? 5 : 0);
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
                  onClick={() => navigate('/paiements')}
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
                  onClick={() => navigate('/coupons')}
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
                            <span>{(coupon as any).investor_count || 1} investisseur{((coupon as any).investor_count || 1) > 1 ? 's' : ''}</span>
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

      {/* Tranche & Payment wizards */}
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

      {/* New Project Modal */}
      {showNewProject && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onMouseDown={(e) => {
            // backdrop click to close (but not if clicking inside modal)
            if (e.target === e.currentTarget) {
              resetNewProjectForm();
              setShowNewProject(false);
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 id="new-project-title" className="text-xl font-bold text-slate-900">Nouveau Projet</h3>
                  <p className="text-sm text-slate-600 mt-1">Créer un nouveau projet obligataire</p>
                </div>
                <button
                  ref={firstFocusableRef}
                  onClick={() => { resetNewProjectForm(); setShowNewProject(false); }}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Fermer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setCreatingProject(true);

                if (!isValidSIREN(newProjectData.siren_emetteur)) {
                  setSirenError('SIREN invalide (9 chiffres + clé Luhn).');
                  setCreatingProject(false);
                  return;
                }

                try {
                  const projectToCreate: any = {
                    projet: newProjectData.projet,
                    emetteur: newProjectData.emetteur,
                    type: newProjectData.type,
                    taux_interet: parseFloat(newProjectData.taux_interet),
                    montant_global_eur: newProjectData.montant_global_eur ? parseFloat(newProjectData.montant_global_eur) : null,
                    periodicite_coupon: newProjectData.periodicite_coupon,
                    maturite_mois: parseInt(newProjectData.maturite_mois),
                    base_interet: parseInt(newProjectData.base_interet),
                    // keep identifiers as strings
                    siren_emetteur: newProjectData.siren_emetteur || null,
                    nom_representant: newProjectData.nom_representant || null,
                    prenom_representant: newProjectData.prenom_representant || null,
                    email_representant: newProjectData.email_representant || null,
                    representant_masse: newProjectData.representant_masse || null,
                    email_rep_masse: newProjectData.email_rep_masse || null,
                    telephone_rep_masse: newProjectData.telephone_rep_masse || null,
                  };

                  const { data, error } = await supabase
                    .from('projets')
                    .insert([projectToCreate])
                    .select()
                    .single();

                  if (error) throw error;

                  setShowNewProject(false);
                  resetNewProjectForm();
                  navigate(`/projets/${data.id}`);
                } catch (err: any) {
                  console.error('Error creating project:', err);
                  alert('Erreur lors de la création du projet: ' + err.message);
                } finally {
                  setCreatingProject(false);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="projet" className="block text-sm font-medium text-slate-900 mb-2">
                      Nom du projet <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="projet"
                      type="text"
                      required
                      value={newProjectData.projet}
                      onChange={(e) => setNewProjectData({ ...newProjectData, projet: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech 2025"
                    />
                  </div>

                  {/* Champs financiers requis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-slate-900 mb-2">
                        Type d'obligations <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="type"
                        required
                        value={newProjectData.type}
                        onChange={(e) => setNewProjectData({ ...newProjectData, type: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="obligations_simples">Obligations Simples</option>
                        <option value="obligations_convertibles">Obligations Convertibles</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="taux" className="block text-sm font-medium text-slate-900 mb-2">
                        Taux d'intérêt (%) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="taux"
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        value={newProjectData.taux_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, taux_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 8.50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="maturite" className="block text-sm font-medium text-slate-900 mb-2">
                        Maturité (mois) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="maturite"
                        type="number"
                        required
                        min="1"
                        value={newProjectData.maturite_mois}
                        onChange={(e) => setNewProjectData({ ...newProjectData, maturite_mois: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 60 (5 ans)"
                      />
                      <p className="mt-1 text-xs text-slate-600">Durée totale en mois</p>
                    </div>

                    <div>
                      <label htmlFor="base_interet" className="block text-sm font-medium text-slate-900 mb-2">
                        Base de calcul <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="base_interet"
                        required
                        value={newProjectData.base_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, base_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="360">360 jours (30/360) - Standard</option>
                        <option value="365">365 jours (Exact/365)</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-600">💡 Standard: 360 jours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="montant" className="block text-sm font-medium text-slate-900 mb-2">
                        Taux d’intérêt (%) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="taux"
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        value={newProjectData.taux_interet}
                        onChange={(e) => setNewProjectData({ ...newProjectData, taux_interet: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 8.50"
                      />
                    </div>

                    <div>
                      <label htmlFor="montant" className="block text-sm font-medium text-slate-900 mb-2">
                        Montant global à lever (€) <span className="text-red-600">*</span>
                      </label>
                      {/* Masked input */}
                      <input
                        id="montant"
                        ref={montantRef}
                        type="text"
                        required
                        inputMode="numeric"
                        value={formatMontantDisplay(newProjectData.montant_global_eur)}
                        onChange={() => {}}
                        onFocus={moveCaretBeforeEuro}
                        onClick={moveCaretBeforeEuro}
                        onBeforeInput={(e: any) => {
                          const data = e.data as string | null;
                          const inputType = e.inputType as string;

                          if (inputType === 'insertText' && data && /^\d$/.test(data)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + data
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }
                          if (inputType === 'insertText') {
                            e.preventDefault();
                            return;
                          }
                        }}
                        onKeyDown={(e) => {
                          const navKeys = ['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
                          if (navKeys.includes(e.key)) return;

                          if (/^\d$/.test(e.key)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + e.key
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: prev.montant_global_eur.slice(0, -1)
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          e.preventDefault();
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const text = (e.clipboardData || (window as any).clipboardData).getData('text');
                          const digits = (text || '').replace(/\D/g, '');
                          setNewProjectData(prev => ({
                            ...prev,
                            montant_global_eur: digits
                          }));
                          requestAnimationFrame(moveCaretBeforeEuro);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 1 500 000 €"
                      />
                    </div>

                    <div>
                      <label htmlFor="periodicite" className="block text-sm font-medium text-slate-900 mb-2">
                        Périodicité du coupon <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="periodicite"
                        required
                        value={newProjectData.periodicite_coupon}
                        onChange={(e) => setNewProjectData({ ...newProjectData, periodicite_coupon: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>Choisir…</option>
                        <option value="annuel">Annuel</option>
                        <option value="semestriel">Semestriel</option>
                        <option value="trimestriel">Trimestriel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emetteur" className="block text-sm font-medium text-slate-900 mb-2">
                      Émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="emetteur"
                      type="text"
                      required
                      value={newProjectData.emetteur}
                      onChange={(e) => setNewProjectData({ ...newProjectData, emetteur: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: GreenTech SAS"
                    />
                  </div>

                  <div>
                    <label htmlFor="siren" className="block text-sm font-medium text-slate-900 mb-2">
                      SIREN de l'émetteur <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="siren"
                      type="text"
                      required
                      pattern="^\d{9}$"
                      title="Le SIREN doit comporter exactement 9 chiffres."
                      value={newProjectData.siren_emetteur}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                        setSirenError('');
                      }}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setSirenError(isValidSIREN(v) ? '' : 'SIREN invalide (9 chiffres + clé Luhn).');
                      }}
                      aria-invalid={!!sirenError}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        sirenError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Ex: 123456789"
                      maxLength={9}
                      inputMode="numeric"
                    />
                    {sirenError && (
                      <p className="mt-1 text-sm text-red-600">{sirenError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prenom" className="block text-sm font-medium text-slate-900 mb-2">
                        Prénom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="prenom"
                        type="text"
                        required
                        value={newProjectData.prenom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, prenom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Jean"
                      />
                    </div>
                    <div>
                      <label htmlFor="nom" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="nom"
                        type="text"
                        required
                        value={newProjectData.nom_representant}
                        onChange={(e) => setNewProjectData({ ...newProjectData, nom_representant: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="emailrep" className="block text-sm font-medium text-slate-900 mb-2">
                      Email du représentant <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="emailrep"
                      type="email"
                      required
                      value={newProjectData.email_representant}
                      onChange={(e) => setNewProjectData({ ...newProjectData, email_representant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: jean.dupont@example.com"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Représentant de la masse</h4>

                    <div>
                      <label htmlFor="repmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Nom du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="repmasse"
                        type="text"
                        required
                        value={newProjectData.representant_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, representant_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Cabinet Lefevre"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="emailmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Email du représentant de la masse <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="emailmasse"
                        type="email"
                        required
                        value={newProjectData.email_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, email_rep_masse: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: contact@cabinet-lefevre.fr"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="telmasse" className="block text-sm font-medium text-slate-900 mb-2">
                        Téléphone du représentant de la masse
                      </label>
                      <input
                        id="telmasse"
                        type="tel"
                        pattern="[0-9]*"
                        value={newProjectData.telephone_rep_masse}
                        onChange={(e) => setNewProjectData({ ...newProjectData, telephone_rep_masse: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 0123456789"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { resetNewProjectForm(); setShowNewProject(false); }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={creatingProject}
                  >
                    Annuler
                  </button>
                  <button
                    ref={lastFocusableRef}
                    type="submit"
                    disabled={creatingProject || !isFormValid}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
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

export default Dashboard;
