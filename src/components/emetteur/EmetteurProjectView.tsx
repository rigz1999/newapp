import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  MessageSquare,
  TrendingUp,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Spinner } from '../common/Spinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { ProjectActualites } from '../projects/ProjectActualites';
import { toast } from '../../utils/toast';

interface ProjectDetails {
  id: string;
  projet: string;
  emetteur: string;
  date_emission: string | null;
  taux_interet: number | null;
  montant_global: number | null;
  duree_mois: number | null;
  periodicite_coupons: string | null;
  org_id: string;
}

interface PaymentScheduleItem {
  date_echeance: string;
  numero_coupon: number;
  type_echeance: string;
  statut: string;
  total_montant_brut: number;
  total_montant_net: number;
  nombre_souscriptions: number;
}

export default function EmetteurProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'actualites' | 'schedule' | 'overview'>('actualites');
  const [showAllSchedule, setShowAllSchedule] = useState(false);

  useEffect(() => {
    if (projectId && user) {
      loadProjectData();
    }
  }, [projectId, user]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: accessCheck } = await supabase
        .from('emetteur_projects')
        .select('id')
        .eq('projet_id', projectId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!accessCheck) {
        throw new Error('Acces non autorise a ce projet');
      }

      const { data: projectData, error: projectError } = await supabase
        .from('projets')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: scheduleData } = await supabase
        .from('coupons_echeances')
        .select('date_echeance, montant_coupon, statut, souscription_id')
        .in('souscription_id', [
          supabase.from('souscriptions').select('id').eq('projet_id', projectId),
        ])
        .order('date_echeance', { ascending: true });

      const aggregatedSchedule = (scheduleData || []).reduce((acc: any[], item) => {
        const existing = acc.find((s) => s.date_echeance === item.date_echeance);
        if (existing) {
          existing.total_montant_brut += Number(item.montant_coupon);
          existing.nombre_souscriptions += 1;
          if (item.statut !== 'paye') existing.statut = item.statut;
        } else {
          acc.push({
            date_echeance: item.date_echeance,
            numero_coupon: acc.length + 1,
            type_echeance: 'coupon',
            statut: item.statut,
            total_montant_brut: Number(item.montant_coupon),
            total_montant_net: Number(item.montant_coupon) * 0.7,
            nombre_souscriptions: 1,
          });
        }
        return acc;
      }, []);

      setSchedule(aggregatedSchedule);
    } catch (err: any) {
      console.error('Error loading project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!project || schedule.length === 0) {
      toast.error('Aucune donnee a exporter');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Echeancier');

      worksheet.columns = [
        { header: 'Date Echeance', key: 'date', width: 15 },
        { header: 'Coupon N', key: 'numero', width: 12 },
        { header: 'Montant Brut', key: 'montantBrut', width: 18 },
        { header: 'Montant Net', key: 'montantNet', width: 18 },
        { header: 'Souscriptions', key: 'souscriptions', width: 15 },
        { header: 'Statut', key: 'statut', width: 12 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      schedule.forEach((item) => {
        worksheet.addRow({
          date: formatDate(item.date_echeance),
          numero: item.numero_coupon,
          montantBrut: item.total_montant_brut,
          montantNet: item.total_montant_net,
          souscriptions: item.nombre_souscriptions,
          statut: item.statut,
        });
      });

      worksheet.getColumn('montantBrut').numFmt = '#,##0.00 EUR';
      worksheet.getColumn('montantNet').numFmt = '#,##0.00 EUR';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `Echeancier_${project.projet.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Export Excel telecharge');
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const formatFrequence = (freq: string | null) => {
    if (!freq) return '-';
    const map: Record<string, string> = {
      mensuelle: 'Mensuelle',
      trimestrielle: 'Trimestrielle',
      semestrielle: 'Semestrielle',
      annuelle: 'Annuelle',
      mensuel: 'Mensuelle',
      trimestriel: 'Trimestrielle',
      semestriel: 'Semestrielle',
      annuel: 'Annuelle',
    };
    return map[freq.toLowerCase()] || freq;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Link>
        <ErrorMessage message={error || 'Projet non trouve'} />
      </div>
    );
  }

  const paidCount = schedule.filter((s) => s.statut === 'paye').length;
  const pendingCount = schedule.filter((s) => s.statut !== 'paye').length;
  const nextPayment = schedule.find((s) => s.statut !== 'paye');
  const totalPaid = schedule
    .filter((s) => s.statut === 'paye')
    .reduce((sum, s) => sum + s.total_montant_brut, 0);
  const totalPending = schedule
    .filter((s) => s.statut !== 'paye')
    .reduce((sum, s) => sum + s.total_montant_brut, 0);

  const displayedSchedule = showAllSchedule ? schedule : schedule.slice(0, 6);

  const tabs = [
    {
      id: 'actualites' as const,
      label: 'Actualites',
      icon: MessageSquare,
    },
    {
      id: 'schedule' as const,
      label: 'Echeancier',
      icon: Calendar,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'overview' as const,
      label: 'Informations',
      icon: FileText,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2">
      <div className="flex items-start gap-4">
        <Link
          to="/"
          className="mt-1 p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{project.projet}</h1>
          <p className="text-slate-500 mt-0.5">{project.emetteur}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {project.montant_global != null && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Montant global</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(project.montant_global)}
            </p>
          </div>
        )}
        {project.taux_interet != null && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Taux</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{project.taux_interet}%</p>
          </div>
        )}
        {nextPayment && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Prochain coupon</span>
            </div>
            <p className="text-lg font-bold text-amber-900">
              {formatCurrency(nextPayment.total_montant_brut)}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {formatDate(nextPayment.date_echeance)}
            </p>
          </div>
        )}
        {schedule.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Progression</span>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {paidCount}/{schedule.length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">coupons payes</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-0">
          {activeTab === 'actualites' && (
            <div className="p-6">
              <ProjectActualites projectId={projectId!} orgId={project.org_id} />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="p-6 space-y-5">
              {schedule.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">
                        Paye: {formatCurrency(totalPaid)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-slate-600">
                        En attente: {formatCurrency(totalPending)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                </div>
              )}

              {schedule.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Aucune echeance pour ce projet</p>
                </div>
              ) : (
                <>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            N
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Montant
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedSchedule.map((item, index) => {
                          const isPaid = item.statut === 'paye';
                          const isNext =
                            !isPaid &&
                            (index === 0 ||
                              schedule.slice(0, index).every((s) => s.statut === 'paye'));

                          return (
                            <tr
                              key={index}
                              className={`transition-colors ${
                                isNext
                                  ? 'bg-amber-50/50'
                                  : isPaid
                                    ? 'bg-white'
                                    : 'bg-white'
                              } hover:bg-slate-50`}
                            >
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {formatDate(item.date_echeance)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center">
                                {item.numero_coupon}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                                {formatCurrency(item.total_montant_brut)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Paye
                                  </span>
                                ) : isNext ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3 h-3" />
                                    Prochain
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                                    <Clock className="w-3 h-3" />
                                    En attente
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {schedule.length > 6 && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowAllSchedule(!showAllSchedule)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        {showAllSchedule ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Voir moins
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Voir les {schedule.length - 6} echeances restantes
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {project.date_emission && (
                  <div>
                    <dt className="text-sm text-slate-500 mb-1">Date d'emission</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {formatDate(project.date_emission)}
                    </dd>
                  </div>
                )}
                {project.taux_interet != null && (
                  <div>
                    <dt className="text-sm text-slate-500 mb-1">Taux d'interet</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {project.taux_interet}%
                    </dd>
                  </div>
                )}
                {project.montant_global != null && (
                  <div>
                    <dt className="text-sm text-slate-500 mb-1">Montant global</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {formatCurrency(project.montant_global)}
                    </dd>
                  </div>
                )}
                {project.duree_mois != null && (
                  <div>
                    <dt className="text-sm text-slate-500 mb-1">Duree</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {project.duree_mois} mois
                    </dd>
                  </div>
                )}
                {project.periodicite_coupons && (
                  <div>
                    <dt className="text-sm text-slate-500 mb-1">Periodicite</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {formatFrequence(project.periodicite_coupons)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-slate-500 mb-1">Emetteur</dt>
                  <dd className="text-sm font-medium text-slate-900">{project.emetteur}</dd>
                </div>
              </div>

              {schedule.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Resume des coupons
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Total coupons</p>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        {schedule.length}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-emerald-600">Payes</p>
                      <p className="text-base font-bold text-emerald-700 mt-1">{paidCount}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-600">En attente</p>
                      <p className="text-base font-bold text-amber-700 mt-1">{pendingCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Total brut restant</p>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        {formatCurrency(totalPending)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
