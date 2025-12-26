import { useMemo } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { CouponCard } from '../components/CouponCard';
import { AlertTriangle, Clock, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

interface TimelineViewProps {
  coupons: Coupon[];
  onQuickPay: (coupon: Coupon) => void;
  onViewDetails: (coupon: Coupon) => void;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
}

interface TimelineZone {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  coupons: Coupon[];
}

export function TimelineView({
  coupons,
  onQuickPay,
  onViewDetails,
  selectedCoupons,
  onToggleSelect,
}: TimelineViewProps) {
  const zones = useMemo<TimelineZone[]>(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today);
    monthEnd.setDate(monthEnd.getDate() + 30);

    const overdue = coupons.filter(c => new Date(c.date_echeance) < today && c.statut_calculated !== 'paye');
    const todayCoupons = coupons.filter(c => {
      const date = new Date(c.date_echeance);
      return date >= today && date < tomorrow && c.statut_calculated !== 'paye';
    });
    const thisWeek = coupons.filter(c => {
      const date = new Date(c.date_echeance);
      return date >= tomorrow && date < weekEnd && c.statut_calculated !== 'paye';
    });
    const thisMonth = coupons.filter(c => {
      const date = new Date(c.date_echeance);
      return date >= weekEnd && date < monthEnd && c.statut_calculated !== 'paye';
    });
    const future = coupons.filter(c => {
      const date = new Date(c.date_echeance);
      return date >= monthEnd && c.statut_calculated !== 'paye';
    });
    const paid = coupons.filter(c => c.statut_calculated === 'paye');

    return [
      {
        id: 'overdue',
        title: 'En retard',
        subtitle: `${overdue.length} coupon${overdue.length > 1 ? 's' : ''}`,
        icon: <AlertTriangle className="w-6 h-6" />,
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        coupons: overdue,
      },
      {
        id: 'today',
        title: 'Aujourd\'hui',
        subtitle: `${todayCoupons.length} coupon${todayCoupons.length > 1 ? 's' : ''}`,
        icon: <Clock className="w-6 h-6" />,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        coupons: todayCoupons,
      },
      {
        id: 'week',
        title: 'Cette semaine',
        subtitle: `${thisWeek.length} coupon${thisWeek.length > 1 ? 's' : ''}`,
        icon: <Calendar className="w-6 h-6" />,
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        coupons: thisWeek,
      },
      {
        id: 'month',
        title: 'Ce mois-ci',
        subtitle: `${thisMonth.length} coupon${thisMonth.length > 1 ? 's' : ''}`,
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        coupons: thisMonth,
      },
      {
        id: 'future',
        title: 'Plus tard',
        subtitle: `${future.length} coupon${future.length > 1 ? 's' : ''}`,
        icon: <Calendar className="w-6 h-6" />,
        color: 'text-slate-700',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        coupons: future,
      },
      {
        id: 'paid',
        title: 'Payés',
        subtitle: `${paid.length} coupon${paid.length > 1 ? 's' : ''}`,
        icon: <CheckCircle className="w-6 h-6" />,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        coupons: paid,
      },
    ];
  }, [coupons]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {zones.map(zone => {
        if (zone.coupons.length === 0) return null;

        const total = zone.coupons.reduce((sum, c) => sum + c.montant_net, 0);

        return (
          <div
            key={zone.id}
            className={`border-2 ${zone.borderColor} ${zone.bgColor} rounded-xl overflow-hidden`}
          >
            {/* Zone Header */}
            <div className={`px-6 py-4 border-b-2 ${zone.borderColor} bg-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${zone.color}`}>{zone.icon}</div>
                  <div>
                    <h3 className={`text-lg font-bold ${zone.color}`}>{zone.title}</h3>
                    <p className="text-sm text-slate-600">{zone.subtitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-xl font-bold text-finixar-green">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>

            {/* Coupons Grid */}
            <div className="p-4 grid grid-cols-1 gap-3">
              {zone.coupons.map(coupon => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onQuickPay={() => onQuickPay(coupon)}
                  onViewDetails={() => onViewDetails(coupon)}
                  isSelected={selectedCoupons.has(coupon.id)}
                  onToggleSelect={() => onToggleSelect(coupon.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {coupons.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon</h3>
          <p className="text-slate-600">Aucun coupon ne correspond aux filtres</p>
        </div>
      )}
    </div>
  );
}
