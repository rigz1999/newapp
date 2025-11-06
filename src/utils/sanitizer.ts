// ============================================
// Input Sanitization Utility
// Path: src/utils/sanitizer.ts
// ============================================

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this when rendering user-generated HTML content
 */
export function sanitizeHTML(dirtyHTML: string): string {
  return DOMPurify.sanitize(dirtyHTML, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text input by removing dangerous characters
 * Use this for general text inputs
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  // Remove null bytes and other control characters
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.\-+]/g, ''); // Only allow word chars, @, ., -, +
}

/**
 * Sanitize phone number - keep only digits, spaces, and + for international prefix
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  return phone.replace(/[^\d\s+\-().]/g, '').trim();
}

/**
 * Sanitize numeric input - keep only digits and decimal point
 */
export function sanitizeNumber(input: string): string {
  if (!input) return '';

  return input.replace(/[^\d.]/g, '');
}

/**
 * Sanitize file name to prevent directory traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  // Remove path separators and dangerous characters
  return fileName
    .replace(/[/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .trim();
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }

  // Ensure https or http
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return '';
  }

  return url.trim();
}

/**
 * Sanitize SIREN number - French company identifier (9 digits)
 */
export function sanitizeSIREN(siren: string): string {
  if (!siren) return '';

  // Remove all non-digits and limit to 9 characters
  return siren.replace(/\D/g, '').slice(0, 9);
}

/**
 * Sanitize IBAN - International Bank Account Number
 */
export function sanitizeIBAN(iban: string): string {
  if (!iban) return '';

  // Remove spaces and convert to uppercase, keep only alphanumeric
  return iban
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 34); // Max IBAN length
}

/**
 * Escape SQL-like patterns for search queries
 * Use this when constructing search queries to prevent SQL injection-like attacks
 */
export function escapeSQLPattern(pattern: string): string {
  if (!pattern) return '';

  // Escape special SQL pattern characters
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/'/g, "''");
}

/**
 * Sanitize amount input - format for financial data
 */
export function sanitizeAmount(amount: string): string {
  if (!amount) return '';

  // Keep only digits, decimal point, and minus sign
  let sanitized = amount.replace(/[^\d.-]/g, '');

  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }

  // Ensure minus sign only at the beginning
  if (sanitized.includes('-')) {
    const isNegative = sanitized[0] === '-';
    sanitized = sanitized.replace(/-/g, '');
    if (isNegative) {
      sanitized = '-' + sanitized;
    }
  }

  return sanitized;
}

/**
 * General purpose sanitizer for user input
 * Use this as a default when you're not sure which sanitizer to use
 */
export function sanitizeUserInput(input: string, maxLength: number = 1000): string {
  if (!input) return '';

  return sanitizeText(input).slice(0, maxLength);
}
