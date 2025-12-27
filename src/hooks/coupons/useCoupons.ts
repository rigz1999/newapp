import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';

export interface Coupon {
  id: string;
  souscription_id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  montant_paye: number | null;

  investisseur_id: string;
  investisseur_nom: string;
  investisseur_type: string;
  investisseur_email: string;
  investisseur_cgp: string | null;
  has_rib: boolean;

  projet_id: string;
  projet_nom: string;
  tranche_id: string;
  tranche_nom: string;

  montant_brut: number;
  montant_net: number;
  statut_calculated: string;
  jours_restants: number;
}

export interface CouponsFilters {
  search?: string;
  statut?: string[];
  projets?: string[];
  tranches?: string[];
  cgps?: string[];
  dateStart?: string;
  dateEnd?: string;
}

export interface UseCouponsOptions {
  pageSize?: number;
  filters?: CouponsFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseCouponsReturn {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  stats: {
    enAttente: { count: number; total: number };
    payes: { count: number; total: number };
    enRetard: { count: number; total: number };
  };
}

export function useCoupons(options: UseCouponsOptions = {}): UseCouponsReturn {
  const {
    pageSize = 50,
    filters = {},
    sortBy = 'date_echeance',
    sortOrder = 'asc',
  } = options;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    enAttente: { count: 0, total: 0 },
    payes: { count: 0, total: 0 },
    enRetard: { count: 0, total: 0 },
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build base query
      let query = supabase
        .from('coupons_optimized')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(
          `investisseur_nom.ilike.%${filters.search}%,` +
          `projet_nom.ilike.%${filters.search}%,` +
          `tranche_nom.ilike.%${filters.search}%,` +
          `investisseur_id_display.ilike.%${filters.search}%`
        );
      }

      if (filters.statut && filters.statut.length > 0) {
        query = query.in('statut_calculated', filters.statut);
      }

      if (filters.projets && filters.projets.length > 0) {
        query = query.in('projet_nom', filters.projets);
      }

      if (filters.tranches && filters.tranches.length > 0) {
        query = query.in('tranche_nom', filters.tranches);
      }

      if (filters.cgps && filters.cgps.length > 0) {
        query = query.in('investisseur_cgp', filters.cgps);
      }

      if (filters.dateStart) {
        query = query.gte('date_echeance', filters.dateStart);
      }

      if (filters.dateEnd) {
        query = query.lte('date_echeance', filters.dateEnd);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setCoupons(data || []);
      setTotalCount(count || 0);

      // Fetch stats separately (without pagination)
      await fetchStats();
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors du chargement des coupons');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      // Fetch aggregated stats - need date_echeance to count unique dates
      const { data: enAttenteData } = await supabase
        .from('coupons_optimized')
        .select('montant_net, date_echeance')
        .eq('statut_calculated', 'en_attente');

      const { data: payesData } = await supabase
        .from('coupons_optimized')
        .select('montant_paye, montant_net, date_echeance')
        .eq('statut_calculated', 'paye');

      const { data: enRetardData } = await supabase
        .from('coupons_optimized')
        .select('montant_net, date_echeance')
        .eq('statut_calculated', 'en_retard');

      // Count unique échéance dates (not investor rows)
      // Example: 10 investors, 3 échéances = count 3 (not 30)
      const uniqueEnAttenteDates = new Set(enAttenteData?.map(c => c.date_echeance) || []);
      const uniquePayesDates = new Set(payesData?.map(c => c.date_echeance) || []);
      const uniqueEnRetardDates = new Set(enRetardData?.map(c => c.date_echeance) || []);

      setStats({
        enAttente: {
          count: uniqueEnAttenteDates.size,
          total: enAttenteData?.reduce((sum, c) => sum + c.montant_net, 0) || 0,
        },
        payes: {
          count: uniquePayesDates.size,
          total: payesData?.reduce((sum, c) => sum + (c.montant_paye || c.montant_net), 0) || 0,
        },
        enRetard: {
          count: uniqueEnRetardDates.size,
          total: enRetardData?.reduce((sum, c) => sum + c.montant_net, 0) || 0,
        },
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const refresh = async () => {
    await fetchCoupons();
  };

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    coupons,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    totalPages,
    setPage,
    refresh,
    stats,
  };
}
