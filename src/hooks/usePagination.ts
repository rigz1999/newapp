// ============================================
// Pagination Hook
// Path: src/hooks/usePagination.ts
//
// Provides pagination state management
// Uses config for items per page
// ============================================

import { useState } from 'react';
import { pagination as paginationConfig } from '../config';

interface UsePaginationReturn {
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  paginate: <T>(items: T[]) => T[];
  totalPages: (totalItems: number) => number;
  reset: () => void;
}

export function usePagination(customItemsPerPage?: number): UsePaginationReturn {
  const defaultItemsPerPage = customItemsPerPage || paginationConfig.itemsPerPage;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

  const paginate = <T>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const totalPages = (totalItems: number): number => Math.ceil(totalItems / itemsPerPage);

  const reset = () => {
    setCurrentPage(1);
    setItemsPerPage(defaultItemsPerPage);
  };

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    paginate,
    totalPages,
    reset,
  };
}
