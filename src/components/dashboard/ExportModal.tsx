import { useState, useEffect } from 'react';
import { X, FileText, Euro, Calendar, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import Decimal from 'decimal.js';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

type ExcelJS = any;
type JsPDF = any;

interface JsPDFWithAutoTable {
  text: (text: string, x: number, y: number) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  save: (filename: string) => void;
  internal: {
    pageSize: {
      width: number;
      height: number;
    };
  };
  lastAutoTable: {
    finalY: number;
  };
}

// Format currency for PDF (replaces non-breaking spaces with regular spaces)
const formatCurrencyForPDF = (amount: number): string => {
  return formatCurrency(amount).replace(/\u00A0/g, ' ');
};

type ExportPreset = 'complet' | 'paiements' | 'coupons' | 'alertes' | 'custom';
type ExportFormat = 'excel' | 'pdf';
type DateRangePreset = 'all' | 'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom';

interface ExportOptions {
  includeStats: boolean;
  includePayments: boolean;
  paymentsLimit: number;
  includeCoupons: boolean;
  couponsLimit: number;
  includeChart: boolean;
  includeAlerts: boolean;
  includeProjects: boolean;
  includeInvestorDetails: boolean;
  includeVisuals: boolean;
  paymentsDateRange: DateRangePreset;
  paymentsStartDate: string;
  paymentsEndDate: string;
  couponsDateRange: DateRangePreset;
  couponsStartDate: string;
  couponsEndDate: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  dashboardData: {
    stats: {
      totalInvested: number;
      couponsPaidThisMonth: number;
      activeProjects: number;
      upcomingCoupons: number;
    };
    recentPayments: any[];
    upcomingCoupons: any[];
    alerts: any[];
    monthlyData: any[];
  };
}

const PRESET_CONFIGS: Record<ExportPreset, Partial<ExportOptions>> = {
  complet: {
    includeStats: true,
    includePayments: true,
    paymentsLimit: 0, // 0 = all
    includeCoupons: true,
    couponsLimit: 0,
    includeChart: true,
    includeAlerts: true,
    includeProjects: true,
  },
  paiements: {
    includeStats: true,
    includePayments: true,
    paymentsLimit: 0,
    includeCoupons: false,
    includeChart: false,
    includeAlerts: false,
    includeProjects: false,
  },
  coupons: {
    includeStats: true,
    includePayments: false,
    includeCoupons: true,
    couponsLimit: 0,
    includeChart: false,
    includeAlerts: true,
    includeProjects: false,
  },
  alertes: {
    includeStats: false,
    includePayments: false,
    includeCoupons: true,
    couponsLimit: 5, // Only urgent ones
    includeChart: false,
    includeAlerts: true,
    includeProjects: false,
  },
  custom: {},
};

const getTodayString = () => new Date().toISOString().split('T')[0];
const getMonthAgoString = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
};

const DEFAULT_OPTIONS: ExportOptions = {
  includeStats: true,
  includePayments: true,
  paymentsLimit: 10,
  includeCoupons: true,
  couponsLimit: 10,
  includeChart: true,
  includeAlerts: true,
  includeProjects: false,
  includeInvestorDetails: false,
  includeVisuals: false,
  paymentsDateRange: 'last_3_months',
  paymentsStartDate: getMonthAgoString(3),
  paymentsEndDate: getTodayString(),
  couponsDateRange: 'all',
  couponsStartDate: '',
  couponsEndDate: '',
};

export function ExportModal({ isOpen, onClose, organizationId, dashboardData }: ExportModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>('complet');
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Load last selection from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('dashboard_export_config');
        if (saved) {
          const { preset, format: savedFormat } = JSON.parse(saved);
          setSelectedPreset(preset || 'complet');
          setFormat(savedFormat || 'excel');
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [isOpen]);

  // Update options when preset changes
  useEffect(() => {
    if (selectedPreset !== 'custom') {
      setOptions({ ...DEFAULT_OPTIONS, ...PRESET_CONFIGS[selectedPreset] });
    }
  }, [selectedPreset]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exporting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [isOpen, onClose, exporting]);

  const handlePresetClick = (preset: ExportPreset) => {
    setSelectedPreset(preset);
  };

  const calculateDateRange = (preset: DateRangePreset, forFuture: boolean = false): { start: string; end: string } => {
    const today = new Date();
    const start = today.toISOString().split('T')[0];

    if (forFuture) {
      // For future dates (coupons)
      switch (preset) {
        case 'this_month': {
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
          return { start, end };
        }
        case 'last_3_months': {
          const end = new Date(today);
          end.setMonth(end.getMonth() + 3);
          return { start, end: end.toISOString().split('T')[0] };
        }
        case 'last_6_months': {
          const end = new Date(today);
          end.setMonth(end.getMonth() + 6);
          return { start, end: end.toISOString().split('T')[0] };
        }
        case 'this_year': {
          const end = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
          return { start, end };
        }
        case 'all':
          return { start, end: '' };
        case 'custom':
        default:
          return { start: options.couponsStartDate, end: options.couponsEndDate };
      }
    } else {
      // For past dates (payments)
      const end = today.toISOString().split('T')[0];
      switch (preset) {
        case 'this_month': {
          const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          return { start, end };
        }
        case 'last_3_months': {
          const start = new Date(today);
          start.setMonth(start.getMonth() - 3);
          return { start: start.toISOString().split('T')[0], end };
        }
        case 'last_6_months': {
          const start = new Date(today);
          start.setMonth(start.getMonth() - 6);
          return { start: start.toISOString().split('T')[0], end };
        }
        case 'this_year': {
          const start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
          return { start, end };
        }
        case 'all':
          return { start: '', end: '' };
        case 'custom':
        default:
          return { start: options.paymentsStartDate, end: options.paymentsEndDate };
      }
    }
  };

  const handleDateRangeChange = (type: 'payments' | 'coupons', preset: DateRangePreset) => {
    const { start, end } = calculateDateRange(preset, type === 'coupons');

    if (type === 'payments') {
      setOptions({
        ...options,
        paymentsDateRange: preset,
        paymentsStartDate: start,
        paymentsEndDate: end,
      });
    } else {
      setOptions({
        ...options,
        couponsDateRange: preset,
        couponsStartDate: start,
        couponsEndDate: end,
      });
    }
  };

  const fetchFilteredData = async () => {
    let payments: any[] = [];
    let coupons: any[] = [];

    // Fetch filtered payments
    if (options.includePayments) {
      let query = supabase
        .from('paiements')
        .select(`
          id, id_paiement, montant, date_paiement, statut,
          tranche:tranches(tranche_name, projet_id)
        `)
        .order('date_paiement', { ascending: false });

      if (options.paymentsStartDate && options.paymentsDateRange !== 'all') {
        query = query.gte('date_paiement', options.paymentsStartDate);
      }
      if (options.paymentsEndDate && options.paymentsDateRange !== 'all') {
        query = query.lte('date_paiement', options.paymentsEndDate);
      }
      if (options.paymentsLimit > 0) {
        query = query.limit(options.paymentsLimit);
      }

      const { data, error } = await query;
      if (!error && data) payments = data;
    }

    // Fetch filtered coupons
    if (options.includeCoupons) {
      let query = supabase
        .from('souscriptions')
        .select(`
          id, tranche_id, prochaine_date_coupon, coupon_brut, investisseur_id,
          tranche:tranches(
            tranche_name, projet_id,
            projet:projets(projet)
          )
        `)
        .order('prochaine_date_coupon', { ascending: true });

      if (options.couponsStartDate && options.couponsDateRange !== 'all') {
        query = query.gte('prochaine_date_coupon', options.couponsStartDate);
      }
      if (options.couponsEndDate && options.couponsDateRange !== 'all') {
        query = query.lte('prochaine_date_coupon', options.couponsEndDate);
      } else if (options.couponsDateRange === 'all') {
        // For 'all', only get future coupons
        query = query.gte('prochaine_date_coupon', getTodayString());
      }

      const { data, error } = await query;
      if (!error && data) {
        // Group by tranche and date
        const grouped = data.reduce((acc: any[], coupon: any) => {
          const key = `${coupon.tranche_id}-${coupon.prochaine_date_coupon}`;
          const existing = acc.find((c) => `${c.tranche_id}-${c.prochaine_date_coupon}` === key);

          if (existing) {
            existing.investor_count += 1;
            existing.coupon_brut = new Decimal(existing.coupon_brut).plus(new Decimal(coupon.coupon_brut)).toNumber();
          } else {
            acc.push({ ...coupon, investor_count: 1 });
          }
          return acc;
        }, []);

        if (options.couponsLimit > 0) {
          coupons = grouped.slice(0, options.couponsLimit);
        } else {
          coupons = grouped;
        }
      }
    }

    return { payments, coupons };
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Save preferences
      localStorage.setItem(
        'dashboard_export_config',
        JSON.stringify({ preset: selectedPreset, format })
      );

      if (format === 'excel') {
        await exportToExcel();
      } else {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export error:', error);
      let errorMessage = 'Une erreur est survenue lors de l\'export.';

      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Erreur de permission. Vous n\'avez pas accès à ces données.';
        } else if (error.message.includes('quota') || error.message.includes('storage')) {
          errorMessage = 'Espace de stockage insuffisant. Libérez de l\'espace et réessayez.';
        }
      }

      alert(errorMessage);
      setExportProgress(0);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExportProgress(10);

    try {
      const ExcelJS = (await import('exceljs')).default;
      setExportProgress(20);

      const { payments, coupons } = await fetchFilteredData();
      setExportProgress(40);

      const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dashboard';
    workbook.created = new Date();

    // Statistics sheet
    if (options.includeStats) {
      const statsSheet = workbook.addWorksheet('Statistiques');
      statsSheet.columns = [
        { header: 'Métrique', key: 'metric', width: 30 },
        { header: 'Valeur', key: 'value', width: 20 },
      ];

      statsSheet.addRows([
        { metric: 'Montant total investi', value: formatCurrency(dashboardData.stats.totalInvested) },
        { metric: 'Coupons payés ce mois', value: formatCurrency(dashboardData.stats.couponsPaidThisMonth) },
        { metric: 'Projets actifs', value: dashboardData.stats.activeProjects },
        { metric: 'Coupons à venir (90j)', value: dashboardData.stats.upcomingCoupons },
      ]);

      // Style header
      statsSheet.getRow(1).font = { bold: true };
      statsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F5EEA' },
      };
      statsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Payments sheet
    if (options.includePayments && payments.length > 0) {
      const paymentsSheet = workbook.addWorksheet('Paiements');
      paymentsSheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Tranche', key: 'tranche', width: 25 },
        { header: 'Montant', key: 'montant', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Statut', key: 'statut', width: 15 },
      ];

      payments.forEach((payment) => {
        paymentsSheet.addRow({
          id: payment.id_paiement || payment.id,
          tranche: payment.tranche?.tranche_name || 'N/A',
          montant: formatCurrency(payment.montant),
          date: formatDate(payment.date_paiement),
          statut: payment.statut,
        });
      });

      // Style header
      paymentsSheet.getRow(1).font = { bold: true };
      paymentsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F5EEA' },
      };
      paymentsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Coupons sheet
    if (options.includeCoupons && coupons.length > 0) {
      const couponsSheet = workbook.addWorksheet('Coupons à venir');
      couponsSheet.columns = [
        { header: 'Projet', key: 'projet', width: 25 },
        { header: 'Tranche', key: 'tranche', width: 25 },
        { header: 'Montant', key: 'montant', width: 15 },
        { header: 'Date échéance', key: 'date', width: 15 },
        { header: 'Investisseurs', key: 'investors', width: 15 },
        { header: 'Jours restants', key: 'days', width: 15 },
      ];

      coupons.forEach((coupon) => {
        const daysUntil = Math.ceil(
          (new Date(coupon.prochaine_date_coupon).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        couponsSheet.addRow({
          projet: coupon.tranche?.projet?.projet || 'N/A',
          tranche: coupon.tranche?.tranche_name || 'N/A',
          montant: formatCurrency(parseFloat(coupon.coupon_brut.toString())),
          date: formatDate(coupon.prochaine_date_coupon),
          investors: coupon.investor_count || 1,
          days: daysUntil,
        });
      });

      // Style header
      couponsSheet.getRow(1).font = { bold: true };
      couponsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F5EEA' },
      };
      couponsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Alerts sheet
    if (options.includeAlerts && dashboardData.alerts.length > 0) {
      const alertsSheet = workbook.addWorksheet('Alertes');
      alertsSheet.columns = [
        { header: 'Type', key: 'type', width: 20 },
        { header: 'Message', key: 'message', width: 60 },
      ];

      dashboardData.alerts.forEach((alert) => {
        alertsSheet.addRow({
          type: alert.type,
          message: alert.message,
        });
      });

      // Style header
      alertsSheet.getRow(1).font = { bold: true };
      alertsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEF4444' },
      };
      alertsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Chart data sheet
    if (options.includeChart && dashboardData.monthlyData.length > 0) {
      const chartSheet = workbook.addWorksheet('Données mensuelles');
      chartSheet.columns = [
        { header: 'Mois', key: 'month', width: 15 },
        { header: 'Montant', key: 'amount', width: 20 },
        { header: 'Cumulé', key: 'cumulative', width: 20 },
      ];

      dashboardData.monthlyData.forEach((data) => {
        chartSheet.addRow({
          month: data.month,
          amount: formatCurrency(data.amount),
          cumulative: formatCurrency(data.cumulative || 0),
        });
      });

      // Style header
      chartSheet.getRow(1).font = { bold: true };
      chartSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F5EEA' },
      };
      chartSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

      // Generate and download
      setExportProgress(80);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-synthese-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Excel export error:', error);
      setExportProgress(0);
      throw error; // Re-throw to be caught by handleExport
    }
  };

  const exportToPDF = async () => {
    setExportProgress(10);

    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;
      setExportProgress(25);

      const { payments, coupons } = await fetchFilteredData();
      setExportProgress(45);

      const doc = new jsPDF() as JsPDFWithAutoTable;
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Synthèse Dashboard', 15, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatDate(new Date().toISOString().split('T')[0])}`, 15, yPos);
    yPos += 15;

    // Statistics
    if (options.includeStats) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistiques Globales', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Métrique', 'Valeur']],
        body: [
          ['Montant total investi', formatCurrencyForPDF(dashboardData.stats.totalInvested)],
          ['Coupons payés ce mois', formatCurrencyForPDF(dashboardData.stats.couponsPaidThisMonth)],
          ['Projets actifs', dashboardData.stats.activeProjects.toString()],
          ['Coupons à venir (90j)', dashboardData.stats.upcomingCoupons.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [31, 94, 234] },
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // Payments
    if (options.includePayments && payments.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Paiements', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Tranche', 'Montant', 'Date', 'Statut']],
        body: payments.map((p) => [
          p.id_paiement || p.id,
          p.tranche?.tranche_name || 'N/A',
          formatCurrencyForPDF(p.montant),
          formatDate(p.date_paiement),
          p.statut,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [31, 94, 234] },
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // Coupons
    if (options.includeCoupons && coupons.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Coupons à venir', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Projet', 'Tranche', 'Montant', 'Date', 'Jours']],
        body: coupons.map((c) => {
          const daysUntil = Math.ceil(
            (new Date(c.prochaine_date_coupon).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return [
            c.tranche?.projet?.projet || 'N/A',
            c.tranche?.tranche_name || 'N/A',
            formatCurrencyForPDF(parseFloat(c.coupon_brut.toString())),
            formatDate(c.prochaine_date_coupon),
            daysUntil.toString(),
          ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [31, 94, 234] },
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // Alerts
    if (options.includeAlerts && dashboardData.alerts.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Alertes', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Message']],
        body: dashboardData.alerts.map((a) => [a.type, a.message]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

      // Save PDF
      setExportProgress(90);
      doc.save(`dashboard-synthese-${new Date().toISOString().split('T')[0]}.pdf`);

      setExportProgress(100);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('PDF export error:', error);
      setExportProgress(0);
      throw error; // Re-throw to be caught by handleExport
    }
  };

  const getPreviewData = () => {
    let paymentsCount = 0;
    let couponsCount = 0;
    let sections = 0;

    if (options.includeStats) sections++;
    if (options.includeAlerts && dashboardData.alerts.length > 0) sections++;
    if (options.includeChart && dashboardData.monthlyData.length > 0) sections++;

    if (options.includePayments) {
      paymentsCount = options.paymentsLimit > 0
        ? Math.min(options.paymentsLimit, dashboardData.recentPayments.length)
        : dashboardData.recentPayments.length;
      if (paymentsCount > 0) sections++;
    }

    if (options.includeCoupons) {
      couponsCount = options.couponsLimit > 0
        ? Math.min(options.couponsLimit, dashboardData.upcomingCoupons.length)
        : dashboardData.upcomingCoupons.length;
      if (couponsCount > 0) sections++;
    }

    return { paymentsCount, couponsCount, sections };
  };

  const preview = getPreviewData();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Exporter votre synthèse</h3>
              <p className="text-slate-500 mt-2">Sélectionnez le type de rapport souhaité</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Presets - Large Card Style */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <button
              onClick={() => handlePresetClick('complet')}
              className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
                selectedPreset === 'complet'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedPreset === 'complet' ? 'bg-blue-500' : 'bg-slate-100 group-hover:bg-blue-100'}`}>
                  <FileText className={`w-6 h-6 ${selectedPreset === 'complet' ? 'text-white' : 'text-slate-600 group-hover:text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Synthèse Complète</h4>
                  <p className="text-sm text-slate-600">Rapport complet incluant statistiques, paiements récents, coupons à venir et alertes</p>
                </div>
                {selectedPreset === 'complet' && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('paiements')}
              className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
                selectedPreset === 'paiements'
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedPreset === 'paiements' ? 'bg-emerald-500' : 'bg-slate-100 group-hover:bg-emerald-100'}`}>
                  <Euro className={`w-6 h-6 ${selectedPreset === 'paiements' ? 'text-white' : 'text-slate-600 group-hover:text-emerald-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Historique des Paiements</h4>
                  <p className="text-sm text-slate-600">Liste détaillée de tous les paiements avec statistiques associées</p>
                </div>
                {selectedPreset === 'paiements' && (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('coupons')}
              className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
                selectedPreset === 'coupons'
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedPreset === 'coupons' ? 'bg-purple-500' : 'bg-slate-100 group-hover:bg-purple-100'}`}>
                  <Calendar className={`w-6 h-6 ${selectedPreset === 'coupons' ? 'text-white' : 'text-slate-600 group-hover:text-purple-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Coupons à Venir</h4>
                  <p className="text-sm text-slate-600">Échéancier des prochains coupons avec alertes et montants</p>
                </div>
                {selectedPreset === 'coupons' && (
                  <div className="flex items-center gap-1 text-purple-600">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('alertes')}
              className={`group relative p-6 rounded-xl border-2 transition-all text-left ${
                selectedPreset === 'alertes'
                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg scale-[1.02]'
                  : 'border-slate-200 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${selectedPreset === 'alertes' ? 'bg-orange-500' : 'bg-slate-100 group-hover:bg-orange-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${selectedPreset === 'alertes' ? 'text-white' : 'text-slate-600 group-hover:text-orange-600'}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-1">Rapport d'Alertes</h4>
                  <p className="text-sm text-slate-600">Alertes urgentes et coupons nécessitant une attention immédiate</p>
                </div>
                {selectedPreset === 'alertes' && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Format du fichier</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'excel'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`text-center ${format === 'excel' ? 'text-blue-900' : 'text-slate-700'}`}>
                  <div className="font-bold text-lg mb-1">Excel</div>
                  <div className="text-xs opacity-75">.xlsx • Tableau de données</div>
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`text-center ${format === 'pdf' ? 'text-blue-900' : 'text-slate-700'}`}>
                  <div className="font-bold text-lg mb-1">PDF</div>
                  <div className="text-xs opacity-75">.pdf • Document imprimable</div>
                </div>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {exporting && exportProgress > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-blue-900">Génération du rapport...</span>
                <span className="text-sm font-bold text-blue-600">{exportProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium disabled:opacity-50"
              disabled={exporting}
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || preview.sections === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:shadow-none"
            >
              {exporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Export en cours...
                </div>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Télécharger le rapport
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
