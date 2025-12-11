// ============================================
// Validators Utility
// Path: src/utils/validators.ts
// ============================================

/**
 * Validate SIREN number (9 digits + Luhn algorithm)
 */
export const isValidSIREN = (value: string): boolean => {
  if (!/^\d{9}$/.test(value)) return false;

  // Luhn algorithm for SIREN (process from RIGHT to LEFT)
  let sum = 0;
  for (let i = 8; i >= 0; i--) {
    let digit = parseInt(value.charAt(i), 10);
    // Multiply every other digit starting from the rightmost (position 8 is index 0 from right)
    if ((8 - i) % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

/**
 * Validate email address
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
};

/**
 * Validate phone number (French format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate IBAN
 */
export const isValidIBAN = (iban: string): boolean => {
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
};

/**
 * Validate amount (positive number)
 */
export const isValidAmount = (amount: string | number): boolean => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0;
};

/**
 * Validate percentage (0-100)
 */
export const isValidPercentage = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Validate date is not in the past
 */
export const isDateInFuture = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Validate number (can be negative or zero)
 */
export const isValidNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && isFinite(num);
};

/**
 * Validate date range (start date must be before end date)
 */
export const isValidDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};
