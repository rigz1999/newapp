import { AlertTriangle, Loader2, Trash2, AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonClass?: string;
  isDangerous?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  impact?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  confirmButtonClass,
  isDangerous = false,
  variant,
  impact,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine variant based on props
  const effectiveVariant = variant || (isDangerous ? 'danger' : 'warning');

  const getVariantStyles = () => {
    switch (effectiveVariant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-8 h-8 text-red-600" />,
          iconBg: 'bg-red-50',
          button: confirmButtonClass || 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-orange-600" />,
          iconBg: 'bg-orange-50',
          button: confirmButtonClass || 'bg-orange-600 hover:bg-orange-700',
        };
      case 'info':
        return {
          icon: <AlertCircle className="w-8 h-8 text-blue-600" />,
          iconBg: 'bg-blue-50',
          button: confirmButtonClass || 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in"
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${styles.iconBg} p-3 rounded-full`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
              {impact && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {impact}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 ${styles.button}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                En cours...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
