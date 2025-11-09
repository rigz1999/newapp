import { Clock, TrendingUp, X } from 'lucide-react';
import { RecentFilter, FilterAnalytics } from '../../hooks/useAdvancedFilters';

interface RecentFiltersProps {
  recentFilters: RecentFilter[];
  analytics: FilterAnalytics;
  onLoad: (id: string) => void;
  onClear: () => void;
  className?: string;
}

const formatTimestamp = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
};

const getFilterSummary = (filters: RecentFilter['filters']) => {
  const parts: string[] = [];

  if (filters.search) {
    parts.push(`Recherche: "${filters.search}"`);
  }

  if (filters.dateRange.startDate || filters.dateRange.endDate) {
    parts.push('Date');
  }

  filters.multiSelect.forEach(f => {
    if (f.values.length > 0) {
      parts.push(`${f.field} (${f.values.length})`);
    }
  });

  return parts.length > 0 ? parts.join(' • ') : 'Filtres vides';
};

export function RecentFilters({
  recentFilters,
  analytics,
  onLoad,
  onClear,
  className = '',
}: RecentFiltersProps) {
  const topFields = Object.entries(analytics.fieldUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Recent Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-900">Filtres récents</h4>
          </div>
          {recentFilters.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              title="Effacer l'historique"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentFilters.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Aucun filtre récent</p>
        ) : (
          <div className="space-y-2">
            {recentFilters.map(recent => (
              <button
                key={recent.id}
                onClick={() => onLoad(recent.id)}
                className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate group-hover:text-blue-700">
                      {getFilterSummary(recent.filters)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        {formatTimestamp(recent.timestamp)}
                      </span>
                      {recent.usageCount > 1 && (
                        <span className="text-xs text-slate-500">
                          Utilisé {recent.usageCount}x
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analytics */}
      {topFields.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-900">Filtres les plus utilisés</h4>
          </div>

          <div className="space-y-2">
            {topFields.map(([field, count]) => {
              const percentage = (count / analytics.totalUses) * 100;
              return (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20 truncate capitalize">
                    {field}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-finxar-cta rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    {count} fois
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Total: {analytics.totalUses} utilisation{analytics.totalUses > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
