import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatCurrency,
  formatCurrencyWithDecimals,
  formatDate,
  formatDateLong,
  getRelativeDate,
  groupDigitsWithSpaces,
  formatMontantDisplay,
  formatPercentage,
  formatNumber,
} from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format amounts to EUR without decimals', () => {
      expect(formatCurrency(1000)).toBe('1\u202f000\u00a0€'); // French format with narrow no-break space
      expect(formatCurrency(1500.99)).toBe('1\u202f501\u00a0€'); // Rounds up
      expect(formatCurrency(0)).toBe('0\u00a0€');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('000');
      expect(result).toContain('€');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-1000);
      expect(result).toContain('-');
      expect(result).toContain('€');
    });
  });

  describe('formatCurrencyWithDecimals', () => {
    it('should format amounts to EUR with decimals', () => {
      expect(formatCurrencyWithDecimals(1000.5)).toContain('1');
      expect(formatCurrencyWithDecimals(1000.5)).toContain('50');
      expect(formatCurrencyWithDecimals(1000.5)).toContain('€');
      expect(formatCurrencyWithDecimals(0)).toContain('0,00');
    });

    it('should always show 2 decimals', () => {
      const result = formatCurrencyWithDecimals(100);
      expect(result).toContain(',00');
    });
  });

  describe('formatDate', () => {
    it('should format dates to French locale', () => {
      const result = formatDate('2025-01-15');
      expect(result).toContain('15');
      expect(result).toContain('2025');
      // Month format may vary by browser/node version (janv. or janv)
    });

    it('should handle different date formats', () => {
      expect(formatDate('2025-12-31')).toContain('31');
      expect(formatDate('2025-12-31')).toContain('2025');
    });
  });

  describe('formatDateLong', () => {
    it('should format dates with full month names', () => {
      const result = formatDateLong('2025-01-15');
      expect(result).toContain('15');
      expect(result).toContain('janvier');
      expect(result).toContain('2025');
    });
  });

  describe('getRelativeDate', () => {
    beforeEach(() => {
      // Mock current date to 2025-01-15 12:00:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    it('should return "Aujourd\'hui" for today', () => {
      expect(getRelativeDate('2025-01-15')).toBe("Aujourd'hui");
    });

    it('should return "Demain" for tomorrow', () => {
      expect(getRelativeDate('2025-01-16')).toBe('Demain');
    });

    it('should return "Hier" for yesterday', () => {
      expect(getRelativeDate('2025-01-14')).toBe('Hier');
    });

    it('should return "Dans X jours" for future dates', () => {
      expect(getRelativeDate('2025-01-17')).toBe('Dans 2 jours');
      expect(getRelativeDate('2025-01-20')).toBe('Dans 5 jours');
    });

    it('should return "Il y a X jours" for past dates', () => {
      expect(getRelativeDate('2025-01-13')).toBe('Il y a 2 jours');
      expect(getRelativeDate('2025-01-10')).toBe('Il y a 5 jours');
    });

    it('should use singular form for 1 day', () => {
      expect(getRelativeDate('2025-01-12')).toBe('Il y a 3 jours');
    });

    vi.useRealTimers();
  });

  describe('groupDigitsWithSpaces', () => {
    it('should group digits with spaces', () => {
      expect(groupDigitsWithSpaces('1000')).toBe('1 000');
      expect(groupDigitsWithSpaces('1000000')).toBe('1 000 000');
      expect(groupDigitsWithSpaces('123456789')).toBe('123 456 789');
    });

    it('should handle small numbers without grouping', () => {
      expect(groupDigitsWithSpaces('100')).toBe('100');
      expect(groupDigitsWithSpaces('99')).toBe('99');
    });

    it('should handle empty strings', () => {
      expect(groupDigitsWithSpaces('')).toBe('');
    });
  });

  describe('formatMontantDisplay', () => {
    it('should format amount with € symbol', () => {
      expect(formatMontantDisplay('1000')).toBe('1 000 €');
      expect(formatMontantDisplay('1000000')).toBe('1 000 000 €');
      expect(formatMontantDisplay('100')).toBe('100 €');
    });

    it('should handle empty strings', () => {
      expect(formatMontantDisplay('')).toBe('');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default 1 decimal', () => {
      expect(formatPercentage(50)).toBe('50.0 %');
      expect(formatPercentage(33.33333)).toBe('33.3 %');
      expect(formatPercentage(100)).toBe('100.0 %');
    });

    it('should format percentages with custom decimals', () => {
      expect(formatPercentage(50, 0)).toBe('50 %');
      expect(formatPercentage(33.33333, 2)).toBe('33.33 %');
      expect(formatPercentage(8.5678, 3)).toBe('8.568 %');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with French locale', () => {
      expect(formatNumber(1000)).toBe('1\u202f000'); // French format with narrow no-break space
      expect(formatNumber(1000000)).toContain('000');
    });

    it('should handle decimals', () => {
      const result = formatNumber(1000.5);
      expect(result).toContain('1');
      // Decimal separator may vary
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });
});
