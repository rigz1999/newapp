export interface MonthlyData {
  month: string;
  amount: number;
  cumulative?: number;
}

interface SubscriptionRow {
  montant_investi?: number | string;
  date_souscription?: string;
  tranches?: { date_emission: string | null } | null;
}

const MONTH_NAMES = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

export function processMonthlyData(
  subscriptions: SubscriptionRow[],
  year: number,
  start: number,
  end: number
): MonthlyData[] {
  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  const monthlyTotals: { [key: string]: number } = {};

  for (let month = start; month <= end; month++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    monthlyTotals[monthKey] = 0;
  }

  subscriptions.forEach(sub => {
    const dateStr = sub.tranches?.date_emission || sub.date_souscription;
    if (dateStr) {
      const date = new Date(dateStr);
      const subYear = date.getFullYear();
      const subMonth = date.getMonth();
      const monthKey = `${subYear}-${String(subMonth + 1).padStart(2, '0')}`;

      if (subYear === year && subMonth >= start && subMonth <= end) {
        monthlyTotals[monthKey] =
          (monthlyTotals[monthKey] || 0) + parseFloat(sub.montant_investi?.toString() || '0');
      }
    }
  });

  const chartData: MonthlyData[] = [];
  let cumulative = 0;
  for (let month = start; month <= end; month++) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthAmount = monthlyTotals[monthKey] || 0;
    cumulative += monthAmount;
    chartData.push({
      month: MONTH_NAMES[month],
      amount: monthAmount,
      cumulative: cumulative,
    });
  }

  return chartData;
}
