import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  description: string;
  created_at: string;
}

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
  maxItems?: number;
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  updated: Edit2,
  deleted: Trash2,
  status_changed: RefreshCw,
};

const ACTION_DOT_COLORS: Record<string, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  status_changed: 'bg-amber-500',
};

export function ActivityTimeline({ entityType, entityId, maxItems = 10 }: ActivityTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [entityType, entityId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, user_name, user_email, action, description, created_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (!error && data) {
        setLogs(data as AuditLog[]);
      }
    } catch (err) {
      console.error('Error fetching activity timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "A l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-slate-200 mt-2" />
            <div className="flex-1">
              <div className="h-3 bg-slate-200 rounded w-3/4 mb-1" />
              <div className="h-2 bg-slate-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${ACTION_DOT_COLORS[log.action] || 'bg-slate-300'}`} />
            {index < logs.length - 1 && (
              <div className="w-px h-full bg-slate-200 mt-1" />
            )}
          </div>
          <div className="pb-3">
            <p className="text-sm text-slate-900">
              <span className="font-medium">{log.user_name || log.user_email || 'Système'}</span>
              {' '}
              <span className="text-slate-600">{log.description}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{formatTime(log.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
