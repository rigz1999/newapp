import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, FileText, MessageSquare } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'actualites'>('overview');

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
        .single();

      if (!accessCheck) {
        throw new Error('Accès non autorisé à ce projet');
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
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Échéancier');

      // Set up columns
      worksheet.columns = [
        { header: 'Date Échéance', key: 'date', width: 15 },
        { header: 'Coupon N°', key: 'numero', width: 12 },
        { header: 'Montant Brut', key: 'montantBrut', width: 18 },
        { header: 'Montant Net', key: 'montantNet', width: 18 },
        { header: 'Souscriptions', key: 'souscriptions', width: 15 },
        { header: 'Statut', key: 'statut', width: 12 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data rows
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

      // Format currency columns
      worksheet.getColumn('montantBrut').numFmt = '#,##0.00 €';
      worksheet.getColumn('montantNet').numFmt = '#,##0.00 €';

      // Generate and download file
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

      toast.success('Export Excel téléchargé');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const exportToPDF = () => {
    toast.error('Export PDF non disponible pour le moment');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <Link to="/emetteur" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
        <ErrorMessage message={error || 'Projet non trouvé'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/emetteur" className="text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.projet}</h1>
            <p className="text-sm text-gray-500 mt-1">Émetteur: {project.emetteur}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="h-4 w-4" />
            Vue d'ensemble
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Calendar className="h-4 w-4" />
            Échéancier
          </button>
          <button
            onClick={() => setActiveTab('actualites')}
            className={`${
              activeTab === 'actualites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <MessageSquare className="h-4 w-4" />
            Actualités
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations du projet</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {project.date_emission && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Date d'émission</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(project.date_emission)}</dd>
              </div>
            )}
            {project.taux_interet && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Taux d'intérêt</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.taux_interet}%</dd>
              </div>
            )}
            {project.montant_global && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Montant global</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatCurrency(project.montant_global)}
                </dd>
              </div>
            )}
            {project.duree_mois && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Durée</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.duree_mois} mois</dd>
              </div>
            )}
            {project.periodicite_coupons && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Périodicité</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.periodicite_coupons}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coupon N°
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedule.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.date_echeance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.numero_coupon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.total_montant_brut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.statut === 'payé'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'actualites' && (
        <ProjectActualites projectId={projectId!} orgId={project.org_id} />
      )}
    </div>
  );
}
