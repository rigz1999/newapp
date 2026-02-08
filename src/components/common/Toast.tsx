// ============================================
// Toast Notification System
// Path: src/components/Toast.tsx
// ============================================

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // en millisecondes, par défaut 4000
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function SingleToast({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300); // Animation de sortie
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5 text-finixar-green" />,
          bg: 'bg-green-50',
          border: 'border-green-200',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-finixar-red" />,
          bg: 'bg-red-50',
          border: 'border-red-200',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          titleColor: 'text-amber-900',
          messageColor: 'text-amber-700',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg transition-all duration-300 min-w-[320px] max-w-md ${
        styles.bg
      } ${styles.border} ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
    >
      {styles.icon}
      <div className="flex-1">
        <p className={`font-semibold text-sm ${styles.titleColor}`}>{toast.title}</p>
        {toast.message && <p className={`text-sm mt-1 ${styles.messageColor}`}>{toast.message}</p>}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <SingleToast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook personnalisé pour utiliser les toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, type, title, message, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addToast('error', title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      addToast('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addToast('info', title, message, duration),
  };

  return { toasts, toast, removeToast };
}
