import { TrendingUp, CheckCircle2, Folder, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Stats {
  totalInvested: number;
  couponsPaidThisMonth: number;
  activeProjects: number;
  upcomingCoupons: number;
  nextCouponDays: number;
}

interface DashboardStatsProps {
  stats: Stats;
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
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(stats.totalInvested)}
            </p>
            <span className="text-xs text-slate-500">
              Ce mois-ci
            </span>
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
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {formatCurrency(stats.couponsPaidThisMonth)}
            </p>
            <span className="text-xs text-slate-500">
              Ce mois-ci
            </span>
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
            <p className="text-3xl font-bold text-slate-900 mb-1">{stats.activeProjects}</p>
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
            <p className="text-3xl font-bold text-slate-900 mb-1">
              {stats.upcomingCoupons}
            </p>
            <span className="text-xs text-slate-500">
              Dans les 90 prochains jours
            </span>
          </div>
          <div className="bg-amber-100 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
