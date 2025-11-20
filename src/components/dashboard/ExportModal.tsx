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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [exporting, setExporting] = useState(false);

  // Load last selection from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('dashboard_export_config');
        if (saved) {
          const { preset, format: savedFormat, options: savedOptions } = JSON.parse(saved);
          setSelectedPreset(preset || 'complet');
          setFormat(savedFormat || 'excel');
          if (savedOptions) setOptions(savedOptions);
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
      setShowAdvanced(false);
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

  const calculateDateRange = (preset: DateRangePreset): { start: string; end: string } => {
    const today = new Date();
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
  };

  const handleDateRangeChange = (type: 'payments' | 'coupons', preset: DateRangePreset) => {
    const { start, end } = calculateDateRange(preset);

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
        JSON.stringify({ preset: selectedPreset, format, options })
      );

      if (format === 'excel') {
        await exportToExcel();
      } else {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
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
        fgColor: { argb: 'FF2563EB' },
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
        fgColor: { argb: 'FF2563EB' },
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
        fgColor: { argb: 'FF2563EB' },
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
        fgColor: { argb: 'FF2563EB' },
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
      alert('Erreur lors de l\'export Excel. Veuillez réessayer.');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
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
        headStyles: { fillColor: [37, 99, 235] },
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
        headStyles: { fillColor: [37, 99, 235] },
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
      doc.text('Coupons à Venir', 15, yPos);
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
        headStyles: { fillColor: [37, 99, 235] },
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
      alert('Erreur lors de l\'export PDF. Veuillez réessayer.');
    } finally {
      setExporting(false);
      setExportProgress(0);
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
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Exporter Synthèse du Dashboard</h3>
              <p className="text-sm text-slate-600 mt-1">Choisissez les données à exporter</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Presets */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Modèles rapides</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePresetClick('complet')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedPreset === 'complet'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-slate-900">Complet</span>
                </div>
                <p className="text-xs text-slate-600">Toutes les données</p>
              </button>

              <button
                onClick={() => handlePresetClick('paiements')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedPreset === 'paiements'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Euro className="w-5 h-5 text-finixar-teal" />
                  <span className="font-semibold text-slate-900">Paiements</span>
                </div>
                <p className="text-xs text-slate-600">Paiements uniquement</p>
              </button>

              <button
                onClick={() => handlePresetClick('coupons')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedPreset === 'coupons'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-slate-900">Coupons</span>
                </div>
                <p className="text-xs text-slate-600">Coupons à venir</p>
              </button>

              <button
                onClick={() => handlePresetClick('alertes')}
                className={`p-4 border-2 rounded-lg transition-all text-left ${
                  selectedPreset === 'alertes'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-finixar-red" />
                  <span className="font-semibold text-slate-900">Alertes</span>
                </div>
                <p className="text-xs text-slate-600">Alertes urgentes</p>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-slate-200"></div>
            <button
              onClick={() => {
                setShowAdvanced(!showAdvanced);
                if (!showAdvanced) setSelectedPreset('custom');
              }}
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2"
            >
              Options avancées {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="mb-6 space-y-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stats"
                  checked={options.includeStats}
                  onChange={(e) => setOptions({ ...options, includeStats: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="stats" className="text-sm text-slate-900">
                  Statistiques globales
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payments"
                    checked={options.includePayments}
                    onChange={(e) => setOptions({ ...options, includePayments: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="payments" className="text-sm text-slate-900">
                    Paiements
                  </label>
                </div>
                {options.includePayments && (
                  <div className="ml-6 space-y-2">
                    <select
                      value={options.paymentsDateRange}
                      onChange={(e) => handleDateRangeChange('payments', e.target.value as DateRangePreset)}
                      className="text-sm px-3 py-1 border border-slate-300 rounded w-full"
                    >
                      <option value="all">Toutes les périodes</option>
                      <option value="this_month">Ce mois</option>
                      <option value="last_3_months">3 derniers mois</option>
                      <option value="last_6_months">6 derniers mois</option>
                      <option value="this_year">Cette année</option>
                      <option value="custom">Personnalisé</option>
                    </select>
                    {options.paymentsDateRange === 'custom' && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={options.paymentsStartDate}
                          onChange={(e) => setOptions({ ...options, paymentsStartDate: e.target.value })}
                          className="text-xs px-2 py-1 border border-slate-300 rounded flex-1"
                          placeholder="Du"
                        />
                        <input
                          type="date"
                          value={options.paymentsEndDate}
                          onChange={(e) => setOptions({ ...options, paymentsEndDate: e.target.value })}
                          className="text-xs px-2 py-1 border border-slate-300 rounded flex-1"
                          placeholder="Au"
                        />
                      </div>
                    )}
                    <select
                      value={options.paymentsLimit}
                      onChange={(e) => setOptions({ ...options, paymentsLimit: parseInt(e.target.value) })}
                      className="text-sm px-3 py-1 border border-slate-300 rounded w-full"
                    >
                      <option value="0">Tous les paiements</option>
                      <option value="10">10 derniers</option>
                      <option value="20">20 derniers</option>
                      <option value="50">50 derniers</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coupons"
                    checked={options.includeCoupons}
                    onChange={(e) => setOptions({ ...options, includeCoupons: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="coupons" className="text-sm text-slate-900">
                    Coupons à venir
                  </label>
                </div>
                {options.includeCoupons && (
                  <div className="ml-6 space-y-2">
                    <select
                      value={options.couponsDateRange}
                      onChange={(e) => handleDateRangeChange('coupons', e.target.value as DateRangePreset)}
                      className="text-sm px-3 py-1 border border-slate-300 rounded w-full"
                    >
                      <option value="all">Tous les coupons à venir</option>
                      <option value="this_month">Ce mois</option>
                      <option value="last_3_months">3 prochains mois</option>
                      <option value="last_6_months">6 prochains mois</option>
                      <option value="this_year">Cette année</option>
                      <option value="custom">Personnalisé</option>
                    </select>
                    {options.couponsDateRange === 'custom' && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={options.couponsStartDate}
                          onChange={(e) => setOptions({ ...options, couponsStartDate: e.target.value })}
                          className="text-xs px-2 py-1 border border-slate-300 rounded flex-1"
                          placeholder="Du"
                        />
                        <input
                          type="date"
                          value={options.couponsEndDate}
                          onChange={(e) => setOptions({ ...options, couponsEndDate: e.target.value })}
                          className="text-xs px-2 py-1 border border-slate-300 rounded flex-1"
                          placeholder="Au"
                        />
                      </div>
                    )}
                    <select
                      value={options.couponsLimit}
                      onChange={(e) => setOptions({ ...options, couponsLimit: parseInt(e.target.value) })}
                      className="text-sm px-3 py-1 border border-slate-300 rounded w-full"
                    >
                      <option value="0">Tous les coupons</option>
                      <option value="10">10 prochains</option>
                      <option value="20">20 prochains</option>
                      <option value="50">50 prochains</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chart"
                  checked={options.includeChart}
                  onChange={(e) => setOptions({ ...options, includeChart: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="chart" className="text-sm text-slate-900">
                  Données mensuelles (graphique)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alerts"
                  checked={options.includeAlerts}
                  onChange={(e) => setOptions({ ...options, includeAlerts: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="alerts" className="text-sm text-slate-900">
                  Alertes actives
                </label>
              </div>
            </div>
          )}

          {/* Format */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Format d'export</h4>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('excel')}
                className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                  format === 'excel'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold">Excel</div>
                <div className="text-xs">(.xlsx)</div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                  format === 'pdf'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold">PDF</div>
                <div className="text-xs">(.pdf)</div>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Votre export contiendra:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {options.includeStats && <div>• Statistiques globales</div>}
              {preview.paymentsCount > 0 && <div>• {preview.paymentsCount} paiement(s)</div>}
              {preview.couponsCount > 0 && <div>• {preview.couponsCount} coupon(s)</div>}
              {options.includeChart && dashboardData.monthlyData.length > 0 && (
                <div>• {dashboardData.monthlyData.length} mois de données</div>
              )}
              {options.includeAlerts && dashboardData.alerts.length > 0 && (
                <div>• {dashboardData.alerts.length} alerte(s)</div>
              )}
              {preview.sections === 0 && (
                <div className="text-amber-700">⚠️ Aucune donnée sélectionnée</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={exporting}
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || preview.sections === 0}
              className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                'Export en cours...'
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Télécharger
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
