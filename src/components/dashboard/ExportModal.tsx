import { useState, useEffect } from 'react';
import { X, FileText, Euro, Calendar, AlertTriangle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import Decimal from 'decimal.js';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

type ExcelJS = any;
type JsPDF = any;

interface JsPDFWithAutoTable {
  text: (text: string, x: number, y: number, options?: any) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setFont: (font: string, style: string) => void;
  rect: (x: number, y: number, width: number, height: number, style?: string) => void;
  roundedRect: (x: number, y: number, width: number, height: number, rx: number, ry: number, style?: string) => void;
  addPage: () => void;
  setPage: (page: number) => void;
  save: (filename: string) => void;
  internal: {
    pageSize: {
      width: number;
      height: number;
    };
    getNumberOfPages: () => number;
  };
  lastAutoTable: {
    finalY: number;
  };
}

// Format currency for PDF (replaces non-breaking spaces and fixes spacing issues)
const formatCurrencyForPDF = (amount: number): string => {
  // Get formatted currency and replace all non-breaking spaces with regular spaces
  const formatted = formatCurrency(amount)
    .replace(/\u00A0/g, ' ')  // Replace non-breaking space
    .replace(/\s+/g, ' ')     // Normalize multiple spaces to single space
    .trim();
  return formatted;
};

// Translate alert types to French
const translateAlertType = (type: string): string => {
  const translations: Record<string, string> = {
    'late_payment': 'Paiement en retard',
    'deadline': 'Échéance',
    'missing_rib': 'RIB manquant',
    'upcoming_coupon': 'Coupon à venir',
    'warning': 'Avertissement',
    'error': 'Erreur',
    'info': 'Information'
  };
  return translations[type] || type;
};

// Fix text spacing issues in PDF (removes extra spaces between characters)
const fixTextForPDF = (text: string): string => {
  return text
    .replace(/\u00A0/g, ' ')  // Replace non-breaking space
    .replace(/\s+/g, ' ')     // Normalize multiple spaces
    .trim();
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
  const [showCustomize, setShowCustomize] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Load last selection from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('dashboard_export_config');
        if (saved) {
          const { preset, format: savedFormat, options: savedOptions } = JSON.parse(saved);
          setSelectedPreset(preset || 'complet');
          setFormat(savedFormat || 'excel');
          if (savedOptions) {
            setOptions(savedOptions);
            setShowCustomize(true);
          }
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
    setShowCustomize(false);
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
        JSON.stringify({
          preset: selectedPreset,
          format,
          options: showCustomize ? options : undefined
        })
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
      const pageWidth = doc.internal.pageSize.width;
      let yPos = 25;

      // Professional Header with background
      doc.setFillColor(31, 94, 234); // Blue background
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Synthèse Dashboard', 15, 22);

      // Date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré le ${formatDate(new Date().toISOString().split('T')[0])}`, 15, 35);

      yPos = 60;

    // Statistics - Card Style
    if (options.includeStats) {
      // Reset text color
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistiques Globales', 15, yPos);
      yPos += 12;

      // Stats cards in 2x2 grid
      const cardWidth = (pageWidth - 40) / 2;
      const cardHeight = 28;
      const gap = 5;

      const stats = [
        {
          label: 'Montant total investi',
          value: formatCurrencyForPDF(dashboardData.stats.totalInvested),
          color: [59, 130, 246] // blue-500
        },
        {
          label: 'Coupons payés ce mois',
          value: formatCurrencyForPDF(dashboardData.stats.couponsPaidThisMonth),
          color: [16, 185, 129] // emerald-500
        },
        {
          label: 'Projets actifs',
          value: dashboardData.stats.activeProjects.toString(),
          color: [168, 85, 247] // purple-500
        },
        {
          label: 'Coupons à venir (90j)',
          value: dashboardData.stats.upcomingCoupons.toString(),
          color: [249, 115, 22] // orange-500
        }
      ];

      stats.forEach((stat, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 15 + (col * (cardWidth + gap));
        const y = yPos + (row * (cardHeight + gap));

        // Card background
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');

        // Label
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, x + 6, y + 8);

        // Value
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, x + 6, y + 20);
      });

      yPos += (cardHeight * 2) + gap + 20;
    }

    // Payments
    if (options.includePayments && payments.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 25;
      }

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Paiements', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Tranche', 'Montant', 'Date', 'Statut']],
        body: payments.map((p) => [
          fixTextForPDF(p.id_paiement || p.id),
          fixTextForPDF(p.tranche?.tranche_name || 'N/A'),
          formatCurrencyForPDF(p.montant),
          formatDate(p.date_paiement),
          fixTextForPDF(p.statut),
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [31, 94, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        margin: { left: 15, right: 15 },
        styles: {
          lineColor: [226, 232, 240], // slate-200
          lineWidth: 0.1
        }
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // Coupons
    if (options.includeCoupons && coupons.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 25;
      }

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(16);
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
            fixTextForPDF(c.tranche?.projet?.projet || 'N/A'),
            fixTextForPDF(c.tranche?.tranche_name || 'N/A'),
            formatCurrencyForPDF(parseFloat(c.coupon_brut.toString())),
            formatDate(c.prochaine_date_coupon),
            daysUntil.toString(),
          ];
        }),
        theme: 'striped',
        headStyles: {
          fillColor: [168, 85, 247], // purple-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [250, 245, 255] // purple-50
        },
        margin: { left: 15, right: 15 },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        }
      });

      yPos = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 15;
    }

    // Alerts
    if (options.includeAlerts && dashboardData.alerts.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 25;
      }

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Alertes', 15, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Message']],
        body: dashboardData.alerts.map((a) => [
          translateAlertType(a.type),
          fixTextForPDF(a.message)
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [239, 68, 68], // red-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          cellPadding: 5
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242] // red-50
        },
        margin: { left: 15, right: 15 },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        }
      });
    }

      // Add footer with page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height;
        doc.text(
          `Page ${i} sur ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
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
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Exporter Synthèse</h3>
              <p className="text-sm text-slate-600 mt-1">Choisissez votre rapport</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Presets - Compact 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => handlePresetClick('complet')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPreset === 'complet'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg ${selectedPreset === 'complet' ? 'bg-blue-500' : 'bg-slate-100'}`}>
                  <FileText className={`w-5 h-5 ${selectedPreset === 'complet' ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${selectedPreset === 'complet' ? 'text-blue-900' : 'text-slate-900'}`}>
                  Synthèse Complète
                </span>
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('paiements')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPreset === 'paiements'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg ${selectedPreset === 'paiements' ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                  <Euro className={`w-5 h-5 ${selectedPreset === 'paiements' ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${selectedPreset === 'paiements' ? 'text-emerald-900' : 'text-slate-900'}`}>
                  Paiements
                </span>
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('coupons')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPreset === 'coupons'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg ${selectedPreset === 'coupons' ? 'bg-purple-500' : 'bg-slate-100'}`}>
                  <Calendar className={`w-5 h-5 ${selectedPreset === 'coupons' ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${selectedPreset === 'coupons' ? 'text-purple-900' : 'text-slate-900'}`}>
                  Coupons
                </span>
              </div>
            </button>

            <button
              onClick={() => handlePresetClick('alertes')}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPreset === 'alertes'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`p-2 rounded-lg ${selectedPreset === 'alertes' ? 'bg-orange-500' : 'bg-slate-100'}`}>
                  <AlertTriangle className={`w-5 h-5 ${selectedPreset === 'alertes' ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${selectedPreset === 'alertes' ? 'text-orange-900' : 'text-slate-900'}`}>
                  Alertes
                </span>
              </div>
            </button>
          </div>

          {/* Format Selection - Segmented Control */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-slate-700 mb-2 block">Format</label>
            <div className="inline-flex p-1 bg-slate-100 rounded-lg w-full">
              <button
                onClick={() => setFormat('excel')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  format === 'excel'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Excel
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  format === 'pdf'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PDF
              </button>
            </div>
          </div>

          {/* Customize Toggle */}
          <button
            onClick={() => setShowCustomize(!showCustomize)}
            className="w-full mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1.5 py-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showCustomize ? 'rotate-180' : ''}`} />
            {showCustomize ? 'Masquer les options' : 'Personnaliser'}
          </button>

          {/* Customization Options */}
          {showCustomize && (
            <div className="mb-5 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Période (Paiements)</label>
                <select
                  value={options.paymentsDateRange}
                  onChange={(e) => handleDateRangeChange('payments', e.target.value as DateRangePreset)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="this_month">Ce mois</option>
                  <option value="last_3_months">3 derniers mois</option>
                  <option value="last_6_months">6 derniers mois</option>
                  <option value="this_year">Cette année</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Limite (Paiements)</label>
                <select
                  value={options.paymentsLimit}
                  onChange={(e) => setOptions({ ...options, paymentsLimit: parseInt(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">Tous</option>
                  <option value="10">10 derniers</option>
                  <option value="20">20 derniers</option>
                  <option value="50">50 derniers</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Période (Coupons)</label>
                <select
                  value={options.couponsDateRange}
                  onChange={(e) => handleDateRangeChange('coupons', e.target.value as DateRangePreset)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous à venir</option>
                  <option value="this_month">Ce mois</option>
                  <option value="last_3_months">3 prochains mois</option>
                  <option value="last_6_months">6 prochains mois</option>
                  <option value="this_year">Cette année</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Limite (Coupons)</label>
                <select
                  value={options.couponsLimit}
                  onChange={(e) => setOptions({ ...options, couponsLimit: parseInt(e.target.value) })}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">Tous</option>
                  <option value="10">10 prochains</option>
                  <option value="20">20 prochains</option>
                  <option value="50">50 prochains</option>
                </select>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {exporting && exportProgress > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-900">Export en cours...</span>
                <span className="text-xs font-bold text-blue-600">{exportProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium disabled:opacity-50"
              disabled={exporting}
            >
              Annuler
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || preview.sections === 0}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Export...</span>
                </div>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
