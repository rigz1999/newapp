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
  const currentMonth = new Date().toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const formattedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-slate-900 text-sm font-medium block mb-0.5">
              Montant total collecté
            </span>
            <span className="text-[11px] text-slate-400 block mb-1.5">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-2 truncate">
              {formatCurrency(stats.totalInvested)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <GrowthBadge percentage={stats.totalInvestedMoM} label="MoM" />
              <GrowthBadge percentage={stats.totalInvestedYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-finixar-brand-blue" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-slate-900 text-sm font-medium block mb-0.5">Coupons versés</span>
            <span className="text-[11px] text-slate-400 block mb-1.5">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-2 truncate">
              {formatCurrency(stats.couponsPaidThisMonth)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <GrowthBadge percentage={stats.couponsPaidMoM} label="MoM" />
              <GrowthBadge percentage={stats.couponsPaidYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-finixar-action-create" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-slate-900 text-sm font-medium block mb-0.5">Projets actifs</span>
            <span className="text-[11px] text-slate-400 block mb-1.5">{formattedMonth}</span>
            <p className="text-2xl font-bold text-slate-900 mb-2">{stats.activeProjects}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <GrowthBadge percentage={stats.activeProjectsMoM} label="MoM" />
              <GrowthBadge percentage={stats.activeProjectsYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
            <Folder className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-slate-900 text-sm font-medium block mb-0.5">Coupons à venir</span>
            <span className="text-[11px] text-slate-400 block mb-1.5">90 prochains jours</span>
            <p className="text-2xl font-bold text-slate-900">{stats.upcomingCoupons}</p>
          </div>
          <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
});
