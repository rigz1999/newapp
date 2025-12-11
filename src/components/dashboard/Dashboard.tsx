import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TrancheWizard } from '../tranches/TrancheWizard';
import { PaymentWizard } from '../payments/PaymentWizard';
import { getDashboardCacheKey, onCacheInvalidated } from '../../utils/cacheManager';
import { AlertModal } from '../common/Modals';
import { DashboardSkeleton } from '../common/Skeleton';
import { ExportModal } from './ExportModal';
import { DashboardStats } from './DashboardStats';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardRecentPayments } from './DashboardRecentPayments';
import {
  formatCurrency,
  formatDate,
  getRelativeDate,
  formatMontantDisplay,
} from '../../utils/formatters';
import Decimal from 'decimal.js';
import { isValidSIREN } from '../../utils/validators';
import {
  generateAlerts,
  type Alert,
  type Payment,
  type UpcomingCoupon,
} from '../../utils/dashboardAlerts';
import {
  RefreshCw,
  AlertCircle,
  X,
  TrendingUp,
} from 'lucide-react';

// generateAlerts function now imported from utils/dashboardAlerts.ts

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

// Payment, UpcomingCoupon, Alert now imported from utils/dashboardAlerts.ts

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

  // Cache key and duration - defined early
  const CACHE_KEY = getDashboardCacheKey(organization.id);
  const CACHE_DURATION = 5 * 60 * 1000;

  // Cache getter - defined early for useState initializer
  const checkCachedData = (): unknown => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }
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

  // Fonction pour gérer les clics sur les alertes
  const handleAlertClick = (alertId: string): void => {
    if (alertId === 'no-alerts') {
      return;
    } // Ne rien faire si message positif

    if (alertId === 'late-payments') {
      navigate('/paiements');
    } else if (alertId === 'upcoming-week') {
      navigate('/paiements');
    } else if (alertId === 'missing-ribs') {
      navigate('/investisseurs');
    } else if (alertId.startsWith('deadline-')) {
      navigate('/paiements');
    }
  };

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
  // Check if we have cached data to avoid showing skeleton on return
  const [loading, setLoading] = useState(() => {
    const cached = checkCachedData();
    return !cached; // Only show loading if no cache
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chart state + cache of raw subs for local filtering
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [chartSubscriptionsAll, setChartSubscriptionsAll] = useState<
    { montant_investi: number; date_souscription: string }[]
  >([]);

  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [newProjectData, setNewProjectData] = useState({
    projet: '',
    // Champs financiers (strings for inputs)
    type: 'obligations_simples', // NEW
    taux_interet: '', // % ex "8.50"
    montant_global_eur: '', // digits only
    periodicite_coupon: '', // 'annuel' | 'semestriel' | 'trimestriel'
    maturite_mois: '', // NEW
    base_interet: '360', // NEW
    // Autres champs
    emetteur: '',
    siren_emetteur: '', // keep as string to preserve leading zeros
    nom_representant: '',
    prenom_representant: '',
    email_representant: '',
    representant_masse: '',
    email_rep_masse: '',
    telephone_rep_masse: '', // keep as string (leading zeros, +33, etc.)
  });

  const [sirenError, setSirenError] = useState<string>('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  // getCachedData is now defined early in the component as checkCachedData
  const getCachedData = checkCachedData;

  const setCachedData = (data: unknown): void => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Silently ignore localStorage errors
    }
  };

  // Mask caret before " €"
  const moveCaretBeforeEuro = (): void => {
    const el = montantRef.current;
    if (!el) {
      return;
    }
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
      telephone_rep_masse: '',
    });
    setSirenError('');
    requestAnimationFrame(() => moveCaretBeforeEuro());
  }, []);

  // Body scroll lock when modal open
  useEffect(() => {
    if (showNewProject || showTrancheWizard || showQuickPayment || showExportModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showNewProject, showTrancheWizard, showQuickPayment, showExportModal]);

  // Validate SIREN whenever it changes
  useEffect(() => {
    if (newProjectData.siren_emetteur && newProjectData.siren_emetteur.length === 9) {
      setSirenError(
        isValidSIREN(newProjectData.siren_emetteur) ? '' : 'SIREN invalide (9 chiffres + clé Luhn).'
      );
    } else if (newProjectData.siren_emetteur) {
      setSirenError('');
    }
  }, [newProjectData.siren_emetteur]);

  // Focus trap + Escape close for New Project modal
  useEffect(() => {
    if (!showNewProject) {
      return;
    }

    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        resetNewProjectForm();
        setShowNewProject(false);
        return;
      }
      if (
        e.key === 'Tab' &&
        modalRef.current &&
        firstFocusableRef.current &&
        lastFocusableRef.current
      ) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) {
          return;
        }
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
    document.addEventListener('keydown', handleKey, { capture: true });
    return () => document.removeEventListener('keydown', handleKey, { capture: true });
  }, [showNewProject, resetNewProjectForm]);

  // Listen for cache invalidation events from other components
  useEffect(() => {
    const cleanup = onCacheInvalidated(() => {
      handleRefresh();
    });
    return cleanup;
  }, []);

  const fetchData = async () => {
    const isRefresh = !loading;
    if (isRefresh) {
      setRefreshing(true);
    }

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

      const [projectsRes, tranchesRes, subscriptionsRes, monthPaymentsRes] =
        await Promise.all([
          supabase.from('projets').select('id'),
          supabase.from('tranches').select('id, projet_id'),
          supabase
            .from('souscriptions')
            .select('montant_investi, tranche_id, prochaine_date_coupon, date_souscription'),
          supabase
            .from('paiements')
            .select('montant, statut')
            .eq('statut', 'payé')
            .gte('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        ]);

      // Check for critical errors
      const errors = [
        projectsRes.error && 'Erreur lors du chargement des projets',
        tranchesRes.error && 'Erreur lors du chargement des tranches',
        subscriptionsRes.error && 'Erreur lors du chargement des souscriptions',
        monthPaymentsRes.error && 'Erreur lors du chargement des paiements',
      ].filter(Boolean);

      if (errors.length > 0) {
        console.warn('Dashboard data errors:', {
          projects: projectsRes.error,
          tranches: tranchesRes.error,
          subscriptions: subscriptionsRes.error,
          payments: monthPaymentsRes.error,
        });
        setError(errors.join(', '));
      } else {
        setError(null);
      }

      const projects = projectsRes.data || [];
      const tranches = tranchesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const monthPayments = monthPaymentsRes.data || [];
      const chartSubscriptions = subscriptions;

      const trancheIds = tranches.map((t: { id: string }) => t.id);

      const totalInvested = subscriptions.reduce(
        (sum: number, s: { montant_investi?: number | string }) =>
          sum + parseFloat(s.montant_investi?.toString() || '0'),
        0
      );
      const couponsPaidThisMonth = monthPayments.reduce(
        (sum: number, p: { montant?: number | string }) =>
          sum + parseFloat(p.montant?.toString() || '0'),
        0
      );
      const upcomingCount = subscriptions.filter(
        (s: { prochaine_date_coupon?: string }) =>
          s.prochaine_date_coupon &&
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

      let recentPaymentsData: Payment[] = [];
      let groupedCoupons: UpcomingCoupon[] = [];

      if (trancheIds.length > 0) {
        const [paymentsRes2, couponsRes] = await Promise.all([
          supabase
            .from('paiements')
            .select(
              `
              id, id_paiement, montant, date_paiement, statut,
              tranche:tranches(tranche_name, projet_id)
            `
            )
            .in('tranche_id', trancheIds)
            .eq('statut', 'payé')
            .order('date_paiement', { ascending: false })
            .limit(5),
          supabase
            .from('souscriptions')
            .select(
              `
              id, tranche_id, prochaine_date_coupon, coupon_brut, investisseur_id,
              tranche:tranches(
                tranche_name, projet_id,
                projet:projets(projet)
              )
            `
            )
            .in('tranche_id', trancheIds)
            .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
            .order('prochaine_date_coupon', { ascending: true })
            .limit(10),
        ]);

        if (paymentsRes2.error) {
          console.warn('Supabase error paiements 2:', paymentsRes2.error);
        }
        if (couponsRes.error) {
          console.warn('Supabase error coupons:', couponsRes.error);
        }

        recentPaymentsData = paymentsRes2.data || [];

        interface CouponData {
          tranche_id: string;
          prochaine_date_coupon: string;
          coupon_brut: number;
          investor_count?: number;
          [key: string]: unknown;
        }

        groupedCoupons = (couponsRes.data || []).reduce((acc: CouponData[], coupon: CouponData) => {
          const key = `${coupon.tranche_id}-${coupon.prochaine_date_coupon}`;
          const existing = acc.find(c => `${c.tranche_id}-${c.prochaine_date_coupon}` === key);

          if (existing) {
            existing.investor_count = (existing.investor_count || 0) + 1;
            existing.coupon_brut = new Decimal(existing.coupon_brut)
              .plus(new Decimal(coupon.coupon_brut))
              .toNumber();
          } else {
            acc.push({ ...coupon, investor_count: 1 });
          }
          return acc;
        }, []) as UpcomingCoupon[];
      }

      // Precompute monthly data locally from cached chartSubscriptions
      setChartSubscriptionsAll(chartSubscriptions);
      const monthlyDataResult = processMonthlyData(
        chartSubscriptions,
        selectedYear,
        startMonth,
        endMonth
      );
      setMonthlyData(monthlyDataResult);

      // Récupérer les RIB manquants
      const { data: ribManquantsData } = await supabase
        .from('investisseurs')
        .select('id')
        .or('rib_file_path.is.null,rib_status.eq.manquant');

      const ribManquantsCount = ribManquantsData?.length || 0;
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
        chartSubscriptionsAll: chartSubscriptions,
      };
      setRecentPayments(recentPaymentsData);
      setUpcomingCoupons(groupedCoupons.slice(0, 5));
      // Générer les alertes dynamiques
      const dynamicAlerts = generateAlerts(
        groupedCoupons.slice(0, 5),
        recentPaymentsData,
        ribManquantsCount
      );
      setAlerts(dynamicAlerts);
      setCachedData(cacheData);

      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching data', error);
      localStorage.removeItem(CACHE_KEY);
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const processMonthlyData = (
    subscriptions: { montant_investi?: number | string; date_souscription?: string }[],
    year: number,
    start: number,
    end: number
  ): MonthlyData[] => {
    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }
    const monthlyTotals: { [key: string]: number } = {};
    const monthNames = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Juin',
      'Juil',
      'Août',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];

    for (let month = start; month <= end; month++) {
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = 0;
    }

    subscriptions.forEach(sub => {
      if (sub.date_souscription) {
        const date = new Date(sub.date_souscription);
        const subYear = date.getFullYear();
        const subMonth = date.getMonth();
        const monthKey = `${subYear}-${String(subMonth + 1).padStart(2, '0')}`;

        if (subYear === year && subMonth >= start && subMonth <= end) {
          monthlyTotals[monthKey] =
            (monthlyTotals[monthKey] || 0) + parseFloat(sub.montant_investi?.toString() || '0');
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
    (async () => {
      if (mounted) {
        await fetchData();
      }
    })();
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

  const handleRefresh = (): void => window.location.reload();

  // Recompute monthly data locally when year/range changes
  useEffect(() => {
    const data = processMonthlyData(chartSubscriptionsAll, selectedYear, startMonth, endMonth);
    setMonthlyData(data);
  }, [selectedYear, startMonth, endMonth, chartSubscriptionsAll]);

  // Chart max computed once
  const chartMax = useMemo(() => {
    if (!monthlyData.length) {
      return 1;
    }
    return Math.max(
      ...monthlyData.map(d => (viewMode === 'cumulative' ? d.cumulative || 0 : d.amount)),
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
          className="flex items-center gap-2 px-4 py-2 bg-finixar-brand-blue text-white rounded-lg hover:bg-finixar-brand-blue-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && !loading && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Erreur de chargement</h3>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  handleRefresh();
                }}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline font-medium"
              >
                Réessayer
              </button>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-finixar-red hover:text-red-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <DashboardAlerts
            alerts={alerts}
            onAlertClick={handleAlertClick}
            onDismiss={() => setAlerts([])}
          />

          <DashboardQuickActions
            onNewProject={() => setShowNewProject(true)}
            onNewTranche={() => setShowTrancheWizard(true)}
            onNewPayment={() => setShowQuickPayment(true)}
            onExport={() => setShowExportModal(true)}
          />

          <DashboardStats stats={stats} />

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Évolution des Montants Levés</h2>
              <div className="flex items-center gap-4">
                <select
                  aria-label="Mode d'affichage"
                  value={viewMode}
                  onChange={e => setViewMode(e.target.value as 'monthly' | 'cumulative')}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent font-medium"
                >
                  <option value="monthly">Vue par mois</option>
                  <option value="cumulative">Vue cumulée</option>
                </select>
                <select
                  aria-label="Année"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
                <select
                  aria-label="Plage de mois"
                  value={`${startMonth}-${endMonth}`}
                  onChange={e => {
                    const [start, end] = e.target.value.split('-').map(Number);
                    setStartMonth(start);
                    setEndMonth(end);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent"
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
                  const displayAmount =
                    viewMode === 'cumulative' ? data.cumulative || 0 : data.amount;
                  const heightPercentage = Math.max(
                    (displayAmount / chartMax) * 85,
                    displayAmount > 0 ? 5 : 0
                  );
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
                                <div className="text-slate-300">
                                  Mensuel: {formatCurrency(data.amount)}
                                </div>
                                <div className="font-semibold">
                                  Cumulé: {formatCurrency(data.cumulative || 0)}
                                </div>
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
                              ? 'bg-gradient-to-t from-finixar-purple to-finixar-teal hover:from-finixar-purple-hover hover:to-finixar-teal-hover'
                              : 'bg-gradient-to-t from-finixar-teal to-finixar-purple hover:from-finixar-purple hover:to-finixar-teal'
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

          <DashboardRecentPayments
            recentPayments={recentPayments}
            upcomingCoupons={upcomingCoupons}
            onViewAllPayments={() => navigate('/paiements')}
            onViewAllCoupons={() => navigate('/coupons')}
          />
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
          onMouseDown={e => {
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
                  <h3 id="new-project-title" className="text-xl font-bold text-slate-900">
                    Nouveau Projet
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Créer un nouveau projet obligataire</p>
                </div>
                <button
                  ref={firstFocusableRef}
                  onClick={() => {
                    resetNewProjectForm();
                    setShowNewProject(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Fermer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form
                autoComplete="off"
                onSubmit={async e => {
                  e.preventDefault();
                  setCreatingProject(true);

                  if (!isValidSIREN(newProjectData.siren_emetteur)) {
                    setSirenError('SIREN invalide (9 chiffres + clé Luhn).');
                    setCreatingProject(false);
                    return;
                  }

                  try {
                    const projectToCreate = {
                      projet: newProjectData.projet,
                      emetteur: newProjectData.emetteur,
                      type: newProjectData.type,
                      taux_interet: parseFloat(newProjectData.taux_interet),
                      montant_global_eur: newProjectData.montant_global_eur
                        ? parseFloat(newProjectData.montant_global_eur)
                        : null,
                      periodicite_coupons: newProjectData.periodicite_coupon,
                      maturite_mois: parseInt(newProjectData.maturite_mois, 10),
                      base_interet: parseInt(newProjectData.base_interet, 10),
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

                    if (error) {
                      throw error;
                    }

                    setShowNewProject(false);
                    resetNewProjectForm();
                    navigate(`/projets/${data.id}`);
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    setAlertModalConfig({
                      title: 'Erreur',
                      message: `Erreur lors de la création du projet: ${errorMessage}`,
                      type: 'error',
                    });
                    setShowAlertModal(true);
                  } finally {
                    setCreatingProject(false);
                  }
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="projet"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      Nom du projet <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="projet"
                      name="project_title_dash"
                      type="text"
                      required
                      autoComplete="off"
                      value={newProjectData.projet}
                      onChange={e =>
                        setNewProjectData({ ...newProjectData, projet: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: GreenTech 2025"
                    />
                  </div>

                  {/* Champs financiers requis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Type d'obligations <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="type"
                        required
                        value={newProjectData.type}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, type: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="obligations_simples">Obligations Simples</option>
                        <option value="obligations_convertibles">Obligations Convertibles</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="taux"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Taux d'intérêt (%) <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="taux"
                        name="interest_rate_dash"
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        max="100"
                        inputMode="decimal"
                        autoComplete="off"
                        value={newProjectData.taux_interet}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, taux_interet: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 8.50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="maturite"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Maturité (mois) <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="maturite"
                        name="maturity_months_dash"
                        type="number"
                        required
                        min="1"
                        autoComplete="off"
                        value={newProjectData.maturite_mois}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, maturite_mois: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 60 (5 ans)"
                      />
                      <p className="mt-1 text-xs text-slate-600">Durée totale en mois</p>
                    </div>

                    <div>
                      <label
                        htmlFor="base_interet"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Base de calcul <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="base_interet"
                        required
                        value={newProjectData.base_interet}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, base_interet: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="360">360 jours (30/360) - Standard</option>
                        <option value="365">365 jours (Exact/365)</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-600">💡 Standard: 360 jours</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="montant"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Montant global à lever (€) <span className="text-finixar-red">*</span>
                      </label>
                      {/* Masked input */}
                      <input
                        id="montant"
                        name="global_amount_dash"
                        ref={montantRef}
                        type="text"
                        required
                        autoComplete="off"
                        inputMode="numeric"
                        value={formatMontantDisplay(newProjectData.montant_global_eur)}
                        onChange={() => {}}
                        onFocus={moveCaretBeforeEuro}
                        onClick={moveCaretBeforeEuro}
                        onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                          const event = e.nativeEvent as InputEvent;
                          const data = event.data;
                          const inputType = event.inputType;

                          if (inputType === 'insertText' && data && /^\d$/.test(data)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + data,
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }
                          if (inputType === 'insertText') {
                            e.preventDefault();
                            return;
                          }
                        }}
                        onKeyDown={e => {
                          const navKeys = [
                            'Tab',
                            'ArrowLeft',
                            'ArrowRight',
                            'ArrowUp',
                            'ArrowDown',
                            'Home',
                            'End',
                          ];
                          if (navKeys.includes(e.key)) {
                            return;
                          }

                          if (/^\d$/.test(e.key)) {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: (prev.montant_global_eur || '') + e.key,
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          if (e.key === 'Backspace' || e.key === 'Delete') {
                            e.preventDefault();
                            setNewProjectData(prev => ({
                              ...prev,
                              montant_global_eur: prev.montant_global_eur.slice(0, -1),
                            }));
                            requestAnimationFrame(moveCaretBeforeEuro);
                            return;
                          }

                          e.preventDefault();
                        }}
                        onPaste={e => {
                          e.preventDefault();
                          const clipboardData = e.clipboardData;
                          const text = clipboardData?.getData('text') || '';
                          const digits = text.replace(/\D/g, '');
                          setNewProjectData(prev => ({
                            ...prev,
                            montant_global_eur: digits,
                          }));
                          requestAnimationFrame(moveCaretBeforeEuro);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 1 500 000 €"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="periodicite"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Périodicité du coupon <span className="text-finixar-red">*</span>
                      </label>
                      <select
                        id="periodicite"
                        required
                        value={newProjectData.periodicite_coupon}
                        onChange={e =>
                          setNewProjectData({
                            ...newProjectData,
                            periodicite_coupon: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      >
                        <option value="" disabled>
                          Choisir…
                        </option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="trimestriel">Trimestriel</option>
                        <option value="semestriel">Semestriel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="emetteur"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      Émetteur <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="emetteur"
                      name="company_issuer_dash"
                      type="text"
                      required
                      autoComplete="off"
                      value={newProjectData.emetteur}
                      onChange={e =>
                        setNewProjectData({ ...newProjectData, emetteur: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: GreenTech SAS"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="siren"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      SIREN de l'émetteur <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="siren"
                      name="company_siren_dash"
                      type="text"
                      required
                      autoComplete="off"
                      pattern="^\d{9}$"
                      title="Le SIREN doit comporter exactement 9 chiffres."
                      value={newProjectData.siren_emetteur}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const digits = pastedText.replace(/\D/g, '').slice(0, 9);
                        setNewProjectData({ ...newProjectData, siren_emetteur: digits });
                      }}
                      aria-invalid={!!sirenError}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue ${
                        sirenError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Ex: 123456789"
                      maxLength={9}
                      inputMode="numeric"
                    />
                    {sirenError && <p className="mt-1 text-sm text-finixar-red">{sirenError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="prenom"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Prénom du représentant <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="prenom"
                        name="rep_given_name_dash"
                        type="text"
                        required
                        autoComplete="off"
                        value={newProjectData.prenom_representant}
                        onChange={e =>
                          setNewProjectData({
                            ...newProjectData,
                            prenom_representant: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Jean"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="nom"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Nom du représentant <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="nom"
                        name="rep_family_name_dash"
                        type="text"
                        required
                        autoComplete="off"
                        value={newProjectData.nom_representant}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, nom_representant: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Dupont"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="emailrep"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      Email du représentant <span className="text-finixar-red">*</span>
                    </label>
                    <input
                      id="emailrep"
                      name="rep_contact_email_dash"
                      type="email"
                      required
                      autoComplete="off"
                      value={newProjectData.email_representant}
                      onChange={e =>
                        setNewProjectData({ ...newProjectData, email_representant: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                      placeholder="Ex: jean.dupont@example.com"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">
                      Représentant de la masse
                    </h4>

                    <div>
                      <label
                        htmlFor="repmasse"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Nom du représentant de la masse <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="repmasse"
                        name="masse_rep_name_dash"
                        type="text"
                        required
                        autoComplete="off"
                        value={newProjectData.representant_masse}
                        onChange={e =>
                          setNewProjectData({
                            ...newProjectData,
                            representant_masse: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: Cabinet Lefevre"
                      />
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="emailmasse"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Email du représentant de la masse{' '}
                        <span className="text-finixar-red">*</span>
                      </label>
                      <input
                        id="emailmasse"
                        name="masse_contact_email_dash"
                        type="email"
                        required
                        autoComplete="off"
                        value={newProjectData.email_rep_masse}
                        onChange={e =>
                          setNewProjectData({ ...newProjectData, email_rep_masse: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: contact@cabinet-lefevre.fr"
                      />
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="telmasse"
                        className="block text-sm font-medium text-slate-900 mb-2"
                      >
                        Téléphone du représentant de la masse
                      </label>
                      <input
                        id="telmasse"
                        name="masse_phone_dash"
                        type="tel"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={newProjectData.telephone_rep_masse}
                        onChange={e =>
                          setNewProjectData({
                            ...newProjectData,
                            telephone_rep_masse: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
                        placeholder="Ex: 0123456789"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      resetNewProjectForm();
                      setShowNewProject(false);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={creatingProject}
                  >
                    Annuler
                  </button>
                  <button
                    ref={lastFocusableRef}
                    type="submit"
                    disabled={creatingProject || !isFormValid}
                    className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {creatingProject ? 'Création...' : 'Créer le projet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        type={alertModalConfig.type}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        organizationId={organization.id}
        dashboardData={{
          stats,
          recentPayments,
          upcomingCoupons,
          alerts,
          monthlyData,
        }}
      />
    </div>
  );
}

export default Dashboard;
