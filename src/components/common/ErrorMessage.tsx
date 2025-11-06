// ============================================
// Error Message Component
// Path: src/components/ErrorMessage.tsx
// ============================================

import { AlertCircle, X } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';

interface ErrorMessageProps {
  error?: any;
  message?: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Reusable error message component with consistent styling
 * Automatically formats technical errors into user-friendly messages
 */
export function ErrorMessage({ error, message, onDismiss, className = '' }: ErrorMessageProps) {
  const displayMessage = message || (error ? formatErrorMessage(error) : null);

  if (!displayMessage) {
    return null;
  }

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-red-900 font-medium">Erreur</p>
        <p className="text-red-700 text-sm mt-1">{displayMessage}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 flex-shrink-0"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
