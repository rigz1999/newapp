// ============================================
// Cache Manager Utility
// Path: src/utils/cacheManager.ts
// ============================================

/**
 * Centralized cache management for the application
 * Allows components to invalidate caches when data changes
 */

const CACHE_VERSION = 1;

/**
 * Get the dashboard cache key for a specific organization
 */
export function getDashboardCacheKey(orgId: string): string {
  return `saad_dashboard_cache_v${CACHE_VERSION}_${orgId}`;
}

/**
 * Invalidate the dashboard cache for a specific organization
 * Call this after creating/updating/deleting data that affects dashboard stats
 */
export function invalidateDashboardCache(orgId: string): void {
  try {
    const cacheKey = getDashboardCacheKey(orgId);
    localStorage.removeItem(cacheKey);
  } catch {
    // Silently ignore localStorage errors
  }
}

/**
 * Invalidate all dashboard caches (useful for global changes)
 */
export function invalidateAllDashboardCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('saad_dashboard_cache_v')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Silently ignore localStorage errors
  }
}

/**
 * Hook into cache invalidation events
 * Components can call this to be notified when cache is invalidated
 */
export function onCacheInvalidated(callback: () => void): () => void {
  const handleInvalidation = (_event: Event) => {
    callback();
  };

  window.addEventListener('cache-invalidated', handleInvalidation);

  // Return cleanup function
  return () => {
    window.removeEventListener('cache-invalidated', handleInvalidation);
  };
}

/**
 * Trigger cache invalidation event
 * This notifies all listening components that cache has been invalidated
 */
export function triggerCacheInvalidation(orgId?: string): void {
  if (orgId) {
    invalidateDashboardCache(orgId);
  } else {
    invalidateAllDashboardCaches();
  }

  // Dispatch custom event for components that want to react
  const event = new CustomEvent('cache-invalidated', {
    detail: { orgId, timestamp: Date.now() },
  });
  window.dispatchEvent(event);
}
