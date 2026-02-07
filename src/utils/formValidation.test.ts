import { describe, it, expect } from 'vitest';
import { validateField, validateForm, commonRules } from './formValidation';

describe('formValidation', () => {
  describe('validateField - required', () => {
    it('should accept non-empty values', () => {
      const result = validateField('value', { required: true });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty values when required', () => {
      const result = validateField('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only when required', () => {
      const result = validateField('   ', { required: true });
      expect(result.isValid).toBe(false);
    });

    it('should accept empty values when not required', () => {
      const result = validateField('', {});
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateField - email', () => {
    it('should accept valid emails', () => {
      expect(validateField('test@example.com', { email: true }).isValid).toBe(true);
      expect(validateField('user.name@domain.co.uk', { email: true }).isValid).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateField('invalid', { required: true, email: true }).isValid).toBe(false);
      expect(validateField('test@', { required: true, email: true }).isValid).toBe(false);
      expect(validateField('@example.com', { required: true, email: true }).isValid).toBe(false);
    });
  });

  describe('validateField - minLength', () => {
    it('should accept values meeting minimum length', () => {
      const result = validateField('hello', { minLength: 3 });
      expect(result.isValid).toBe(true);
    });

    it('should reject values below minimum length', () => {
      const result = validateField('hi', { minLength: 3 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('3');
    });
  });

  describe('validateField - maxLength', () => {
    it('should accept values within maximum length', () => {
      const result = validateField('hello', { maxLength: 10 });
      expect(result.isValid).toBe(true);
    });

    it('should reject values exceeding maximum length', () => {
      const result = validateField('hello world', { maxLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5');
    });
  });

  describe('validateField - pattern', () => {
    it('should accept values matching pattern', () => {
      const result = validateField('0123456789', { pattern: /^[0-9]{10}$/ });
      expect(result.isValid).toBe(true);
    });

    it('should reject values not matching pattern', () => {
      const result = validateField('123', { pattern: /^[0-9]{10}$/ });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateField - min/max numeric', () => {
    it('should accept positive numbers within range', () => {
      const result = validateField('50', { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
    });

    it('should reject numbers below min', () => {
      const result = validateField('-1', { min: 0 });
      expect(result.isValid).toBe(false);
    });

    it('should reject numbers above max', () => {
      const result = validateField('101', { max: 100 });
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateForm', () => {
    it('should validate all fields in a form', () => {
      const data = { email: 'test@example.com', name: 'John' };
      const rules = {
        email: commonRules.email,
        name: commonRules.name,
      };
      const result = validateForm(data, rules);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for invalid fields', () => {
      const data = { email: 'invalid', name: '' };
      const rules = {
        email: commonRules.email,
        name: commonRules.name,
      };
      const result = validateForm(data, rules);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });
  });

  describe('commonRules', () => {
    it('should validate SIREN pattern (9 digits)', () => {
      expect(validateField('123456789', commonRules.siren).isValid).toBe(true);
      expect(validateField('12345', commonRules.siren).isValid).toBe(false);
    });

    it('should validate phone pattern (10 digits)', () => {
      expect(validateField('0123456789', commonRules.phone).isValid).toBe(true);
      expect(validateField('123', commonRules.phone).isValid).toBe(false);
    });

    it('should validate amount (>= 0)', () => {
      expect(validateField('100', commonRules.amount).isValid).toBe(true);
      expect(validateField('0', commonRules.amount).isValid).toBe(true);
    });

    it('should validate percentage (0-100)', () => {
      expect(validateField('50', commonRules.percentage).isValid).toBe(true);
      expect(validateField('101', commonRules.percentage).isValid).toBe(false);
    });
  });
});
