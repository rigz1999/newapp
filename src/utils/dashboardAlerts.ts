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
  prochaine_date_coupon: string;
  coupon_brut: number;
  investisseur_id: string;
  tranche_id: string;
  investor_count?: number; // For grouped coupons
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
  const overdueCoupons = upcomingCoupons.filter(c => {
    const couponDate = new Date(c.prochaine_date_coupon);
    return couponDate < now;
  });

  if (overdueCoupons.length > 0) {
    const totalOverdue = overdueCoupons.reduce((sum, c) => sum + c.coupon_brut, 0);
    alerts.push({
      id: 'overdue-coupons',
      type: 'late_payment',
      message: `${overdueCoupons.length} échéance${overdueCoupons.length > 1 ? 's' : ''} en retard (${formatCurrency(totalOverdue)})`,
      count: overdueCoupons.length,
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
    const couponDate = new Date(c.prochaine_date_coupon);
    return couponDate >= now && couponDate <= weekThreshold;
  });

  if (upcomingThisWeek.length > 0) {
    const totalAmount = upcomingThisWeek.reduce((sum, c) => sum + c.coupon_brut, 0);
    alerts.push({
      id: 'upcoming-week',
      type: 'upcoming_coupons',
      message: `${upcomingThisWeek.length} coupon${upcomingThisWeek.length > 1 ? 's' : ''} à payer cette semaine (${formatCurrency(totalAmount)})`,
      count: upcomingThisWeek.length,
    });
  }

  // 4. ÉCHÉANCES URGENTES (dans les 3 jours)
  const urgentThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const urgentCoupons = upcomingCoupons.filter(c => {
    const couponDate = new Date(c.prochaine_date_coupon);
    return couponDate >= now && couponDate <= urgentThreshold;
  });

  if (urgentCoupons.length > 0) {
    // Grouper par tranche
    const byTranche = urgentCoupons.reduce((acc, c) => {
      const trancheName = c.tranche?.tranche_name || 'Inconnu';
      if (!acc[trancheName]) {
        acc[trancheName] = {
          count: 0,
          date: c.prochaine_date_coupon,
        };
      }
      acc[trancheName].count++;
      return acc;
    }, {} as Record<string, { count: number; date: string }>);

    Object.entries(byTranche).forEach(([tranche, data]) => {
      alerts.push({
        id: `deadline-${tranche}`,
        type: 'deadline',
        message: `Échéance urgente : ${tranche} - ${getRelativeDate(data.date)} (${formatDate(data.date)})`,
        count: data.count,
      });
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
