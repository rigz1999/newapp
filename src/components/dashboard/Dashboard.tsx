import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TrancheWizard } from '../tranches/TrancheWizard';
import { QuickPaymentModal } from '../coupons/QuickPaymentModal';
import { getDashboardCacheKey, onCacheInvalidated } from '../../utils/cacheManager';
import { AlertModal } from '../common/Modals';
import { DashboardSkeleton } from '../common/Skeleton';
import { ExportModal } from './ExportModal';
import { DashboardStats } from './DashboardStats';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardRecentPayments } from './DashboardRecentPayments';
import { DashboardChart } from './DashboardChart';
import { formatCurrency } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import {
  generateAlerts,
  type Alert,
  type AlertTargetFilters,
  type Payment,
  type UpcomingCoupon,
} from '../../utils/dashboardAlerts';
import { RefreshCw, AlertCircle, X } from 'lucide-react';

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

export function Dashboard({ organization }: DashboardProps): JSX.Element {
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

  // Fonction pour gérer les clics sur les alertes avec deep linking
  const handleAlertClick = useCallback((alert: Alert): void => {
    if (alert.id === 'no-alerts') {
      return;
    } // Ne rien faire si message positif

    const filters = alert.targetFilters;

    if (alert.id === 'overdue-coupons') {
      // Deep link to coupons page with status filter
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (alert.id === 'late-payments') {
      // Deep link to payments page with status filter
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      navigate(`/paiements${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (alert.id === 'upcoming-week') {
      // Deep link to coupons page with status filter
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (alert.id === 'missing-ribs') {
      // Deep link to investors page with RIB status filter
      const params = new URLSearchParams();
      if (filters?.ribStatus) params.set('ribStatus', filters.ribStatus);
      navigate(`/investisseurs${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (alert.id.startsWith('deadline-')) {
      // Navigate to EcheanceDetailPage if we have all required short IDs
      if (filters?.projectShortId && filters?.trancheShortId && filters?.dateEcheance) {
        navigate(`/echeance/${filters.projectShortId}/${filters.trancheShortId}/${filters.dateEcheance}?returnTo=dashboard`);
      } else {
        // Fallback to coupons page with filters
        const params = new URLSearchParams();
        if (filters?.trancheName) params.set('tranche', filters.trancheName);
        if (filters?.dateEcheance) params.set('date', filters.dateEcheance);
        if (filters?.status) params.set('status', filters.status);
        navigate(`/coupons${params.toString() ? `?${params.toString()}` : ''}`);
      }
    }
  }, [navigate]);

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
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  // Check if we have cached data to avoid showing skeleton on return
  const [loading, setLoading] = useState(() => {
    const cached = checkCachedData();
    return !cached; // Only show loading if no cache
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chart state + cache of raw subs for local filtering
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [chartSubscriptionsAll, setChartSubscriptionsAll] = useState<
    { montant_investi: number; date_souscription: string }[]
  >([]);

  const [showTrancheWizard, setShowTrancheWizard] = useState(false);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, _setAlertModalConfig] = useState<{
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

  // Body scroll lock when modal open
  useEffect(() => {
    if (showTrancheWizard || showQuickPayment || showExportModal) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [showTrancheWizard, showQuickPayment, showExportModal]);

  // Listen for cache invalidation events from other components
  useEffect(() => {
    const cleanup = onCacheInvalidated(() => {
      // Clear cache and refetch data when cache is invalidated
      localStorage.removeItem(CACHE_KEY);
      fetchData();
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CACHE_KEY]);

  const fetchData = async (): Promise<void> => {
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
        setAlerts(cachedData.alerts || []);
        setLoading(false);
      }

      const today = new Date();
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);
      const in90Days = new Date();
      in90Days.setDate(today.getDate() + 90);

      // Dates pour comparaisons MoM et YoY
      const firstOfLastMonth = new Date(firstOfMonth);
      firstOfLastMonth.setMonth(firstOfLastMonth.getMonth() - 1);
      const firstOfThisMonthLastYear = new Date(firstOfMonth);
      firstOfThisMonthLastYear.setFullYear(firstOfThisMonthLastYear.getFullYear() - 1);
      const firstOfNextMonthLastYear = new Date(firstOfThisMonthLastYear);
      firstOfNextMonthLastYear.setMonth(firstOfNextMonthLastYear.getMonth() + 1);

      const [
        projectsRes,
        tranchesRes,
        subscriptionsRes,
        monthSubscriptionsRes,
        monthPaymentsRes,
        lastMonthSubscriptionsRes,
        lastMonthPaymentsRes,
        lastYearSubscriptionsRes,
        lastYearPaymentsRes,
        lastMonthProjectsRes,
        lastYearProjectsRes,
        upcomingCouponsCountRes,
      ] = await Promise.all([
        supabase.from('projets').select('id'),
        supabase.from('tranches').select('id, projet_id'),
        supabase
          .from('souscriptions')
          .select('montant_investi, tranche_id, prochaine_date_coupon, date_souscription'),
        supabase
          .from('souscriptions')
          .select('montant_investi')
          .gte('date_souscription', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        // Mois dernier
        supabase
          .from('souscriptions')
          .select('montant_investi')
          .gte('date_souscription', firstOfLastMonth.toISOString().split('T')[0])
          .lt('date_souscription', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfLastMonth.toISOString().split('T')[0])
          .lt('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        // Même mois année dernière
        supabase
          .from('souscriptions')
          .select('montant_investi')
          .gte('date_souscription', firstOfThisMonthLastYear.toISOString().split('T')[0])
          .lt('date_souscription', firstOfNextMonthLastYear.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfThisMonthLastYear.toISOString().split('T')[0])
          .lt('date_paiement', firstOfNextMonthLastYear.toISOString().split('T')[0]),
        // Projets actifs mois dernier (on prend ceux créés avant le mois en cours)
        supabase.from('projets').select('id').lt('created_at', firstOfMonth.toISOString()),
        // Projets actifs même mois année dernière
        supabase
          .from('projets')
          .select('id')
          .lt('created_at', firstOfThisMonthLastYear.toISOString()),
        // Upcoming échéances count - get distinct dates, not individual coupons
        supabase
          .from('coupons_echeances')
          .select('date_echeance')
          .gte('date_echeance', today.toISOString().split('T')[0])
          .lte('date_echeance', in90Days.toISOString().split('T')[0])
          .neq('statut', 'paye'),
      ]);

      // Check for critical errors
      const errors = [
        projectsRes.error && 'Erreur lors du chargement des projets',
        tranchesRes.error && 'Erreur lors du chargement des tranches',
        subscriptionsRes.error && 'Erreur lors du chargement des souscriptions',
        monthSubscriptionsRes.error && 'Erreur lors du chargement des souscriptions du mois',
        monthPaymentsRes.error && 'Erreur lors du chargement des paiements',
      ].filter(Boolean);

      if (errors.length > 0) {
        logger.warn('Dashboard data errors:', {
          projects: projectsRes.error,
          tranches: tranchesRes.error,
          subscriptions: subscriptionsRes.error,
          monthSubscriptions: monthSubscriptionsRes.error,
          payments: monthPaymentsRes.error,
        });
        setError(errors.join(', '));
      } else {
        setError(null);
      }

      const projects = projectsRes.data || [];
      const tranches = tranchesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const monthSubscriptions = monthSubscriptionsRes.data || [];
      const monthPayments = monthPaymentsRes.data || [];
      const chartSubscriptions = subscriptions;

      // Données pour comparaisons
      const lastMonthSubscriptions = lastMonthSubscriptionsRes.data || [];
      const lastMonthPayments = lastMonthPaymentsRes.data || [];
      const lastYearSubscriptions = lastYearSubscriptionsRes.data || [];
      const lastYearPayments = lastYearPaymentsRes.data || [];
      const lastMonthProjects = lastMonthProjectsRes.data || [];
      const lastYearProjects = lastYearProjectsRes.data || [];

      const trancheIds = tranches.map((t: { id: string }) => t.id);

      // Helper pour calculer le pourcentage de croissance
      const calculateGrowth = (current: number, previous: number): number => {
        if (previous === 0 && current === 0) {
          return 0;
        } // Pas de changement, 0 partout
        if (previous === 0) {
          return 100;
        } // De 0 à quelque chose = +100% minimum
        return ((current - previous) / previous) * 100;
      };

      // Montants ce mois
      const totalInvested = monthSubscriptions.reduce(
        (sum: number, s: { montant_investi?: number | string }) =>
          sum + parseFloat(s.montant_investi?.toString() || '0'),
        0
      );
      const couponsPaidThisMonth = monthPayments.reduce(
        (sum: number, p: { montant?: number | string }) =>
          sum + parseFloat(p.montant?.toString() || '0'),
        0
      );

      // Count distinct échéance dates (not individual coupons)
      const upcomingDates = new Set(
        (upcomingCouponsCountRes.data || []).map((c: { date_echeance: string }) => c.date_echeance)
      );
      const upcomingCount = upcomingDates.size;

      // Montants mois dernier
      const totalInvestedLastMonth = lastMonthSubscriptions.reduce(
        (sum: number, s: { montant_investi?: number | string }) =>
          sum + parseFloat(s.montant_investi?.toString() || '0'),
        0
      );
      const couponsPaidLastMonth = lastMonthPayments.reduce(
        (sum: number, p: { montant?: number | string }) =>
          sum + parseFloat(p.montant?.toString() || '0'),
        0
      );

      // Montants année dernière (même mois)
      const totalInvestedLastYear = lastYearSubscriptions.reduce(
        (sum: number, s: { montant_investi?: number | string }) =>
          sum + parseFloat(s.montant_investi?.toString() || '0'),
        0
      );
      const couponsPaidLastYear = lastYearPayments.reduce(
        (sum: number, p: { montant?: number | string }) =>
          sum + parseFloat(p.montant?.toString() || '0'),
        0
      );

      setStats({
        totalInvested,
        totalInvestedMoM: calculateGrowth(totalInvested, totalInvestedLastMonth),
        totalInvestedYoY: calculateGrowth(totalInvested, totalInvestedLastYear),
        couponsPaidThisMonth,
        couponsPaidMoM: calculateGrowth(couponsPaidThisMonth, couponsPaidLastMonth),
        couponsPaidYoY: calculateGrowth(couponsPaidThisMonth, couponsPaidLastYear),
        activeProjects: projects.length,
        activeProjectsMoM: calculateGrowth(projects.length, lastMonthProjects.length),
        activeProjectsYoY: calculateGrowth(projects.length, lastYearProjects.length),
        upcomingCoupons: upcomingCount,
        upcomingCouponsMoM: undefined, // Difficile à calculer sans historique
        upcomingCouponsYoY: undefined, // Difficile à calculer sans historique
        nextCouponDays: 90,
      });

      let recentPaymentsData: Payment[] = [];
      let groupedCoupons: UpcomingCoupon[] = [];
      let allCouponsForAlerts: UpcomingCoupon[] = [];

      if (trancheIds.length > 0) {
        const [paymentsRes2, upcomingCouponsRes, allCouponsRes] = await Promise.all([
          supabase
            .from('paiements')
            .select(
              `
              id, id_paiement, montant, date_paiement, statut, type, tranche_id,
              tranche:tranches(
                tranche_name,
                projet_id,
                projet:projets(projet)
              )
            `
            )
            .in('tranche_id', trancheIds)
            .order('date_paiement', { ascending: false })
            .limit(5),
          // Fetch ALL coupons_echeances (paid and unpaid) for grouping by échéance
          // We'll filter after grouping to show échéances with at least 1 unpaid coupon
          supabase
            .from('coupons_echeances')
            .select(
              `
              id,
              date_echeance,
              montant_coupon,
              statut,
              souscription:souscriptions!inner(
                tranche_id,
                investisseur:investisseurs(nom_raison_sociale),
                tranche:tranches(
                  short_id,
                  tranche_name,
                  projet_id,
                  projet:projets(short_id, projet)
                )
              )
            `
            )
            .in('souscription.tranche_id', trancheIds)
            .order('date_echeance', { ascending: true }),
          // Fetch ALL écheances (including overdue) for alert generation
          // Using coupons_echeances instead of souscriptions to match Coupons page count
          supabase
            .from('coupons_echeances')
            .select(
              `
              id,
              date_echeance,
              montant_coupon,
              statut,
              souscription:souscriptions!inner(
                tranche_id,
                tranche:tranches(
                  short_id,
                  tranche_name,
                  projet_id,
                  projet:projets(short_id, projet)
                )
              )
            `
            )
            .in('souscription.tranche_id', trancheIds)
            .order('date_echeance', { ascending: true }),
        ]);

        if (paymentsRes2.error) {
          logger.warn('Supabase error paiements 2:', paymentsRes2.error);
        }
        if (upcomingCouponsRes.error) {
          logger.warn('Supabase error upcoming coupons:', upcomingCouponsRes.error);
        }
        if (allCouponsRes.error) {
          logger.warn('Supabase error all coupons:', allCouponsRes.error);
        }

        recentPaymentsData = paymentsRes2.data || [];
        allCouponsForAlerts = allCouponsRes.data || [];

        // Group coupons by échéance (tranche + date) and calculate unpaid amounts
        // Show échéances with at least 1 unpaid coupon (even if partially paid)
        // Display only the unpaid portion of the échéance
        const echeanceMap = new Map<
          string,
          {
            id: string;
            date_echeance: string;
            prochaine_date_coupon: string;
            montant_total: number;
            montant_paye: number;
            montant_impaye: number;
            unpaid_count: number;
            investor_count: number;
            tranche: unknown;
          }
        >();

        (upcomingCouponsRes.data || []).forEach(
          (coupon: {
            souscription?: { tranche_id: string; tranche: unknown };
            date_echeance: string;
            montant_coupon: string | number;
            statut: string;
          }) => {
            const trancheId = coupon.souscription?.tranche_id;
            const dateEcheance = coupon.date_echeance;
            const key = `${trancheId}-${dateEcheance}`;

            if (!echeanceMap.has(key)) {
              echeanceMap.set(key, {
                id: key,
                date_echeance: dateEcheance,
                prochaine_date_coupon: dateEcheance,
                montant_total: 0,
                montant_paye: 0,
                montant_impaye: 0,
                unpaid_count: 0,
                investor_count: 0,
                tranche: coupon.souscription?.tranche,
              });
            }

            const echeance = echeanceMap.get(key);
            const montantCoupon = parseFloat(coupon.montant_coupon || 0);
            echeance.montant_total += montantCoupon;
            echeance.investor_count += 1;

            if (coupon.statut === 'paye') {
              echeance.montant_paye += montantCoupon;
            } else {
              echeance.unpaid_count += 1;
              echeance.montant_impaye += montantCoupon;
            }
          }
        );

        // Filter to keep only échéances with at least 1 unpaid coupon
        // Sort by date and limit to 5
        groupedCoupons = Array.from(echeanceMap.values())
          .filter(echeance => echeance.unpaid_count > 0)
          .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
          .slice(0, 5)
          .map(echeance => ({
            id: echeance.id,
            date_echeance: echeance.date_echeance,
            prochaine_date_coupon: echeance.date_echeance,
            montant_coupon: echeance.montant_impaye, // Show only unpaid amount
            coupon_brut: echeance.montant_impaye, // Show only unpaid amount
            investor_count: echeance.investor_count,
            tranche: echeance.tranche,
          })) as UpcomingCoupon[];
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

      // Générer les alertes dynamiques
      const dynamicAlerts = generateAlerts(
        allCouponsForAlerts,
        recentPaymentsData,
        ribManquantsCount
      );

      const cacheData = {
        stats: {
          totalInvested,
          totalInvestedMoM: calculateGrowth(totalInvested, totalInvestedLastMonth),
          totalInvestedYoY: calculateGrowth(totalInvested, totalInvestedLastYear),
          couponsPaidThisMonth,
          couponsPaidMoM: calculateGrowth(couponsPaidThisMonth, couponsPaidLastMonth),
          couponsPaidYoY: calculateGrowth(couponsPaidThisMonth, couponsPaidLastYear),
          activeProjects: projects.length,
          activeProjectsMoM: calculateGrowth(projects.length, lastMonthProjects.length),
          activeProjectsYoY: calculateGrowth(projects.length, lastYearProjects.length),
          upcomingCoupons: upcomingCount,
          upcomingCouponsMoM: undefined,
          upcomingCouponsYoY: undefined,
          nextCouponDays: 90,
        },
        recentPayments: recentPaymentsData,
        upcomingCoupons: groupedCoupons.slice(0, 5),
        monthlyData: monthlyDataResult,
        chartSubscriptionsAll: chartSubscriptions,
        alerts: dynamicAlerts,
      };
      setRecentPayments(recentPaymentsData);
      setUpcomingCoupons(groupedCoupons.slice(0, 5));
      setAlerts(dynamicAlerts);
      // Reset dismissed state when new alerts are loaded
      if (dynamicAlerts.length > 0) {
        setAlertsDismissed(false);
      }
      setCachedData(cacheData);

      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('Dashboard: Error fetching data'));
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
        totalInvestedMoM: undefined,
        totalInvestedYoY: undefined,
        couponsPaidThisMonth: 0,
        couponsPaidMoM: undefined,
        couponsPaidYoY: undefined,
        activeProjects: 0,
        activeProjectsMoM: undefined,
        activeProjectsYoY: undefined,
        upcomingCoupons: 0,
        upcomingCouponsMoM: undefined,
        upcomingCouponsYoY: undefined,
        nextCouponDays: 90,
      });
      setRecentPayments([]);
      setUpcomingCoupons([]);
      setMonthlyData([]);
      setChartSubscriptionsAll([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);

  const handleRefresh = (): void => {
    // Clear cache and refetch data instead of full page reload
    localStorage.removeItem(CACHE_KEY);
    fetchData();
  };

  // Recompute monthly data locally when year/range changes
  useEffect(() => {
    const data = processMonthlyData(chartSubscriptionsAll, selectedYear, startMonth, endMonth);
    setMonthlyData(data);
  }, [selectedYear, startMonth, endMonth, chartSubscriptionsAll]);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Actualiser le tableau de bord"
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
              aria-label="Fermer le message d'erreur"
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
            onDismiss={() => {
              setAlerts([]);
              setAlertsDismissed(true);
            }}
            dismissed={alertsDismissed}
          />

          <DashboardQuickActions
            onNewProject={() => navigate('/projets?create=true')}
            onNewTranche={() => setShowTrancheWizard(true)}
            onNewPayment={() => setShowQuickPayment(true)}
            onExport={() => setShowExportModal(true)}
          />

          <DashboardStats stats={stats} />

          <DashboardChart
            monthlyData={monthlyData}
            viewMode={viewMode}
            selectedYear={selectedYear}
            startMonth={startMonth}
            endMonth={endMonth}
            onViewModeChange={setViewMode}
            onYearChange={setSelectedYear}
            onRangeChange={(start, end) => {
              setStartMonth(start);
              setEndMonth(end);
            }}
          />

          <DashboardRecentPayments
            recentPayments={recentPayments}
            upcomingCoupons={upcomingCoupons}
            onViewAllPayments={() => navigate('/paiements')}
            onViewAllCoupons={() => navigate('/coupons')}
          />
        </>
      )}

      {/* Tranche wizard */}
      {showTrancheWizard && (
        <TrancheWizard
          onClose={() => setShowTrancheWizard(false)}
          onSuccess={() => {
            setShowTrancheWizard(false);
            fetchData();
          }}
        />
      )}

      {/* Quick Payment Modal */}
      {showQuickPayment && (
        <QuickPaymentModal
          onClose={() => setShowQuickPayment(false)}
          onSuccess={() => {
            setShowQuickPayment(false);
            fetchData();
          }}
        />
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
