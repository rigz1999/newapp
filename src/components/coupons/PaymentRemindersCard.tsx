// ============================================
// Payment Reminders Card - Compact Display
// Path: src/components/coupons/PaymentRemindersCard.tsx
// ============================================

import { Bell } from 'lucide-react';

interface PaymentRemindersCardProps {
  enabled: boolean;
  remind7Days: boolean;
  remind14Days: boolean;
  remind30Days: boolean;
  onClick: () => void;
}

export default function PaymentRemindersCard({
  enabled,
  remind7Days,
  remind14Days,
  remind30Days,
  onClick,
}: PaymentRemindersCardProps) {
  // Build active periods text
  const getActivePeriods = () => {
    const periods: string[] = [];
    if (remind7Days) {
      periods.push('7');
    }
    if (remind14Days) {
      periods.push('14');
    }
    if (remind30Days) {
      periods.push('30');
    }

    if (periods.length === 0) {
      return 'Aucun';
    }
    return `${periods.join(', ')} jours`;
  };

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left w-full group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <Bell className={`w-5 h-5 ${enabled ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">Rappels de paiement</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className={`text-sm font-medium ${enabled ? 'text-green-700' : 'text-slate-500'}`}>
            {enabled ? 'Activé' : 'Désactivé'}
          </span>
        </div>

        {enabled && <div className="text-xs text-slate-600">→ {getActivePeriods()} avant</div>}
      </div>

      <div className="mt-4 text-xs text-blue-600 group-hover:text-blue-700 font-medium">
        Cliquer pour configurer →
      </div>
    </button>
  );
}
