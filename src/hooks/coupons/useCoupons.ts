import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Final reimbursement fields
  montant_investi: number;
  date_echeance_finale: string;
  is_last_echeance: boolean;
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

export interface FilterOptions {
  projets: { value: string; label: string }[];
  tranches: { value: string; label: string }[];
  cgps: { value: string; label: string }[];
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
  filterOptions: FilterOptions;
}

export function useCoupons(options: UseCouponsOptions = {}): UseCouponsReturn {
  const {
    pageSize = 200, // ~20-40 grouped écheances per page
    filters = {},
    sortBy = 'date_echeance',
    sortOrder = 'asc',
  } = options;

  // Store ALL coupons (unfiltered)
  const [allCoupons, setAllCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    enAttente: { count: 0, total: 0 },
    payes: { count: 0, total: 0 },
    enRetard: { count: 0, total: 0 },
  });

  // Fetch ALL data once (no filters applied server-side)
  const fetchAllCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('coupons_optimized')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(0, 9999); // Override Supabase default limit of 1000

      if (queryError) throw queryError;

      setAllCoupons(data || []);

      // Calculate stats from all data (including nominal reimbursement for final payments)
      const enAttenteData = (data || []).filter(c => c.statut_calculated === 'en_attente');
      const payesData = (data || []).filter(c => c.statut_calculated === 'paye');
      const enRetardData = (data || []).filter(c => c.statut_calculated === 'en_retard');

      const uniqueEnAttenteDates = new Set(enAttenteData.map(c => c.date_echeance));
      const uniquePayesDates = new Set(payesData.map(c => c.date_echeance));
      const uniqueEnRetardDates = new Set(enRetardData.map(c => c.date_echeance));

      // Helper to calculate total including nominal reimbursement for last echeance
      const calculateTotal = (coupons: typeof data) =>
        coupons.reduce((sum, c) => {
          const nominal = c.is_last_echeance ? (c.montant_investi || 0) : 0;
          return sum + c.montant_net + nominal;
        }, 0);

      setStats({
        enAttente: {
          count: uniqueEnAttenteDates.size,
          total: calculateTotal(enAttenteData),
        },
        payes: {
          count: uniquePayesDates.size,
          total: payesData.reduce((sum, c) => {
            const nominal = c.is_last_echeance ? (c.montant_investi || 0) : 0;
            return sum + (c.montant_paye || (c.montant_net + nominal));
          }, 0),
        },
        enRetard: {
          count: uniqueEnRetardDates.size,
          total: calculateTotal(enRetardData),
        },
      });
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors du chargement des coupons');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  // Apply filters CLIENT-SIDE (instant, no network request)
  const filteredCoupons = useMemo(() => {
    let result = [...allCoupons];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(c =>
        c.investisseur_nom?.toLowerCase().includes(searchLower) ||
        c.projet_nom?.toLowerCase().includes(searchLower) ||
        c.tranche_nom?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.statut && filters.statut.length > 0) {
      result = result.filter(c => filters.statut!.includes(c.statut_calculated));
    }

    // Projects filter
    if (filters.projets && filters.projets.length > 0) {
      result = result.filter(c => filters.projets!.includes(c.projet_nom));
    }

    // Tranches filter
    if (filters.tranches && filters.tranches.length > 0) {
      result = result.filter(c => filters.tranches!.includes(c.tranche_nom));
    }

    // CGP filter
    if (filters.cgps && filters.cgps.length > 0) {
      result = result.filter(c => c.investisseur_cgp && filters.cgps!.includes(c.investisseur_cgp));
    }

    // Date range filter
    if (filters.dateStart) {
      result = result.filter(c => c.date_echeance >= filters.dateStart!);
    }
    if (filters.dateEnd) {
      result = result.filter(c => c.date_echeance <= filters.dateEnd!);
    }

    return result;
  }, [allCoupons, filters]);

  // Total count is number of coupons (for pagination math)
  const totalCount = useMemo(() => filteredCoupons.length, [filteredCoupons]);

  // Apply pagination CLIENT-SIDE
  const paginatedCoupons = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredCoupons.slice(start, end);
  }, [filteredCoupons, page, pageSize]);

  // Extract filter options from ALL data (not filtered)
  const filterOptions = useMemo<FilterOptions>(() => {
    const projets = Array.from(new Set(allCoupons.map(c => c.projet_nom).filter(Boolean)))
      .sort()
      .map(p => ({ value: p, label: p }));

    const tranches = Array.from(new Set(allCoupons.map(c => c.tranche_nom).filter(Boolean)))
      .sort()
      .map(t => ({ value: t, label: t }));

    const cgps = Array.from(new Set(allCoupons.map(c => c.investisseur_cgp).filter(Boolean)))
      .sort()
      .map(cgp => ({ value: cgp!, label: cgp! }));

    return { projets, tranches, cgps };
  }, [allCoupons]);

  const refresh = useCallback(async () => {
    await fetchAllCoupons();
  }, [fetchAllCoupons]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Fetch data once on mount
  useEffect(() => {
    fetchAllCoupons();
  }, [fetchAllCoupons]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    coupons: paginatedCoupons,
    loading,
    error,
    totalCount,
    page,
    pageSize,
    totalPages,
    setPage,
    refresh,
    stats,
    filterOptions,
  };
}
