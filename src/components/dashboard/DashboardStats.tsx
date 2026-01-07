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

function GrowthBadge({ percentage, label }: { percentage?: number; label: string }) {
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
  const colorClass = isNeutral ? 'text-slate-500' : (isPositive ? 'text-emerald-600' : 'text-red-600');

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      {!isNeutral && <Icon className="w-3 h-3" />}
      {Math.abs(percentage).toFixed(1)}% <span className="text-slate-400 font-normal ml-1">{label}</span>
    </span>
  );
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-2">
              Montant total collecté
            </span>
            <p className="text-3xl font-bold text-slate-900 mb-2">
              {formatCurrency(stats.totalInvested)}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <GrowthBadge percentage={stats.totalInvestedMoM} label="MoM" />
              <GrowthBadge percentage={stats.totalInvestedYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded-xl">
            <TrendingUp className="w-6 h-6 text-finixar-brand-blue" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-2">
              Coupons versés
            </span>
            <p className="text-3xl font-bold text-slate-900 mb-2">
              {formatCurrency(stats.couponsPaidThisMonth)}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <GrowthBadge percentage={stats.couponsPaidMoM} label="MoM" />
              <GrowthBadge percentage={stats.couponsPaidYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-emerald-100 p-3 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-finixar-action-create" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-2">
              Projets actifs
            </span>
            <p className="text-3xl font-bold text-slate-900 mb-2">{stats.activeProjects}</p>
            <div className="flex items-center gap-3 text-xs">
              <GrowthBadge percentage={stats.activeProjectsMoM} label="MoM" />
              <GrowthBadge percentage={stats.activeProjectsYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-purple-100 p-3 rounded-xl">
            <Folder className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <span className="text-slate-600 text-sm font-medium block mb-2">
              Coupons à venir
            </span>
            <p className="text-3xl font-bold text-slate-900 mb-2">
              {stats.upcomingCoupons}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <GrowthBadge percentage={stats.upcomingCouponsMoM} label="MoM" />
              <GrowthBadge percentage={stats.upcomingCouponsYoY} label="YoY" />
            </div>
          </div>
          <div className="bg-amber-100 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
