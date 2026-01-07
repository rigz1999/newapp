// ============================================
// Dashboard Alerts Generation Utility
// Path: src/utils/dashboardAlerts.ts
// ============================================

import { formatCurrency, formatDate, getRelativeDate } from './formatters';

export interface Payment {
  id: string;
  date_paiement: string;
  montant: number;
  statut: string;
  tranche_id: string;
  type: string;
  tranche?: {
    tranche_name: string;
    projet_id: string;
  };
}

export interface UpcomingCoupon {
  id: string;
  date_echeance?: string; // Écheance date (from coupons_echeances)
  prochaine_date_coupon?: string; // Subscription next coupon date (legacy, kept for backwards compatibility)
  montant_coupon?: number; // Coupon amount (from coupons_echeances)
  coupon_brut?: number; // Brut amount (legacy, kept for backwards compatibility)
  statut?: string; // Payment status (from coupons_echeances)
  investisseur_id?: string;
  tranche_id?: string;
  investor_count?: number; // For grouped coupons
  investisseur?: {
    nom_raison_sociale: string;
  };
  souscription?: {
    tranche_id: string;
    tranche?: {
      tranche_name: string;
      projet_id: string;
      projet?: {
        projet: string;
      };
    };
  };
  tranche?: {
    tranche_name: string;
    projet_id: string;
    projet?: {
      projet: string;
    };
  };
}

export interface Alert {
  id: string;
  type: 'deadline' | 'late_payment' | 'upcoming_coupons';
  message: string;
  count?: number;
}

/**
 * Génère les alertes dynamiques basées sur les données réelles
 */
export function generateAlerts(
  upcomingCoupons: UpcomingCoupon[],
  recentPayments: Payment[],
  ribManquantsCount: number
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  // 1. ÉCHEANCES EN RETARD (Overdue coupons)
  // Note: Échéances are counted by UNIQUE DATES, not by investor
  // Example: 10 investors, 1 date = 1 échéance (not 10)
  const overdueCoupons = upcomingCoupons.filter(c => {
    // If we have statut field (from coupons_echeances), check if unpaid and overdue
    if (c.statut !== undefined) {
      return c.statut !== 'paye' && c.date_echeance && new Date(c.date_echeance) < now;
    }
    // Legacy: if using prochaine_date_coupon from souscriptions
    if (c.prochaine_date_coupon) {
      const couponDate = new Date(c.prochaine_date_coupon);
      return couponDate < now;
    }
    return false;
  });

  // Group by unique dates to count échéances (not investors)
  const uniqueOverdueDates = new Set(
    overdueCoupons.map(c => c.date_echeance || c.prochaine_date_coupon).filter(Boolean)
  );

  if (uniqueOverdueDates.size > 0) {
    const totalOverdue = overdueCoupons.reduce((sum, c) => sum + (c.montant_coupon || c.coupon_brut || 0), 0);
    alerts.push({
      id: 'overdue-coupons',
      type: 'late_payment',
      message: `${uniqueOverdueDates.size} échéance${uniqueOverdueDates.size > 1 ? 's' : ''} en retard (${formatCurrency(totalOverdue)})`,
      count: uniqueOverdueDates.size,
    });
  }

  // 2. PAIEMENTS EN RETARD
  const latePayments = recentPayments.filter(p => {
    if (p.statut === 'payé') return false;
    const paymentDate = new Date(p.date_paiement);
    return paymentDate < now;
  });

  if (latePayments.length > 0) {
    const totalLate = latePayments.reduce((sum, p) => sum + p.montant, 0);
    alerts.push({
      id: 'late-payments',
      type: 'late_payment',
      message: `${latePayments.length} paiement${latePayments.length > 1 ? 's' : ''} en retard (${formatCurrency(totalLate)})`,
      count: latePayments.length,
    });
  }

  // 3. COUPONS À PAYER CETTE SEMAINE
  const weekThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = upcomingCoupons.filter(c => {
    const dateStr = c.date_echeance || c.prochaine_date_coupon;
    if (!dateStr) return false;
    const couponDate = new Date(dateStr);
    // Exclude paid coupons
    if (c.statut === 'paye') return false;
    return couponDate >= now && couponDate <= weekThreshold;
  });

  // Group by unique dates
  const uniqueUpcomingDates = new Set(
    upcomingThisWeek.map(c => c.date_echeance || c.prochaine_date_coupon).filter(Boolean)
  );

  if (uniqueUpcomingDates.size > 0) {
    const totalAmount = upcomingThisWeek.reduce((sum, c) => sum + (c.montant_coupon || c.coupon_brut || 0), 0);
    alerts.push({
      id: 'upcoming-week',
      type: 'upcoming_coupons',
      message: `${uniqueUpcomingDates.size} coupon${uniqueUpcomingDates.size > 1 ? 's' : ''} à payer cette semaine (${formatCurrency(totalAmount)})`,
      count: uniqueUpcomingDates.size,
    });
  }

  // 4. ÉCHÉANCES URGENTES (dans les 3 jours)
  const urgentThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const urgentCoupons = upcomingCoupons.filter(c => {
    const dateStr = c.date_echeance || c.prochaine_date_coupon;
    if (!dateStr) return false;
    const couponDate = new Date(dateStr);
    // Exclude paid coupons
    if (c.statut === 'paye') return false;
    return couponDate >= now && couponDate <= urgentThreshold;
  });

  if (urgentCoupons.length > 0) {
    // Grouper par tranche et compter les dates uniques (pas les investisseurs)
    const byTranche = urgentCoupons.reduce((acc, c) => {
      const trancheName = c.tranche?.tranche_name || c.souscription?.tranche?.tranche_name || 'Inconnu';
      const dateStr = c.date_echeance || c.prochaine_date_coupon || '';
      if (!acc[trancheName]) {
        acc[trancheName] = {
          dates: new Set<string>(),
          firstDate: dateStr,
        };
      }
      if (dateStr) {
        acc[trancheName].dates.add(dateStr);
      }
      return acc;
    }, {} as Record<string, { dates: Set<string>; firstDate: string }>);

    Object.entries(byTranche).forEach(([tranche, data]) => {
      // Only create alert if there are unique dates for this tranche
      if (data.dates.size > 0) {
        alerts.push({
          id: `deadline-${tranche}`,
          type: 'deadline',
          message: `Échéance urgente : ${tranche} - ${getRelativeDate(data.firstDate)} (${formatDate(data.firstDate)})`,
          count: data.dates.size,
        });
      }
    });
  }

  // 5. RIB MANQUANTS
  if (ribManquantsCount > 0) {
    alerts.push({
      id: 'missing-ribs',
      type: 'deadline',
      message: `${ribManquantsCount} investisseur${ribManquantsCount > 1 ? 's n\'ont' : ' n\'a'} pas de RIB enregistré`,
      count: ribManquantsCount,
    });
  }

  // Si aucune alerte, ajouter un message positif
  if (alerts.length === 0) {
    alerts.push({
      id: 'no-alerts',
      type: 'deadline',
      message: 'Aucune action urgente. Tous les paiements sont à jour.',
      count: 0,
    });
  }

  return alerts;
}
