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

interface UseAdvancedFiltersOptions {
  persistKey?: string; // localStorage key for saving presets
  initialFilters?: Partial<FilterState>;
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
  const { persistKey, initialFilters } = options;

  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilterState,
    ...initialFilters,
  });

  const [presets, setPresets] = useState<FilterPreset[]>([]);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`filter-presets-${persistKey}`);
      if (saved) {
        try {
          setPresets(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load filter presets:', e);
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
    applyFilters,
  };
}
