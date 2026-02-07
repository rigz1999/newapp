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
  custom?: (value: unknown) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Valider une valeur selon des règles
export function validateField(value: unknown, rules: ValidationRule): ValidationResult {
  if (rules.required && (!value || String(value).trim() === '')) {
    return { isValid: false, error: rules.message || 'Ce champ est obligatoire' };
  }

  if (!value) {
    return { isValid: true }; // Si pas required et vide, c'est ok
  }

  const stringValue = String(value);

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
  data: Record<string, unknown>,
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
