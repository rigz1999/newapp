// ============================================
// Form Validation Helpers with Real-time Feedback
// Path: src/utils/formValidation.ts
// ============================================

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  email?: boolean;
  custom?: (value: string | number) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Valider une valeur selon des règles
export function validateField(
  value: string | number | null | undefined,
  rules: ValidationRule
): ValidationResult {
  if (rules.required && (!value || value.toString().trim() === '')) {
    return { isValid: false, error: rules.message || 'Ce champ est obligatoire' };
  }

  if (!value) {
    return { isValid: true }; // Si pas required et vide, c'est ok
  }

  const stringValue = value.toString();

  if (rules.minLength && stringValue.length < rules.minLength) {
    return {
      isValid: false,
      error: rules.message || `Minimum ${rules.minLength} caractères requis`,
    };
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return {
      isValid: false,
      error: rules.message || `Maximum ${rules.maxLength} caractères autorisés`,
    };
  }

  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return { isValid: false, error: rules.message || 'Email invalide' };
    }
  }

  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return { isValid: false, error: rules.message || 'Format invalide' };
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return {
      isValid: false,
      error: rules.message || `La valeur doit être au moins ${rules.min}`,
    };
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return {
      isValid: false,
      error: rules.message || `La valeur ne peut pas dépasser ${rules.max}`,
    };
  }

  if (rules.custom && !rules.custom(value)) {
    return { isValid: false, error: rules.message || 'Valeur invalide' };
  }

  return { isValid: true };
}

// Valider un formulaire entier
export function validateForm(
  data: Record<string, string | number | null | undefined>,
  rules: Record<string, ValidationRule>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let isValid = true;

  Object.keys(rules).forEach(field => {
    const result = validateField(data[field], rules[field]);
    if (!result.isValid) {
      errors[field] = result.error || 'Erreur de validation';
      isValid = false;
    }
  });

  return { isValid, errors };
}

// Règles de validation communes
export const commonRules = {
  email: { required: true, email: true, message: 'Email valide requis' },
  password: { required: true, minLength: 6, message: 'Mot de passe minimum 6 caractères' },
  name: { required: true, minLength: 2, maxLength: 100, message: 'Nom invalide' },
  phone: {
    pattern: /^[0-9]{10}$/,
    message: 'Numéro de téléphone invalide (10 chiffres)',
  },
  siren: {
    required: true,
    pattern: /^[0-9]{9}$/,
    message: 'SIREN invalide (9 chiffres)',
  },
  amount: {
    required: true,
    min: 0,
    message: 'Montant invalide',
  },
  percentage: {
    required: true,
    min: 0,
    max: 100,
    message: 'Pourcentage invalide (0-100)',
  },
};

// Individual validation helpers (return error message string, empty string if valid)
export function validateEmail(value: string): string {
  if (!value) {
    return 'Email non valide';
  }
  const result = validateField(value, { required: true, email: true });
  return result.isValid ? '' : result.error || 'Email non valide';
}

export function validatePhone(value: string): string {
  if (!value) {
    return '';
  }
  const cleaned = value.replace(/[\s.-]/g, '');
  const phoneRegex = /^(\+?\d{10,13})$/;
  return phoneRegex.test(cleaned) ? '' : 'Numéro non valide';
}

export function validateSIREN(value: string): string {
  if (!value) {
    return '';
  }
  if (!/^\d{9}$/.test(value)) {
    return 'SIREN : 9 chiffres requis';
  }
  if (/^0{9}$/.test(value)) {
    return 'SIREN invalide';
  }
  // Luhn check
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(value[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0 ? '' : 'SIREN invalide';
}

export function validateRequired(value: string, fieldName?: string): string {
  if (!value || value.trim() === '') {
    return fieldName ? `${fieldName} est obligatoire` : 'Ce champ est obligatoire';
  }
  return '';
}

export function validateMinLength(value: string, min: number): string {
  if (value.length < min) {
    return `Minimum ${min} caractère${min > 1 ? 's' : ''} requis`;
  }
  return '';
}

export function validateMaxLength(value: string, max: number): string {
  if (value.length > max) {
    return `Maximum ${max} caractères autorisés`;
  }
  return '';
}

export function validateNumeric(value: string): string {
  if (!value) {
    return '';
  }
  return /^\d+$/.test(value) ? '' : 'Valeur numérique requise';
}

export function validatePositiveNumber(value: string): string {
  if (!value) {
    return '';
  }
  const num = Number(value);
  if (isNaN(num)) {
    return 'Nombre valide requis';
  }
  return num > 0 ? '' : 'Le nombre doit être positif';
}

export function validateDateNotInPast(value: string): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today ? '' : 'La date ne peut pas être passée';
}

export function validateDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) {
    return '';
  }
  return new Date(startDate) <= new Date(endDate)
    ? ''
    : 'La date de début doit être avant la date de fin';
}
