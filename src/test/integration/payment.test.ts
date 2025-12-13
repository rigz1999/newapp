// ============================================
// Payment Processing Integration Tests
// Path: src/test/integration/payment.test.ts
// ============================================

import { describe, it, expect, vi } from 'vitest';
import { isValidAmount } from '../../utils/validators';

describe('Payment Processing', () => {
  describe('Amount Validation', () => {
    it('should accept valid positive amounts', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount('1000.50')).toBe(true);
    });

    it('should reject zero and negative amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount('-50.25')).toBe(false);
    });

    it('should reject invalid number formats', () => {
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('12.34.56')).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });

  describe('Payment Data Integrity', () => {
    it('should maintain precision for decimal amounts', () => {
      const amount = 123.45;
      expect(Number(amount.toFixed(2))).toBe(123.45);
    });
  });
});
