import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { createRoot } from 'react-dom/client';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

let toastContainer: HTMLDivElement | null = null;
let toastId = 0;

const getToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className =
      'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

const getIcon = (type: ToastType) => {
  const iconClass = 'w-5 h-5 flex-shrink-0';
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'error':
      return <XCircle className={`${iconClass} text-red-500`} />;
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-orange-500`} />;
    case 'info':
      return <Info className={`${iconClass} text-blue-500`} />;
  }
};

const getBackgroundColor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200';
    case 'error':
      return 'bg-red-50 border-red-200';
    case 'warning':
      return 'bg-orange-50 border-orange-200';
    case 'info':
      return 'bg-blue-50 border-blue-200';
  }
};

const showToast = (message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
  const container = getToastContainer();
  const id = `toast-${toastId++}`;
  const duration = options.duration || 4000;

  const toastElement = document.createElement('div');
  toastElement.id = id;
  toastElement.className = 'pointer-events-auto';
  container.appendChild(toastElement);

  const root = createRoot(toastElement);

  const dismiss = () => {
    toastElement.classList.add('animate-slide-out-right');
    setTimeout(() => {
      root.unmount();
      toastElement.remove();
    }, 300);
  };

  const ToastComponent = () => (
    <div
      className={`${getBackgroundColor(type)} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        {getIcon(type)}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{message}</p>
          {options.action && (
            <button
              onClick={() => {
                options.action!.onClick();
                dismiss();
              }}
              className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              {options.action.label}
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  root.render(<ToastComponent />);

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
};

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
};
