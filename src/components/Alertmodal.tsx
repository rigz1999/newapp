import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuler',
}: AlertModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-orange-600" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-600" />;
      case 'confirm':
        return <AlertTriangle className="w-12 h-12 text-blue-600" />;
      default:
        return <Info className="w-12 h-12 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-orange-50';
      case 'error':
        return 'bg-red-50';
      default:
        return 'bg-blue-50';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={`${getBgColor()} rounded-full p-3 mb-4`}>
              {getIcon()}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            
            <p className="text-slate-600 whitespace-pre-line mb-6">{message}</p>
          </div>

          <div className="flex gap-3">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                type === 'error' || type === 'warning'
                  ? 'bg-red-600 hover:bg-red-700'
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}