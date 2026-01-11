import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface Stats {
  totalInvested: number;
  couponsPaidThisMonth: number;
  activeProjects: number;
  upcomingCoupons: number;
  nextCouponDays: number;
  totalInvestedMoM?: number;
  totalInvestedYoY?: number;
  couponsPaidMoM?: number;
  couponsPaidYoY?: number;
  activeProjectsMoM?: number;
  activeProjectsYoY?: number;
  upcomingCouponsMoM?: number;
  upcomingCouponsYoY?: number;
}

interface DashboardStatsResult {
  stats: Stats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardStats(orgId: string): DashboardStatsResult {
  const [stats, setStats] = useState<Stats>({
    totalInvested: 0,
    couponsPaidThisMonth: 0,
    activeProjects: 0,
    upcomingCoupons: 0,
    nextCouponDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      const startOfLastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      const endOfLastYear = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0);
      const in90Days = new Date(today);
      in90Days.setDate(today.getDate() + 90);

      // Fetch all data in parallel
      const [
        projectsRes,
        subsRes,
        couponsThisMonthRes,
        couponsLastMonthRes,
        couponsLastYearRes,
        upcomingCouponsRes,
      ] = await Promise.all([
        supabase
          .from('projets')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('souscriptions')
          .select('montant_investi, projets!inner(org_id)', { count: 'exact' })
          .eq('projets.org_id', orgId),
        supabase
          .from('paiements')
          .select('montant, projets!inner(org_id)')
          .eq('projets.org_id', orgId)
          .gte('date_paiement', startOfMonth.toISOString())
          .lte('date_paiement', today.toISOString()),
        supabase
          .from('paiements')
          .select('montant, projets!inner(org_id)')
          .eq('projets.org_id', orgId)
          .gte('date_paiement', startOfLastMonth.toISOString())
          .lte('date_paiement', endOfLastMonth.toISOString()),
        supabase
          .from('paiements')
          .select('montant, projets!inner(org_id)')
          .eq('projets.org_id', orgId)
          .gte('date_paiement', startOfLastYear.toISOString())
          .lte('date_paiement', endOfLastYear.toISOString()),
        supabase
          .from('coupons')
          .select('id, projets!inner(org_id)', { count: 'exact', head: true })
          .eq('projets.org_id', orgId)
          .gte('date_echeance', today.toISOString())
          .lte('date_echeance', in90Days.toISOString()),
      ]);

      const totalInvested = (subsRes.data || []).reduce(
        (sum, sub) => sum + (Number(sub.montant_investi) || 0),
        0
      );

      const couponsPaidThisMonth = (couponsThisMonthRes.data || []).reduce(
        (sum, p) => sum + (Number(p.montant) || 0),
        0
      );

      const couponsPaidLastMonth = (couponsLastMonthRes.data || []).reduce(
        (sum, p) => sum + (Number(p.montant) || 0),
        0
      );

      const couponsPaidLastYear = (couponsLastYearRes.data || []).reduce(
        (sum, p) => sum + (Number(p.montant) || 0),
        0
      );

      const couponsPaidMoM =
        couponsPaidLastMonth > 0
          ? ((couponsPaidThisMonth - couponsPaidLastMonth) / couponsPaidLastMonth) * 100
          : 0;

      const couponsPaidYoY =
        couponsPaidLastYear > 0
          ? ((couponsPaidThisMonth - couponsPaidLastYear) / couponsPaidLastYear) * 100
          : 0;

      setStats({
        totalInvested,
        couponsPaidThisMonth,
        couponsPaidMoM,
        couponsPaidYoY,
        activeProjects: projectsRes.count || 0,
        upcomingCoupons: upcomingCouponsRes.count || 0,
        nextCouponDays: 0,
      });
    } catch (err) {
      logger.error('Failed to fetch dashboard stats', err);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
