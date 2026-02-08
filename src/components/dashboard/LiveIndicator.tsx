// ============================================
// Live Indicator Component
// Path: src/components/LiveIndicator.tsx
//
// Shows realtime connection status and last update time
// ============================================

import { useEffect, useState } from 'react';
import { Radio, RefreshCw, AlertCircle } from 'lucide-react';

interface LiveIndicatorProps {
  isLive: boolean;
  lastUpdate: Date | null;
  onRefresh?: () => void;
  className?: string;
}

export function LiveIndicator({
  isLive,
  lastUpdate,
  onRefresh,
  className = '',
}: LiveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [showPulse, setShowPulse] = useState(false);

  // Update time ago every second
  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdate) {
        setTimeAgo('');
        return;
      }

      const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);

      if (seconds < 10) {
        setTimeAgo("à l'instant");
      } else if (seconds < 60) {
        setTimeAgo(`il y a ${seconds}s`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`il y a ${minutes}min`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`il y a ${hours}h`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Show pulse animation when data updates
  useEffect(() => {
    if (lastUpdate) {
      setShowPulse(true);
      const timeout = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [lastUpdate]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isLive ? (
          <>
            <div className="relative">
              <Radio className="w-4 h-4 text-finixar-green" />
              {showPulse && (
                <span className="absolute inset-0 animate-ping">
                  <Radio className="w-4 h-4 text-finixar-green opacity-75" />
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-finixar-green">En direct</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Hors ligne</span>
          </>
        )}
      </div>

      {/* Last Update Time */}
      {lastUpdate && timeAgo && (
        <span className="text-xs text-slate-500 border-l border-slate-300 pl-3">
          Mis à jour {timeAgo}
        </span>
      )}

      {/* Manual Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-slate-100 rounded transition-colors group"
          title="Actualiser manuellement"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Compact Live Dot (for minimal UI)
// ============================================
interface LiveDotProps {
  isLive: boolean;
  className?: string;
}

export function LiveDot({ isLive, className = '' }: LiveDotProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-slate-300'}`} />
      {isLive && (
        <div className="absolute inset-0 animate-ping">
          <div className="w-2 h-2 rounded-full bg-green-500 opacity-75" />
        </div>
      )}
    </div>
  );
}
