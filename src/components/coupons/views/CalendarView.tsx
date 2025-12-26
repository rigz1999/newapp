import { useState, useMemo } from 'react';
import { Coupon } from '../../../hooks/coupons/useCoupons';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CouponCard } from '../components/CouponCard';

interface CalendarViewProps {
  coupons: Coupon[];
  onQuickPay: (coupon: Coupon) => void;
  onViewDetails: (coupon: Coupon) => void;
  selectedCoupons: Set<string>;
  onToggleSelect: (couponId: string) => void;
}

export function CalendarView({
  coupons,
  onQuickPay,
  onViewDetails,
  selectedCoupons,
  onToggleSelect,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Group coupons by date
  const couponsByDate = useMemo(() => {
    const grouped = new Map<string, Coupon[]>();
    coupons.forEach(coupon => {
      const date = coupon.date_echeance;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(coupon);
    });
    return grouped;
  }, [coupons]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get day of week (0=Sunday, 1=Monday, etc) - adjust for Monday start
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const daysInMonth = lastDay.getDate();

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      coupons: Coupon[];
      total: number;
    }> = [];

    // Previous month's trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateString = date.toISOString().split('T')[0];
      const dateCoupons = couponsByDate.get(dateString) || [];
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        coupons: dateCoupons,
        total: dateCoupons.reduce((sum, c) => sum + c.montant_net, 0),
      });
    }

    // Current month's days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const dateCoupons = couponsByDate.get(dateString) || [];
      days.push({
        date,
        dateString,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        coupons: dateCoupons,
        total: dateCoupons.reduce((sum, c) => sum + c.montant_net, 0),
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateString = date.toISOString().split('T')[0];
      const dateCoupons = couponsByDate.get(dateString) || [];
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        coupons: dateCoupons,
        total: dateCoupons.reduce((sum, c) => sum + c.montant_net, 0),
      });
    }

    return days;
  }, [currentMonth, couponsByDate]);

  const selectedDayCoupons = selectedDate ? (couponsByDate.get(selectedDate) || []) : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDayClassName = (day: typeof calendarDays[0]) => {
    let className = 'relative p-2 min-h-[100px] border border-slate-200 transition-all cursor-pointer ';

    if (!day.isCurrentMonth) {
      className += 'bg-slate-50 text-slate-400 ';
    } else {
      className += 'bg-white hover:bg-slate-50 ';
    }

    if (day.isToday) {
      className += 'ring-2 ring-blue-500 ';
    }

    if (selectedDate === day.dateString) {
      className += 'bg-blue-50 ring-2 ring-blue-500 ';
    }

    if (day.coupons.length > 0) {
      const hasOverdue = day.coupons.some(c => c.jours_restants < 0 && c.statut_calculated !== 'paye');
      const hasUnpaid = day.coupons.some(c => c.statut_calculated !== 'paye');

      if (hasOverdue) {
        className += 'border-l-4 border-l-red-500 ';
      } else if (hasUnpaid) {
        className += 'border-l-4 border-l-yellow-500 ';
      } else {
        className += 'border-l-4 border-l-green-500 ';
      }
    }

    return className;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Calendar Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 capitalize">{monthName}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => day.coupons.length > 0 && setSelectedDate(day.dateString)}
                  className={getDayClassName(day)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm font-medium ${day.isToday ? 'text-blue-700' : ''}`}>
                      {day.date.getDate()}
                    </span>
                    {day.coupons.length > 0 && (
                      <span className="text-xs bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        {day.coupons.length}
                      </span>
                    )}
                  </div>
                  {day.total > 0 && (
                    <div className="text-xs text-slate-700 font-medium truncate">
                      {formatCurrency(day.total)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
          {selectedDate && selectedDayCoupons.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {new Date(selectedDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {selectedDayCoupons.length} coupon{selectedDayCoupons.length > 1 ? 's' : ''} •{' '}
                {formatCurrency(selectedDayCoupons.reduce((sum, c) => sum + c.montant_net, 0))}
              </p>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDayCoupons.map(coupon => (
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
            </>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Cliquez sur une date pour voir les coupons</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
