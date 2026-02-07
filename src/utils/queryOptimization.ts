// ============================================
// Supabase Query Optimization Utilities
// Path: src/utils/queryOptimization.ts
// ============================================

import { supabase } from '../lib/supabase';

/**
 * Cache simple en mémoire pour éviter les requêtes répétées
 */
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes par défaut

  set(key: string, data: any, ttl?: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl || this.ttl),
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }
}

export const queryCache = new QueryCache();

/**
 * Requête avec cache automatique
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  ttl?: number
): Promise<{ data: T | null; error: any; fromCache: boolean }> {
  // Vérifier le cache
  const cached = queryCache.get(cacheKey);
  if (cached) {
    return { data: cached, error: null, fromCache: true };
  }

  // Exécuter la requête
  const result = await queryFn();

  // Mettre en cache si succès
  if (result.data && !result.error) {
    queryCache.set(cacheKey, result.data, ttl);
  }

  return { ...result, fromCache: false };
}

/**
 * Batch loading - charger plusieurs éléments en une seule requête
 */
export async function batchLoad<T>(
  table: string,
  ids: string[],
  selectFields: string = '*'
): Promise<{ data: T[] | null; error: any }> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return supabase.from(table).select(selectFields).in('id', ids);
}

/**
 * Pagination optimisée avec comptage
 */
export async function paginatedQuery<T>(
  table: string,
  options: {
    page: number;
    pageSize: number;
    filters?: any;
    orderBy?: { column: string; ascending?: boolean };
    select?: string;
  }
): Promise<{
  data: T[] | null;
  count: number | null;
  error: any;
}> {
  const { page, pageSize, filters, orderBy, select = '*' } = options;

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase.from(table).select(select, { count: 'exact' }).range(start, end);

  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });
  }

  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }

  const { data, error, count } = await query;

  return { data, count, error };
}

/**
 * Requête avec prefetch des relations
 */
export async function queryWithRelations<T>(
  table: string,
  relations: string[],
  filters?: any
): Promise<{ data: T[] | null; error: any }> {
  const selectFields = `*, ${relations.join(', ')}`;

  let query = supabase.from(table).select(selectFields);

  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });
  }

  return query;
}

/**
 * Agrégations optimisées
 */
export async function getAggregates(
  table: string,
  aggregations: {
    count?: boolean;
    sum?: string[];
    avg?: string[];
    min?: string[];
    max?: string[];
  },
  filters?: any
) {
  // Note: Supabase ne supporte pas nativement les agrégations complexes
  // Il faudrait utiliser des fonctions RPC côté serveur pour de vraies performances
  // Ceci est une implémentation client-side basique

  let query = supabase.from(table).select('*');

  if (filters) {
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined) {
        query = query.eq(key, filters[key]);
      }
    });
  }

  const { data, error } = await query;

  if (error || !data) {
    return { data: null, error };
  }

  const result: any = {};

  if (aggregations.count) {
    result.count = data.length;
  }

  if (aggregations.sum) {
    aggregations.sum.forEach(field => {
      result[`sum_${field}`] = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
    });
  }

  if (aggregations.avg) {
    aggregations.avg.forEach(field => {
      const sum = data.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
      result[`avg_${field}`] = data.length > 0 ? sum / data.length : 0;
    });
  }

  if (aggregations.min) {
    aggregations.min.forEach(field => {
      result[`min_${field}`] = Math.min(...data.map(item => Number(item[field]) || 0));
    });
  }

  if (aggregations.max) {
    aggregations.max.forEach(field => {
      result[`max_${field}`] = Math.max(...data.map(item => Number(item[field]) || 0));
    });
  }

  return { data: result, error: null };
}

/**
 * Debounced search - éviter trop de requêtes pendant la saisie
 */
export function createDebouncedSearch(
  searchFn: (query: string) => Promise<any>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (query: string) =>
    new Promise(resolve => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const result = await searchFn(query);
        resolve(result);
      }, delay);
    });
}

/**
 * Préchargement des données critiques au démarrage
 */
export async function preloadCriticalData(orgId: string) {
  const promises = [
    // Précharger les projets
    supabase
      .from('projets')
      .select('id, projet, emetteur')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Précharger les statistiques basiques
    supabase.from('memberships').select('user_id, role').eq('org_id', orgId),
  ];

  const results = await Promise.all(promises);

  // Mettre en cache
  if (results[0].data) {
    queryCache.set(`projects_${orgId}`, results[0].data, 10 * 60 * 1000); // 10 min
  }
  if (results[1].data) {
    queryCache.set(`memberships_${orgId}`, results[1].data, 10 * 60 * 1000);
  }

  return results;
}
