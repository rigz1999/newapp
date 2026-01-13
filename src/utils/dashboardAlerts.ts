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
    projet?: {
      projet: string;
    };
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
      short_id: string;
      tranche_name: string;
      projet_id: string;
      projet?: {
        short_id: string;
        projet: string;
      };
    };
  };
  tranche?: {
    short_id: string;
    tranche_name: string;
    projet_id: string;
    projet?: {
      short_id: string;
      projet: string;
    };
  };
}

export interface AlertTargetFilters {
  status?: string;          // e.g., 'en_retard', 'en_attente' (displayed as 'prévu')
  trancheId?: string;       // Specific tranche ID (UUID - for DB lookups)
  trancheShortId?: string;  // Specific tranche short ID (for URLs)
  trancheName?: string;     // Tranche name for display
  projectId?: string;       // Specific project ID (UUID - for DB lookups)
  projectShortId?: string;  // Specific project short ID (for URLs)
  projectName?: string;     // Project name for display
  ribStatus?: string;       // e.g., 'without-rib'
  dateEcheance?: string;    // Specific échéance date
}

export interface Alert {
  id: string;
  type: 'deadline' | 'late_payment' | 'upcoming_coupons';
  message: string;
  count?: number;
  targetFilters?: AlertTargetFilters;
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
  const uniqueOverdueDates = new Set<string>();
  let totalOverdue = 0;

  for (const c of upcomingCoupons) {
    let isOverdue = false;
    let dateStr: string | undefined;

    // If we have statut field (from coupons_echeances), check if unpaid and overdue
    if (c.statut !== undefined) {
      if (c.statut !== 'paye' && c.date_echeance && new Date(c.date_echeance) < now) {
        isOverdue = true;
        dateStr = c.date_echeance;
      }
    }
    // Legacy: if using prochaine_date_coupon from souscriptions
    else if (c.prochaine_date_coupon) {
      const couponDate = new Date(c.prochaine_date_coupon);
      if (couponDate < now) {
        isOverdue = true;
        dateStr = c.prochaine_date_coupon;
      }
    }

    if (isOverdue && dateStr) {
      uniqueOverdueDates.add(dateStr);
      totalOverdue += c.montant_coupon || c.coupon_brut || 0;
    }
  }

  if (uniqueOverdueDates.size > 0) {
    alerts.push({
      id: 'overdue-coupons',
      type: 'late_payment',
      message: `${uniqueOverdueDates.size} échéance${uniqueOverdueDates.size > 1 ? 's' : ''} en retard (${formatCurrency(totalOverdue)})`,
      count: uniqueOverdueDates.size,
      targetFilters: {
        status: 'en_retard',
      },
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
      targetFilters: {
        status: 'en_retard',
      },
    });
  }

  // 3. COUPONS À PAYER CETTE SEMAINE (EXCLUANT LES 3 PROCHAINS JOURS)
  const weekThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const urgentThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const uniqueUpcomingDates = new Set<string>();
  let totalUpcomingAmount = 0;

  for (const c of upcomingCoupons) {
    const dateStr = c.date_echeance || c.prochaine_date_coupon;
    if (!dateStr || c.statut === 'paye') continue;

    const couponDate = new Date(dateStr);
    // Exclude urgent coupons (next 3 days) to avoid duplicates
    if (couponDate > urgentThreshold && couponDate <= weekThreshold) {
      uniqueUpcomingDates.add(dateStr);
      totalUpcomingAmount += c.montant_coupon || c.coupon_brut || 0;
    }
  }

  if (uniqueUpcomingDates.size > 0) {
    alerts.push({
      id: 'upcoming-week',
      type: 'upcoming_coupons',
      message: `${uniqueUpcomingDates.size} coupon${uniqueUpcomingDates.size > 1 ? 's' : ''} à payer cette semaine (${formatCurrency(totalUpcomingAmount)})`,
      count: uniqueUpcomingDates.size,
      targetFilters: {
        status: 'en_attente',
      },
    });
  }

  // 4. ÉCHÉANCES URGENTES (dans les 3 jours)
  const urgentCoupons = upcomingCoupons.filter(c => {
    const dateStr = c.date_echeance || c.prochaine_date_coupon;
    if (!dateStr) return false;
    const couponDate = new Date(dateStr);
    // Exclude paid coupons
    if (c.statut === 'paye') return false;
    return couponDate >= now && couponDate <= urgentThreshold;
  });

  if (urgentCoupons.length > 0) {
    // Grouper par projet + tranche et compter les dates uniques
    const byProjectTranche = urgentCoupons.reduce((acc, c) => {
      const trancheName = c.tranche?.tranche_name || c.souscription?.tranche?.tranche_name || 'Inconnu';
      const trancheShortId = c.tranche?.short_id || c.souscription?.tranche?.short_id || '';
      const projetName = c.tranche?.projet?.projet || c.souscription?.tranche?.projet?.projet || '';
      const projectShortId = c.tranche?.projet?.short_id || c.souscription?.tranche?.projet?.short_id || '';
      const trancheId = c.tranche_id || c.souscription?.tranche_id || '';
      const projectId = c.tranche?.projet_id || c.souscription?.tranche?.projet_id || '';
      const dateStr = c.date_echeance || c.prochaine_date_coupon || '';

      // Clé unique : projet|tranche
      const key = `${projetName}|${trancheName}`;

      if (!acc[key]) {
        acc[key] = {
          dates: new Set<string>(),
          firstDate: dateStr,
          projetName,
          trancheName,
          trancheId,
          trancheShortId,
          projectId,
          projectShortId,
        };
      }
      if (dateStr) {
        acc[key].dates.add(dateStr);
      }
      return acc;
    }, {} as Record<string, { dates: Set<string>; firstDate: string; projetName: string; trancheName: string; trancheId: string; trancheShortId: string; projectId: string; projectShortId: string }>);

    Object.entries(byProjectTranche).forEach(([key, data]) => {
      // Only create alert if there are unique dates for this project/tranche
      if (data.dates.size > 0) {
        const message = data.projetName
          ? `${data.trancheName} (${data.projetName}) ${getRelativeDate(data.firstDate)}`
          : `${data.trancheName} ${getRelativeDate(data.firstDate)}`;

        alerts.push({
          id: `deadline-${key}`,
          type: 'deadline',
          message,
          count: data.dates.size,
          targetFilters: {
            trancheId: data.trancheId,
            trancheShortId: data.trancheShortId,
            trancheName: data.trancheName,
            projectId: data.projectId,
            projectShortId: data.projectShortId,
            projectName: data.projetName,
            dateEcheance: data.firstDate,
            status: 'en_attente',
          },
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
      targetFilters: {
        ribStatus: 'without-rib',
      },
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
