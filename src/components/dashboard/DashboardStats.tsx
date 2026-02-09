import { memo } from 'react';
import { TrendingUp, CheckCircle2, Folder, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Stats {
  totalInvested: number;
  totalInvestedMoM?: number;
  totalInvestedYoY?: number;
  couponsPaidThisMonth: number;
  couponsPaidMoM?: number;
  couponsPaidYoY?: number;
  activeProjects: number;
  activeProjectsMoM?: number;
  activeProjectsYoY?: number;
  upcomingCoupons: number;
  upcomingCouponsMoM?: number;
  upcomingCouponsYoY?: number;
  nextCouponDays: number;
}

interface DashboardStatsProps {
  stats: Stats;
}

const GrowthBadge = memo(({ percentage, label }: { percentage?: number; label: string }) => {
  if (percentage === undefined || percentage === null || isNaN(percentage)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400">
        — <span className="font-normal ml-1">{label}</span>
      </span>
    );
  }

  const isPositive = percentage > 0;
  const isNeutral = percentage === 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isNeutral
    ? 'text-slate-500'
    : isPositive
      ? 'text-emerald-600'
      : 'text-red-600';

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      {!isNeutral && <Icon className="w-3 h-3" />}
      {Math.abs(percentage).toFixed(1)}%{' '}
      <span className="text-slate-400 font-normal ml-1">{label}</span>
    </span>
  );
});

export const DashboardStats = memo(({ stats }: DashboardStatsProps) => {
  // Format current month in French
  const currentMonth = new Date().toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 mb-8">
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-1">
              Montant total collecté
            </span>
            <span className="text-xs text-slate-400 block mb-3">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-3 whitespace-nowrap">
              {formatCurrency(stats.totalInvested)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <GrowthBadge percentage={stats.totalInvestedMoM} label="MoM" />
              <GrowthBadge percentage={stats.totalInvestedYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-blue-100 p-2.5 rounded-xl flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-finixar-brand-blue" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-1">Coupons versés</span>
            <span className="text-xs text-slate-400 block mb-3">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-3 whitespace-nowrap">
              {formatCurrency(stats.couponsPaidThisMonth)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <GrowthBadge percentage={stats.couponsPaidMoM} label="MoM" />
              <GrowthBadge percentage={stats.couponsPaidYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-emerald-100 p-2.5 rounded-xl flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-finixar-action-create" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-1">Projets actifs</span>
            <span className="text-xs text-slate-400 block mb-3">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-3">{stats.activeProjects}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <GrowthBadge percentage={stats.activeProjectsMoM} label="MoM" />
              <GrowthBadge percentage={stats.activeProjectsYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-purple-100 p-2.5 rounded-xl flex-shrink-0">
            <Folder className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-1">Coupons à venir</span>
            <span className="text-xs text-slate-400 block mb-3">90 prochains jours</span>
            <p className="text-2xl font-bold text-slate-900">{stats.upcomingCoupons}</p>
          </div>
          <div className="bg-amber-100 p-2.5 rounded-xl flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
});
