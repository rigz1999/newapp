// ============================================
// Pagination Component - Réutilisable
// Path: src/components/Pagination.tsx
// ============================================

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName?: string; // ex: "investisseurs", "projets", "membres"
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = 'éléments'
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Afficher toutes les pages si peu nombreuses
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Toujours afficher la première page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Pages autour de la page actuelle
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Toujours afficher la dernière page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
      {/* Informations */}
      <div className="text-sm text-slate-600">
        Affichage de <span className="font-medium text-slate-900">{startItem}</span> à{' '}
        <span className="font-medium text-slate-900">{endItem}</span> sur{' '}
        <span className="font-medium text-slate-900">{totalItems}</span> {itemName}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Première page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Page précédente */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numéros de page */}
        <div className="flex gap-1">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-slate-600"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-finixar-teal text-white'
                    : 'border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Page suivante */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dernière page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Fonction utilitaire pour paginer un tableau
export function paginate<T>(items: T[], page: number, itemsPerPage: number): T[] {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return items.slice(start, end);
}
