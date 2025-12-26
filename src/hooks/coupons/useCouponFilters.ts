import { useState, useCallback } from 'react';
import { CouponsFilters } from './useCoupons';

export function useCouponFilters(initialFilters: CouponsFilters = {}) {
  const [filters, setFilters] = useState<CouponsFilters>(initialFilters);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search: search || undefined }));
  }, []);

  const setStatut = useCallback((statut: string[]) => {
    setFilters(prev => ({ ...prev, statut: statut.length > 0 ? statut : undefined }));
  }, []);

  const setProjets = useCallback((projets: string[]) => {
    setFilters(prev => ({ ...prev, projets: projets.length > 0 ? projets : undefined }));
  }, []);

  const setTranches = useCallback((tranches: string[]) => {
    setFilters(prev => ({ ...prev, tranches: tranches.length > 0 ? tranches : undefined }));
  }, []);

  const setCGPs = useCallback((cgps: string[]) => {
    setFilters(prev => ({ ...prev, cgps: cgps.length > 0 ? cgps : undefined }));
  }, []);

  const setDateRange = useCallback((start?: string, end?: string) => {
    setFilters(prev => ({
      ...prev,
      dateStart: start || undefined,
      dateEnd: end || undefined,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = Object.values(filters).filter(
    value => value !== undefined && (Array.isArray(value) ? value.length > 0 : value !== '')
  ).length;

  return {
    filters,
    setSearch,
    setStatut,
    setProjets,
    setTranches,
    setCGPs,
    setDateRange,
    clearFilters,
    activeFilterCount,
  };
}
