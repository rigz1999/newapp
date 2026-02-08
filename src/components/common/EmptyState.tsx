// ============================================
// Empty State Component
// Path: src/components/EmptyState.tsx
// ============================================

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-12 h-12',
      iconCircle: 'w-12 h-12',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-8 h-8',
      iconCircle: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-base',
    },
    lg: {
      container: 'py-16',
      icon: 'w-12 h-12',
      iconCircle: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`text-center ${classes.container} animate-fade-in`}>
      <div
        className={`inline-flex items-center justify-center ${classes.iconCircle} bg-gradient-to-br from-blue-50 to-blue-100 rounded-full mb-4`}
      >
        <Icon className={`${classes.icon} text-blue-600`} />
      </div>
      <h3 className={`${classes.title} font-semibold text-slate-900 mb-2`}>{title}</h3>
      <p className={`${classes.description} text-slate-600 mb-6 max-w-sm mx-auto`}>{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                action.variant === 'secondary'
                  ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'bg-finixar-brand-blue text-white hover:bg-finixar-brand-blue-hover shadow-sm'
              }`}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
