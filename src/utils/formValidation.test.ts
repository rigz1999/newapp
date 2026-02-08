import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateSIREN,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumeric,
  validatePositiveNumber,
  validateDateNotInPast,
  validateDateRange,
} from './formValidation';

describe('formValidation', () => {
  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe('');
      expect(validateEmail('user.name@domain.co.uk')).toBe('');
      expect(validateEmail('name+tag@example.org')).toBe('');
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toContain('valide');
      expect(validateEmail('test@')).toContain('valide');
      expect(validateEmail('@example.com')).toContain('valide');
      expect(validateEmail('test@.com')).toContain('valide');
    });

    it('should reject empty emails', () => {
      expect(validateEmail('')).toContain('valide');
    });

    it('should handle edge cases', () => {
      // These pass the simple regex validation used in the app
      expect(validateEmail('test..double@example.com')).toBe('');
      expect(validateEmail('test@example..com')).toBe('');
    });
  });

  describe('validatePhone', () => {
    it('should accept valid French phone numbers', () => {
      expect(validatePhone('0123456789')).toBe('');
      expect(validatePhone('01 23 45 67 89')).toBe('');
      expect(validatePhone('01.23.45.67.89')).toBe('');
      expect(validatePhone('01-23-45-67-89')).toBe('');
    });

    it('should accept international format', () => {
      expect(validatePhone('+33123456789')).toBe('');
      expect(validatePhone('+33 1 23 45 67 89')).toBe('');
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toContain('valide');
      expect(validatePhone('abcdefghij')).toContain('valide');
      expect(validatePhone('01234')).toContain('valide');
    });

    it('should allow empty if not required', () => {
      expect(validatePhone('')).toBe('');
    });
  });

  describe('validateSIREN', () => {
    it('should accept valid SIREN numbers', () => {
      expect(validateSIREN('732829320')).toBe(''); // Valid SIREN
      expect(validateSIREN('443061841')).toBe(''); // Valid SIREN
    });

    it('should reject invalid SIREN numbers', () => {
      expect(validateSIREN('123456789')).toContain('invalide');
      expect(validateSIREN('000000000')).toContain('invalide');
    });

    it('should reject wrong length', () => {
      expect(validateSIREN('12345')).toContain('9 chiffres');
      expect(validateSIREN('1234567890')).toContain('9 chiffres');
    });

    it('should reject non-numeric input', () => {
      expect(validateSIREN('ABC123456')).toContain('9 chiffres');
    });

    it('should allow empty if not required', () => {
      expect(validateSIREN('')).toBe('');
    });
  });

  describe('validateRequired', () => {
    it('should accept non-empty values', () => {
      expect(validateRequired('value')).toBe('');
      expect(validateRequired('123')).toBe('');
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toContain('obligatoire');
      expect(validateRequired('   ')).toContain('obligatoire');
    });

    it('should use custom field name', () => {
      const result = validateRequired('', 'Email');
      expect(result).toContain('Email');
    });
  });

  describe('validateMinLength', () => {
    it('should accept values meeting minimum length', () => {
      expect(validateMinLength('hello', 3)).toBe('');
      expect(validateMinLength('12345', 5)).toBe('');
    });

    it('should reject values below minimum length', () => {
      expect(validateMinLength('hi', 3)).toContain('3 caractères');
      expect(validateMinLength('12', 5)).toContain('5 caractères');
    });

    it('should handle edge cases', () => {
      expect(validateMinLength('', 1)).toContain('1 caractère');
      expect(validateMinLength('a', 1)).toBe('');
    });
  });

  describe('validateMaxLength', () => {
    it('should accept values within maximum length', () => {
      expect(validateMaxLength('hello', 10)).toBe('');
      expect(validateMaxLength('12345', 5)).toBe('');
    });

    it('should reject values exceeding maximum length', () => {
      expect(validateMaxLength('hello world', 5)).toContain('5 caractères');
      expect(validateMaxLength('123456', 5)).toContain('5 caractères');
    });
  });

  describe('validateNumeric', () => {
    it('should accept numeric values', () => {
      expect(validateNumeric('123')).toBe('');
      expect(validateNumeric('0')).toBe('');
      expect(validateNumeric('999999')).toBe('');
    });

    it('should reject non-numeric values', () => {
      expect(validateNumeric('abc')).toContain('numérique');
      expect(validateNumeric('12a3')).toContain('numérique');
      expect(validateNumeric('12.3')).toContain('numérique');
    });

    it('should allow empty if not required', () => {
      expect(validateNumeric('')).toBe('');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should accept positive numbers', () => {
      expect(validatePositiveNumber('100')).toBe('');
      expect(validatePositiveNumber('0.01')).toBe('');
      expect(validatePositiveNumber('1000000')).toBe('');
    });

    it('should reject zero and negative numbers', () => {
      expect(validatePositiveNumber('0')).toContain('positif');
      expect(validatePositiveNumber('-10')).toContain('positif');
      expect(validatePositiveNumber('-0.5')).toContain('positif');
    });

    it('should reject non-numeric values', () => {
      expect(validatePositiveNumber('abc')).toContain('valide');
      expect(validatePositiveNumber('10a')).toContain('valide');
    });
  });

  describe('validateDateNotInPast', () => {
    it('should accept future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateString = futureDate.toISOString().split('T')[0];
      expect(validateDateNotInPast(dateString)).toBe('');
    });

    it('should accept today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(validateDateNotInPast(today)).toBe('');
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateString = pastDate.toISOString().split('T')[0];
      expect(validateDateNotInPast(dateString)).toContain('passée');
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date ranges', () => {
      expect(validateDateRange('2025-01-01', '2025-12-31')).toBe('');
      expect(validateDateRange('2025-06-15', '2025-06-15')).toBe(''); // Same day
    });

    it('should reject invalid date ranges', () => {
      expect(validateDateRange('2025-12-31', '2025-01-01')).toContain('avant');
      expect(validateDateRange('2025-06-15', '2025-06-14')).toContain('avant');
    });

    it('should handle missing dates', () => {
      expect(validateDateRange('', '2025-12-31')).toBe('');
      expect(validateDateRange('2025-01-01', '')).toBe('');
      expect(validateDateRange('', '')).toBe('');
    });
  });
});
