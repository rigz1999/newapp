// ============================================
// Reusable Modal Components
// Path: src/components/Modals.tsx
// ============================================

import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

interface ConfirmModalProps extends BaseModalProps {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

interface AlertModalProps extends BaseModalProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
}

/**
 * Confirmation Modal - requires user to confirm or cancel an action
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-12 h-12 text-finixar-red" />,
          bgColor: 'bg-red-100',
          buttonColor: 'bg-finixar-red hover:bg-red-700'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-600" />,
          bgColor: 'bg-amber-100',
          buttonColor: 'bg-amber-600 hover:bg-amber-700'
        };
      case 'info':
        return {
          icon: <Info className="w-12 h-12 text-blue-600" />,
          bgColor: 'bg-blue-100',
          buttonColor: 'bg-finixar-teal hover:bg-finixar-teal-hover'
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-finixar-red" />,
          bgColor: 'bg-red-100',
          buttonColor: 'bg-finixar-red hover:bg-red-700'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className={`w-16 h-16 ${styles.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-600 text-center mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${styles.buttonColor}`}
            >
              {isLoading ? 'Traitement...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Alert Modal - simple notification modal with single action button
 */
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'OK'
}: AlertModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-finixar-green" />,
          bgColor: 'bg-green-100',
          buttonColor: 'bg-finixar-teal hover:bg-finixar-teal-hover'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-finixar-red" />,
          bgColor: 'bg-red-100',
          buttonColor: 'bg-finixar-red hover:bg-red-700'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-600" />,
          bgColor: 'bg-amber-100',
          buttonColor: 'bg-amber-600 hover:bg-amber-700'
        };
      case 'info':
        return {
          icon: <Info className="w-12 h-12 text-blue-600" />,
          bgColor: 'bg-blue-100',
          buttonColor: 'bg-finixar-teal hover:bg-finixar-teal-hover'
        };
      default:
        return {
          icon: <Info className="w-12 h-12 text-blue-600" />,
          bgColor: 'bg-blue-100',
          buttonColor: 'bg-finixar-teal hover:bg-finixar-teal-hover'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className={`w-16 h-16 ${styles.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-600 text-center mb-6">
            {message}
          </p>

          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full px-4 py-3 text-white rounded-lg transition-colors font-medium ${styles.buttonColor}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
