import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDashboardCacheKey, onCacheInvalidated } from '../utils/cacheManager';
import { logger } from '../utils/logger';
import {
  generateAlerts,
  type Alert,
  type Payment,
  type UpcomingCoupon,
} from '../utils/dashboardAlerts';
import { processMonthlyData, type MonthlyData } from '../utils/processMonthlyData';

export interface DashboardStats {
  totalInvested: number;
  totalInvestedMoM?: number;
  totalInvestedYoY?: number;
  couponsPaidThisMonth: number;
  couponsPaidMoM?: number;
  couponsPaidYoY?: number;
  activeProjects: number;
  activeProjectsMoM?: number;
  activeProjectsYoY?: number;
  upcomingCoupons: number;
  upcomingCouponsMoM?: number;
  upcomingCouponsYoY?: number;
  nextCouponDays: number;
}

type ChartSubscription = {
  montant_investi: number;
  date_souscription: string;
  tranches: { date_emission: string | null } | null;
};

interface CachedDashboardData {
  stats: DashboardStats;
  recentPayments: Payment[];
  upcomingCoupons: UpcomingCoupon[];
  monthlyData: MonthlyData[];
  chartSubscriptionsAll: ChartSubscription[];
  alerts: Alert[];
}

const DEFAULT_STATS: DashboardStats = {
  totalInvested: 0,
  couponsPaidThisMonth: 0,
  activeProjects: 0,
  upcomingCoupons: 0,
  nextCouponDays: 90,
};

const CACHE_DURATION = 5 * 60 * 1000;

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0 && current === 0) {
    return 0;
  }
  if (previous === 0) {
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

function sumField(
  rows: { montant_investi?: number | string; montant?: number | string }[],
  field: 'montant_investi' | 'montant'
): number {
  return rows.reduce((sum, row) => sum + parseFloat((row[field] as string)?.toString() || '0'), 0);
}

export function useDashboardData(orgId: string) {
  const CACHE_KEY = getDashboardCacheKey(orgId);

  const checkCachedData = useCallback((): CachedDashboardData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }
      const { data, timestamp } = JSON.parse(cached) as {
        data: CachedDashboardData;
        timestamp: number;
      };
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, [CACHE_KEY]);

  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcomingCoupons, setUpcomingCoupons] = useState<UpcomingCoupon[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [loading, setLoading] = useState(() => !checkCachedData());
  const [error, setError] = useState<string | null>(null);

  // Chart state
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative'>('monthly');
  const [chartSubscriptionsAll, setChartSubscriptionsAll] = useState<ChartSubscription[]>([]);

  const setCachedData = useCallback(
    (data: CachedDashboardData): void => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {
        // Silently ignore localStorage errors
      }
    },
    [CACHE_KEY]
  );

  const fetchData = useCallback(async (): Promise<void> => {
    const isRefresh = !loading;

    try {
      const cachedData = checkCachedData();
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
          .select(
            'montant_investi, tranche_id, prochaine_date_coupon, date_souscription, tranches(date_emission)'
          ),
        supabase
          .from('souscriptions')
          .select('montant_investi, tranches!inner(date_emission)')
          .gte('tranches.date_emission', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('souscriptions')
          .select('montant_investi, tranches!inner(date_emission)')
          .gte('tranches.date_emission', firstOfLastMonth.toISOString().split('T')[0])
          .lt('tranches.date_emission', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfLastMonth.toISOString().split('T')[0])
          .lt('date_paiement', firstOfMonth.toISOString().split('T')[0]),
        supabase
          .from('souscriptions')
          .select('montant_investi, tranches!inner(date_emission)')
          .gte('tranches.date_emission', firstOfThisMonthLastYear.toISOString().split('T')[0])
          .lt('tranches.date_emission', firstOfNextMonthLastYear.toISOString().split('T')[0]),
        supabase
          .from('paiements')
          .select('montant, statut')
          .eq('statut', 'payé')
          .gte('date_paiement', firstOfThisMonthLastYear.toISOString().split('T')[0])
          .lt('date_paiement', firstOfNextMonthLastYear.toISOString().split('T')[0]),
        supabase.from('projets').select('id').lt('created_at', firstOfMonth.toISOString()),
        supabase
          .from('projets')
          .select('id')
          .lt('created_at', firstOfThisMonthLastYear.toISOString()),
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

      const lastMonthSubscriptions = lastMonthSubscriptionsRes.data || [];
      const lastMonthPayments = lastMonthPaymentsRes.data || [];
      const lastYearSubscriptions = lastYearSubscriptionsRes.data || [];
      const lastYearPayments = lastYearPaymentsRes.data || [];
      const lastMonthProjects = lastMonthProjectsRes.data || [];
      const lastYearProjects = lastYearProjectsRes.data || [];

      const trancheIds = tranches.map((t: { id: string }) => t.id);

      const totalInvested = sumField(monthSubscriptions, 'montant_investi');
      const couponsPaidThisMonth = sumField(monthPayments, 'montant');

      // Count distinct échéance dates
      const upcomingDates = new Set(
        (upcomingCouponsCountRes.data || []).map((c: { date_echeance: string }) => c.date_echeance)
      );
      const upcomingCount = upcomingDates.size;

      const totalInvestedLastMonth = sumField(lastMonthSubscriptions, 'montant_investi');
      const couponsPaidLastMonth = sumField(lastMonthPayments, 'montant');
      const totalInvestedLastYear = sumField(lastYearSubscriptions, 'montant_investi');
      const couponsPaidLastYear = sumField(lastYearPayments, 'montant');

      const newStats: DashboardStats = {
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
      };
      setStats(newStats);

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

        recentPaymentsData = (paymentsRes2.data || []) as unknown as Payment[];
        allCouponsForAlerts = (allCouponsRes.data || []) as unknown as UpcomingCoupon[];

        // Group coupons by échéance (tranche + date) and calculate unpaid amounts
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
            if (!echeance) {
              return;
            }
            const montantCoupon = parseFloat(String(coupon.montant_coupon || 0));
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

        groupedCoupons = Array.from(echeanceMap.values())
          .filter(echeance => echeance.unpaid_count > 0)
          .sort((a, b) => a.date_echeance.localeCompare(b.date_echeance))
          .slice(0, 5)
          .map(echeance => ({
            id: echeance.id,
            date_echeance: echeance.date_echeance,
            prochaine_date_coupon: echeance.date_echeance,
            montant_coupon: echeance.montant_impaye,
            coupon_brut: echeance.montant_impaye,
            investor_count: echeance.investor_count,
            tranche: echeance.tranche,
          })) as UpcomingCoupon[];
      }

      // Precompute monthly data
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

      const cacheData: CachedDashboardData = {
        stats: newStats,
        recentPayments: recentPaymentsData,
        upcomingCoupons: groupedCoupons.slice(0, 5),
        monthlyData: monthlyDataResult,
        chartSubscriptionsAll: chartSubscriptions,
        alerts: dynamicAlerts,
      };
      setRecentPayments(recentPaymentsData);
      setUpcomingCoupons(groupedCoupons.slice(0, 5));
      setAlerts(dynamicAlerts);
      if (dynamicAlerts.length > 0) {
        setAlertsDismissed(false);
      }
      setCachedData(cacheData);

      setLoading(false);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Dashboard: Error fetching data'));
      localStorage.removeItem(CACHE_KEY);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CACHE_KEY, checkCachedData, setCachedData]);

  // Initial fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) {
        await fetchData();
      }
    })();
    return () => {
      mounted = false;
      setStats(DEFAULT_STATS);
      setRecentPayments([]);
      setUpcomingCoupons([]);
      setMonthlyData([]);
      setChartSubscriptionsAll([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Listen for cache invalidation events
  useEffect(() => {
    const cleanup = onCacheInvalidated(() => {
      localStorage.removeItem(CACHE_KEY);
      fetchData();
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CACHE_KEY]);

  // Recompute monthly data when year/range changes
  useEffect(() => {
    const data = processMonthlyData(chartSubscriptionsAll, selectedYear, startMonth, endMonth);
    setMonthlyData(data);
  }, [selectedYear, startMonth, endMonth, chartSubscriptionsAll]);

  const handleRefresh = useCallback((): void => {
    localStorage.removeItem(CACHE_KEY);
    fetchData();
  }, [CACHE_KEY, fetchData]);

  const dismissAlerts = useCallback(() => {
    setAlerts([]);
    setAlertsDismissed(true);
  }, []);

  return {
    // Data
    stats,
    recentPayments,
    upcomingCoupons,
    alerts,
    alertsDismissed,
    monthlyData,
    loading,
    error,

    // Chart controls
    selectedYear,
    startMonth,
    endMonth,
    viewMode,
    setSelectedYear,
    setStartMonth,
    setEndMonth,
    setViewMode,

    // Actions
    fetchData,
    handleRefresh,
    dismissAlerts,
    setError,
  };
}
