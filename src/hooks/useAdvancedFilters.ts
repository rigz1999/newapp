// ============================================
// Advanced Filtering Hook
// Path: src/hooks/useAdvancedFilters.ts
//
// Provides advanced filtering with:
// - Date range filters
// - Multi-select filters
// - Search filters
// - Filter presets (localStorage)
// ============================================

import { useState, useCallback, useEffect } from 'react';

export interface DateRangeFilter {
  startDate: string | null;
  endDate: string | null;
}

export interface MultiSelectFilter {
  field: string;
  values: string[];
}

export interface FilterState {
  search: string;
  dateRange: DateRangeFilter;
  multiSelect: MultiSelectFilter[];
  customFilters: Record<string, any>;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

export interface RecentFilter {
  id: string;
  timestamp: number;
  filters: FilterState;
  usageCount: number;
}

export interface FilterAnalytics {
  totalUses: number;
  fieldUsage: Record<string, number>; // field name -> usage count
  lastUsed: number;
}

interface UseAdvancedFiltersOptions {
  persistKey?: string; // localStorage key for saving presets
  initialFilters?: Partial<FilterState>;
  maxRecentFilters?: number; // Max number of recent filters to keep (default: 5)
}

interface UseAdvancedFiltersReturn {
  filters: FilterState;
  setSearch: (search: string) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  addMultiSelectFilter: (field: string, value: string) => void;
  removeMultiSelectFilter: (field: string, value: string) => void;
  clearMultiSelectFilter: (field: string) => void;
  setCustomFilter: (key: string, value: any) => void;
  clearAllFilters: () => void;

  // Presets
  presets: FilterPreset[];
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;

  // Recently used filters
  recentFilters: RecentFilter[];
  loadRecentFilter: (id: string) => void;
  clearRecentFilters: () => void;

  // Analytics
  analytics: FilterAnalytics;

  // Apply filters to data
  applyFilters: <T extends Record<string, any>>(
    data: T[],
    options?: {
      searchFields?: (keyof T)[];
      dateField?: keyof T;
    }
  ) => T[];
}

const defaultFilterState: FilterState = {
  search: '',
  dateRange: { startDate: null, endDate: null },
  multiSelect: [],
  customFilters: {},
};

export function useAdvancedFilters(
  options: UseAdvancedFiltersOptions = {}
): UseAdvancedFiltersReturn {
  const { persistKey, initialFilters, maxRecentFilters = 5 } = options;

  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilterState,
    ...initialFilters,
  });

  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [recentFilters, setRecentFilters] = useState<RecentFilter[]>([]);
  const [analytics, setAnalytics] = useState<FilterAnalytics>({
    totalUses: 0,
    fieldUsage: {},
    lastUsed: Date.now(),
  });

  // Load presets from localStorage on mount
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`filter-presets-${persistKey}`);
      if (saved) {
        try {
          setPresets(JSON.parse(saved));
        } catch (e) {
        }
      }
    }
  }, [persistKey]);

  // Load recent filters from localStorage on mount
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`filter-recent-${persistKey}`);
      if (saved) {
        try {
          setRecentFilters(JSON.parse(saved));
        } catch (e) {
        }
      }
    }
  }, [persistKey]);

  // Load analytics from localStorage on mount
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`filter-analytics-${persistKey}`);
      if (saved) {
        try {
          setAnalytics(JSON.parse(saved));
        } catch (e) {
        }
      }
    }
  }, [persistKey]);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (persistKey && presets.length > 0) {
      localStorage.setItem(`filter-presets-${persistKey}`, JSON.stringify(presets));
    }
  }, [presets, persistKey]);

  // Save recent filters to localStorage whenever they change
  useEffect(() => {
    if (persistKey && recentFilters.length > 0) {
      localStorage.setItem(`filter-recent-${persistKey}`, JSON.stringify(recentFilters));
    }
  }, [recentFilters, persistKey]);

  // Save analytics to localStorage whenever they change
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(`filter-analytics-${persistKey}`, JSON.stringify(analytics));
    }
  }, [analytics, persistKey]);

  // Track filter usage whenever filters change
  useEffect(() => {
    const hasActiveFilters =
      filters.search ||
      filters.dateRange.startDate ||
      filters.dateRange.endDate ||
      filters.multiSelect.some(f => f.values.length > 0);

    if (hasActiveFilters && persistKey) {
      // Update analytics
      const newFieldUsage = { ...analytics.fieldUsage };

      if (filters.search) {
        newFieldUsage['search'] = (newFieldUsage['search'] || 0) + 1;
      }

      if (filters.dateRange.startDate || filters.dateRange.endDate) {
        newFieldUsage['dateRange'] = (newFieldUsage['dateRange'] || 0) + 1;
      }

      filters.multiSelect.forEach(f => {
        if (f.values.length > 0) {
          newFieldUsage[f.field] = (newFieldUsage[f.field] || 0) + 1;
        }
      });

      setAnalytics(prev => ({
        totalUses: prev.totalUses + 1,
        fieldUsage: newFieldUsage,
        lastUsed: Date.now(),
      }));

      // Add to recent filters
      const filterSignature = JSON.stringify(filters);
      const existingRecent = recentFilters.find(
        rf => JSON.stringify(rf.filters) === filterSignature
      );

      if (existingRecent) {
        // Update existing recent filter
        setRecentFilters(prev =>
          prev
            .map(rf =>
              rf.id === existingRecent.id
                ? { ...rf, timestamp: Date.now(), usageCount: rf.usageCount + 1 }
                : rf
            )
            .sort((a, b) => b.timestamp - a.timestamp)
        );
      } else {
        // Add new recent filter
        const newRecent: RecentFilter = {
          id: `recent-${Date.now()}`,
          timestamp: Date.now(),
          filters: { ...filters },
          usageCount: 1,
        };

        setRecentFilters(prev => {
          const updated = [newRecent, ...prev];
          return updated.slice(0, maxRecentFilters);
        });
      }
    }
  }, [filters, persistKey, maxRecentFilters]);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setDateRange = useCallback(
    (startDate: string | null, endDate: string | null) => {
      setFilters((prev) => ({
        ...prev,
        dateRange: { startDate, endDate },
      }));
    },
    []
  );

  const addMultiSelectFilter = useCallback((field: string, value: string) => {
    setFilters((prev) => {
      const existing = prev.multiSelect.find((f) => f.field === field);
      if (existing) {
        if (existing.values.includes(value)) {
          return prev; // Already exists
        }
        return {
          ...prev,
          multiSelect: prev.multiSelect.map((f) =>
            f.field === field
              ? { ...f, values: [...f.values, value] }
              : f
          ),
        };
      } else {
        return {
          ...prev,
          multiSelect: [...prev.multiSelect, { field, values: [value] }],
        };
      }
    });
  }, []);

  const removeMultiSelectFilter = useCallback((field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      multiSelect: prev.multiSelect
        .map((f) =>
          f.field === field
            ? { ...f, values: f.values.filter((v) => v !== value) }
            : f
        )
        .filter((f) => f.values.length > 0),
    }));
  }, []);

  const clearMultiSelectFilter = useCallback((field: string) => {
    setFilters((prev) => ({
      ...prev,
      multiSelect: prev.multiSelect.filter((f) => f.field !== field),
    }));
  }, []);

  const setCustomFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      customFilters: { ...prev.customFilters, [key]: value },
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilterState);
  }, []);

  const savePreset = useCallback(
    (name: string) => {
      const newPreset: FilterPreset = {
        id: `preset-${Date.now()}`,
        name,
        filters: { ...filters },
      };
      setPresets((prev) => [...prev, newPreset]);
    },
    [filters]
  );

  const loadPreset = useCallback((id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setFilters(preset.filters);
    }
  }, [presets]);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loadRecentFilter = useCallback((id: string) => {
    const recent = recentFilters.find(rf => rf.id === id);
    if (recent) {
      setFilters(recent.filters);
    }
  }, [recentFilters]);

  const clearRecentFilters = useCallback(() => {
    setRecentFilters([]);
    if (persistKey) {
      localStorage.removeItem(`filter-recent-${persistKey}`);
    }
  }, [persistKey]);

  const applyFilters = useCallback(
    <T extends Record<string, any>>(
      data: T[],
      options: {
        searchFields?: (keyof T)[];
        dateField?: keyof T;
      } = {}
    ): T[] => {
      let filtered = [...data];

      // Apply search filter
      if (filters.search && options.searchFields) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter((item) =>
          options.searchFields!.some((field) =>
            String(item[field] || '').toLowerCase().includes(searchLower)
          )
        );
      }

      // Apply date range filter
      if (
        filters.dateRange.startDate &&
        filters.dateRange.endDate &&
        options.dateField
      ) {
        const startDate = new Date(filters.dateRange.startDate);
        const endDate = new Date(filters.dateRange.endDate);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item[options.dateField!]);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      // Apply multi-select filters
      filters.multiSelect.forEach((multiFilter) => {
        if (multiFilter.values.length > 0) {
          filtered = filtered.filter((item) =>
            multiFilter.values.includes(String(item[multiFilter.field]))
          );
        }
      });

      return filtered;
    },
    [filters]
  );

  return {
    filters,
    setSearch,
    setDateRange,
    addMultiSelectFilter,
    removeMultiSelectFilter,
    clearMultiSelectFilter,
    setCustomFilter,
    clearAllFilters,
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    recentFilters,
    loadRecentFilter,
    clearRecentFilters,
    analytics,
    applyFilters,
  };
}
