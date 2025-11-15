import { AlertTriangle, Loader2 } from 'lucide-react';
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

  const defaultButtonClass = isDangerous
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-slate-900 hover:bg-slate-800';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] animate-fade-in"
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={`${isDangerous ? 'bg-red-50' : 'bg-blue-50'} rounded-full p-3 mb-4`}>
              <AlertTriangle className={`w-12 h-12 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>

            <p className="text-slate-600 whitespace-pre-line mb-6">{message}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 ${
                confirmButtonClass || defaultButtonClass
              }`}
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
    </div>
  );
}
