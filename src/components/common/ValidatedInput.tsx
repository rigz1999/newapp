// ============================================
// Validated Input Component with Real-time Feedback
// Path: src/components/ValidatedInput.tsx
// ============================================

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { validateField, ValidationRule } from '../../utils/formValidation';

interface ValidatedInputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (name: string, value: string) => void;
  rules?: ValidationRule;
  placeholder?: string;
  required?: boolean;
  showValidIcon?: boolean;
  validateOnChange?: boolean;
  className?: string;
}

export function ValidatedInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  rules,
  placeholder,
  required = false,
  showValidIcon = true,
  validateOnChange = true,
  className = ''
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (rules && touched && validateOnChange) {
      const result = validateField(value, rules);
      setError(result.error);
      setIsValid(result.isValid && value !== '');
    }
  }, [value, rules, touched, validateOnChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, e.target.value);
  };

  const handleBlur = () => {
    setTouched(true);
    if (rules) {
      const result = validateField(value, rules);
      setError(result.error);
      setIsValid(result.isValid && value !== '');
    }
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            error && touched
              ? 'border-red-300 focus:ring-red-500 bg-red-50'
              : isValid && showValidIcon
              ? 'border-green-300 focus:ring-green-500 bg-green-50'
              : 'border-slate-300 focus:ring-finxar-cta'
          }`}
        />
        {touched && showValidIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : null}
          </div>
        )}
      </div>
      {error && touched && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
