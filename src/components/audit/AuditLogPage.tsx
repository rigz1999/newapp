import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import {
  History,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  User,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Pagination, paginate } from '../common/Pagination';
import { TableSkeleton } from '../common/Skeleton';
import { DateRangePicker } from '../filters/DateRangePicker';
import * as ExcelJS from 'exceljs';

interface AuditLog {
  id: string;
  org_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditLogPageProps {
  organization: { id: string; name: string; role: string };
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Création',
  updated: 'Modification',
  deleted: 'Suppression',
  status_changed: 'Changement de statut',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  status_changed: 'bg-amber-100 text-amber-700',
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  updated: Edit2,
  deleted: Trash2,
  status_changed: RefreshCw,
};

const ENTITY_LABELS: Record<string, string> = {
  paiement: 'Paiement',
  projet: 'Projet',
  tranche: 'Tranche',
  souscription: 'Souscription',
  investisseur: 'Investisseur',
  membre: 'Membre',
  invitation: 'Invitation',
  coupon_echeance: 'Échéance coupon',
  organization: 'Organisation',
  payment_proof: 'Justificatif',
};

export function AuditLogPage({ organization }: AuditLogPageProps) {
  const { user, isSuperAdmin } = useAuth();
  const { organization: orgData } = useOrganization(user?.id);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Unique values for filter dropdowns
  const uniqueUsers = Array.from(
    new Map(
      logs
        .filter(l => l.user_name || l.user_email)
        .map(l => [l.user_id, l.user_name || l.user_email || ''])
    ).entries()
  ).map(([id, name]) => ({ value: id || '', label: name }));

  useEffect(() => {
    fetchLogs();
  }, [organization.id]);

  useEffect(() => {
    setCurrentPage(1);
    applyFilters();
  }, [logs, searchTerm, filterAction, filterEntityType, filterUser, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const orgId = isSuperAdmin ? undefined : (orgData?.id || organization.id);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (orgId && orgId !== 'admin') {
        query = query.eq('org_id', orgId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setLogs((data || []) as AuditLog[]);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        l =>
          l.description.toLowerCase().includes(term) ||
          l.user_name?.toLowerCase().includes(term) ||
          l.user_email?.toLowerCase().includes(term) ||
          l.entity_type.toLowerCase().includes(term)
      );
    }

    if (filterAction) {
      filtered = filtered.filter(l => l.action === filterAction);
    }

    if (filterEntityType) {
      filtered = filtered.filter(l => l.entity_type === filterEntityType);
    }

    if (filterUser) {
      filtered = filtered.filter(l => l.user_id === filterUser);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => {
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      });
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAction('');
    setFilterEntityType('');
    setFilterUser('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = filterAction || filterEntityType || filterUser || startDate || endDate;

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return formatDateTime(dateStr);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Journal d\'audit');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Utilisateur', key: 'user', width: 25 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Type', key: 'entity_type', width: 15 },
      { header: 'Description', key: 'description', width: 50 },
    ];

    filteredLogs.forEach(log => {
      worksheet.addRow({
        date: formatDateTime(log.created_at),
        user: log.user_name || log.user_email || '-',
        action: ACTION_LABELS[log.action] || log.action,
        entity_type: ENTITY_LABELS[log.entity_type] || log.entity_type,
        description: log.description,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_audit_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <History className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Journal d'audit
            </h1>
            <p className="text-slate-600">
              {filteredLogs.length} action{filteredLogs.length > 1 ? 's' : ''} enregistrée{filteredLogs.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-finixar-action-view text-white px-4 py-2 rounded-lg hover:bg-finixar-action-view-hover transition-colors whitespace-nowrap"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Exporter Excel</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher dans le journal..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-finixar-teal text-white border-blue-600'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtres
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {[filterAction, filterEntityType, filterUser, startDate].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Action filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select
                  value={filterAction}
                  onChange={e => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue text-sm"
                >
                  <option value="">Toutes les actions</option>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Entity type filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={filterEntityType}
                  onChange={e => setFilterEntityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue text-sm"
                >
                  <option value="">Tous les types</option>
                  {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* User filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Utilisateur</label>
                <select
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue text-sm"
                >
                  <option value="">Tous les utilisateurs</option>
                  {uniqueUsers.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                label="Période"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Effacer les filtres
              </button>
            </div>
          </div>
        )}

        {/* Log entries */}
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={5} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune activité</h3>
            <p className="text-slate-600">
              {searchTerm || hasActiveFilters
                ? 'Aucune activité ne correspond à vos critères'
                : "Le journal d'audit est vide"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginate(filteredLogs, currentPage, itemsPerPage).map(log => {
                const ActionIcon = ACTION_ICONS[log.action] || RefreshCw;
                return (
                  <div key={log.id} className="py-4 flex items-start gap-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
                    {/* Action icon */}
                    <div className={`flex-shrink-0 p-2 rounded-lg ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-900">
                            <span className="font-semibold">{log.user_name || log.user_email || 'Système'}</span>
                            {' '}
                            <span className="text-slate-600">{log.description}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-slate-500">{formatRelativeTime(log.created_at)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(log.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredLogs.length / itemsPerPage)}
              totalItems={filteredLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={page => setCurrentPage(page)}
              itemName="actions"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogPage;
