import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAdvancedFilters } from './useAdvancedFilters';
import { logger } from '../utils/logger';
import { toast } from '../utils/toast';

export interface ProjectWithStats {
  id: string;
  projet: string;
  emetteur: string;
  representant_masse: string | null;
  email_rep_masse: string | null;
  created_at: string;
  tranches_count: number;
  total_leve: number;
  investisseurs_count: number;
}

export function useProjects(orgId: string) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const advancedFilters = useAdvancedFilters({
    persistKey: 'projects-filters',
  });

  // Clear legacy advanced filters from localStorage
  useEffect(() => {
    const filterKey = 'projects-filters';
    const stored = localStorage.getItem(filterKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.filters?.multiSelect?.length > 0) {
          parsed.filters.multiSelect = [];
          localStorage.setItem(filterKey, JSON.stringify(parsed));
        }
      } catch (_e) {
        // Ignore parse errors
      }
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const projectsRes = await supabase
        .from('projets')
        .select(
          'id, projet, emetteur, siren_emetteur, representant_masse, email_rep_masse, date_emission, montant_global_eur, org_id, created_at, periodicite_coupons, taux_nominal'
        )
        .order('created_at', { ascending: false });

      if (projectsRes.error) {
        throw projectsRes.error;
      }

      const projectsData = projectsRes.data || [];
      const projectIds = projectsData.map(p => p.id);

      const [tranchesRes, subscriptionsRes] = await Promise.all([
        supabase.from('tranches').select('id, projet_id').in('projet_id', projectIds),
        supabase
          .from('souscriptions')
          .select('montant_investi, investisseur_id, tranche:tranches!inner(projet_id)')
          .in('tranche.projet_id', projectIds),
      ]);

      const tranchesData = tranchesRes.data || [];
      const subscriptionsData = subscriptionsRes.data || [];

      const tranchesMap = new Map<string, number>();
      const subscriptionsMap = new Map<string, { total: number; investors: Set<string> }>();

      tranchesData.forEach(t => {
        tranchesMap.set(t.projet_id, (tranchesMap.get(t.projet_id) || 0) + 1);
      });

      subscriptionsData.forEach(s => {
        const projetId = s.tranche?.projet_id;
        if (!projetId) {
          return;
        }

        const current = subscriptionsMap.get(projetId) || { total: 0, investors: new Set() };
        current.total += Number(s.montant_investi) || 0;
        current.investors.add(s.investisseur_id);
        subscriptionsMap.set(projetId, current);
      });

      const projectsWithStats = projectsData.map(project => {
        const stats = subscriptionsMap.get(project.id);
        return {
          ...project,
          tranches_count: tranchesMap.get(project.id) || 0,
          total_leve: stats?.total || 0,
          investisseurs_count: stats?.investors.size || 0,
        };
      });

      setProjects(projectsWithStats as unknown as ProjectWithStats[]);
    } catch (error) {
      logger.error('Failed to fetch projects', error as Record<string, unknown>);
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await fetchProjects();
      }
    };
    loadData();
    return () => {
      isMounted = false;
      setProjects([]);
    };
  }, [orgId, fetchProjects]);

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    if (advancedFilters.filters.search) {
      const term = advancedFilters.filters.search.toLowerCase();
      filtered = filtered.filter(
        project =>
          project.projet.toLowerCase().includes(term) ||
          project.emetteur.toLowerCase().includes(term) ||
          (project.representant_masse && project.representant_masse.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [projects, advancedFilters.filters.search]);

  return {
    projects,
    filteredProjects,
    loading,
    advancedFilters,
    fetchProjects,
  };
}
