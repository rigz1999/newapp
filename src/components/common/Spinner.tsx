// ============================================
// Spinner Component - Cohérent et réutilisable
// Path: src/components/Spinner.tsx
// ============================================

import { RefreshCw } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'slate' | 'green' | 'red';
  text?: string;
  fullScreen?: boolean;
}

export function Spinner({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    slate: 'text-slate-600',
    green: 'text-finixar-green',
    red: 'text-finixar-red'
  };

  const spinner = (
    <div className={`flex items-center justify-center gap-3 ${fullScreen ? 'flex-col' : ''}`}>
      <RefreshCw className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
      {text && (
        <p className={`${colorClasses[color]} font-medium ${size === 'sm' ? 'text-sm' : ''}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Spinner inline pour boutons
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <div
      className={`${
        size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
      } border-2 border-white border-t-transparent rounded-full animate-spin`}
    />
  );
}

// Spinner pour cartes/sections
export function CardSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-3" />
      {text && <p className="text-slate-600">{text}</p>}
    </div>
  );
}

// Skeleton loader pour contenu
export function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded"
          style={{ width: `${100 - i * 10}%` }}
        />
      ))}
    </div>
  );
}
