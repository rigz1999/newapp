import { describe, it, expect } from 'vitest';
import {
  isValidSIREN,
  isValidEmail,
  isValidPhone,
  isValidIBAN,
  isValidAmount,
  isValidPercentage,
  isDateInFuture,
  isRequired,
} from './validators';

describe('validators', () => {
  describe('isValidSIREN', () => {
    it('should validate correct SIREN numbers', () => {
      // Using valid SIREN numbers (verified with Luhn algorithm)
      expect(isValidSIREN('732829320')).toBe(true);
      expect(isValidSIREN('443061841')).toBe(true);
      expect(isValidSIREN('552032534')).toBe(true);
    });

    it('should reject invalid SIREN numbers', () => {
      expect(isValidSIREN('123456789')).toBe(false); // Invalid checksum
      expect(isValidSIREN('12345678')).toBe(false); // Too short
      expect(isValidSIREN('1234567890')).toBe(false); // Too long
      expect(isValidSIREN('abcdefghi')).toBe(false); // Not digits
      expect(isValidSIREN('')).toBe(false); // Empty string
      expect(isValidSIREN('732 829 320')).toBe(false); // With spaces
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user_123@test-domain.fr')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false); // Space
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct French phone numbers', () => {
      expect(isValidPhone('0123456789')).toBe(true);
      expect(isValidPhone('01 23 45 67 89')).toBe(true);
      expect(isValidPhone('01.23.45.67.89')).toBe(true);
      expect(isValidPhone('01-23-45-67-89')).toBe(true);
      expect(isValidPhone('+33123456789')).toBe(true);
      expect(isValidPhone('+33 1 23 45 67 89')).toBe(true);
      expect(isValidPhone('0033123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('012345678')).toBe(false); // Too short
      expect(isValidPhone('01234567890')).toBe(false); // Too long
      expect(isValidPhone('0023456789')).toBe(false); // Starts with 00
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
    });
  });

  describe('isValidIBAN', () => {
    it('should validate correct IBAN formats', () => {
      expect(isValidIBAN('FR7630006000011234567890189')).toBe(true);
      expect(isValidIBAN('FR76 3000 6000 0112 3456 7890 189')).toBe(true); // With spaces
      expect(isValidIBAN('DE89370400440532013000')).toBe(true);
      expect(isValidIBAN('GB82WEST12345698765432')).toBe(true);
    });

    it('should reject invalid IBAN formats', () => {
      expect(isValidIBAN('1234567890')).toBe(false); // No country code
      expect(isValidIBAN('FR')).toBe(false); // Too short
      expect(isValidIBAN('')).toBe(false);
      expect(isValidIBAN('fr7630006000011234567890189')).toBe(false); // Lowercase
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive amounts', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('100.50')).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
      expect(isValidAmount('1000000')).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount('-100')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('')).toBe(false);
    });
  });

  describe('isValidPercentage', () => {
    it('should validate percentages between 0 and 100', () => {
      expect(isValidPercentage(0)).toBe(true);
      expect(isValidPercentage(50)).toBe(true);
      expect(isValidPercentage(100)).toBe(true);
      expect(isValidPercentage('50')).toBe(true);
      expect(isValidPercentage('99.99')).toBe(true);
      expect(isValidPercentage(0.5)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(isValidPercentage(-1)).toBe(false);
      expect(isValidPercentage(101)).toBe(false);
      expect(isValidPercentage('200')).toBe(false);
      expect(isValidPercentage('abc')).toBe(false);
      expect(isValidPercentage('')).toBe(false);
    });
  });

  describe('isDateInFuture', () => {
    it('should validate future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isDateInFuture(futureDate.toISOString())).toBe(true);

      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      expect(isDateInFuture(farFuture.toISOString())).toBe(true);
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isDateInFuture(pastDate.toISOString())).toBe(false);

      const farPast = new Date();
      farPast.setFullYear(farPast.getFullYear() - 1);
      expect(isDateInFuture(farPast.toISOString())).toBe(false);
    });

    it('should reject current date/time (not in future)', () => {
      const now = new Date();
      expect(isDateInFuture(now.toISOString())).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('should validate non-empty values', () => {
      expect(isRequired('test')).toBe(true);
      expect(isRequired('  text  ')).toBe(true); // Has content after trim
      expect(isRequired(123)).toBe(true);
      expect(isRequired(0)).toBe(true);
      expect(isRequired(false)).toBe(true);
      expect(isRequired([])).toBe(true);
      expect(isRequired({})).toBe(true);
    });

    it('should reject empty values', () => {
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false); // Only whitespace
    });
  });
});
