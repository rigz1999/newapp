// ============================================
// Formatters Utility
// Path: src/utils/formatters.ts
// ============================================

/**
 * Format currency to EUR
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format currency with decimals
 */
export const formatCurrencyWithDecimals = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date to French locale
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

/**
 * Format date with full month name
 */
export const formatDateLong = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

/**
 * Get relative date (e.g., "Il y a 2 jours", "Dans 3 jours")
 */
export const getRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Demain";
  if (diffDays === -1) return "Hier";
  if (diffDays < 0) return `Il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
  return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
};

/**
 * Group digits with spaces (e.g., "1000000" -> "1 000 000")
 */
export const groupDigitsWithSpaces = (digitsOnly: string): string => {
  return digitsOnly ? digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
};

/**
 * Format amount for display with € symbol
 */
export const formatMontantDisplay = (digitsOnly: string): string => {
  const grouped = groupDigitsWithSpaces(digitsOnly);
  return grouped ? `${grouped} €` : '';
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)} %`;
};

/**
 * Format number with spaces
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR').format(value);
};
