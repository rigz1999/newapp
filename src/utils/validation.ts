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

export const validate = (value: unknown, rules: ValidationRule): string | null => {
  if (rules.required && (!value || String(value).trim() === '')) {
    return rules.message || 'Ce champ est requis';
  }

  if (!value) {
    return null;
  } // Don't validate empty optional fields

  if (rules.minLength && String(value).length < rules.minLength) {
    return rules.message || `Minimum ${rules.minLength} caractères requis`;
  }

  if (rules.maxLength && String(value).length > rules.maxLength) {
    return rules.message || `Maximum ${rules.maxLength} caractères`;
  }

  if (rules.pattern && !rules.pattern.test(String(value))) {
    return rules.message || 'Format invalide';
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return rules.message || `Minimum: ${rules.min}`;
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return rules.message || `Maximum: ${rules.max}`;
  }

  if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return rules.message || 'Email invalide';
  }

  if (rules.custom && !rules.custom(value)) {
    return rules.message || 'Valeur invalide';
  }

  return null;
};

export const validateForm = (
  values: Record<string, unknown>,
  rules: Record<string, ValidationRule>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const error = validate(values[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};
