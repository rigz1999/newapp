import { useMemo, memo } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface MonthlyData {
  month: string;
  amount: number;
  cumulative?: number;
}

interface DashboardChartProps {
  monthlyData: MonthlyData[];
  viewMode: 'monthly' | 'cumulative';
  selectedYear: number;
  startMonth: number;
  endMonth: number;
  onViewModeChange: (mode: 'monthly' | 'cumulative') => void;
  onYearChange: (year: number) => void;
  onRangeChange: (start: number, end: number) => void;
}

export const DashboardChart = memo(
  ({
    monthlyData,
    viewMode,
    selectedYear,
    startMonth,
    endMonth,
    onViewModeChange,
    onYearChange,
    onRangeChange,
  }: DashboardChartProps): JSX.Element => {
    const chartMax = useMemo(() => {
      if (!monthlyData.length) {
        return 1;
      }
      return Math.max(
        ...monthlyData.map(d => (viewMode === 'cumulative' ? d.cumulative || 0 : d.amount)),
        1
      );
    }, [monthlyData, viewMode]);

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-slate-900">Évolution des montants levés</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="Mode d'affichage"
              value={viewMode}
              onChange={e => onViewModeChange(e.target.value as 'monthly' | 'cumulative')}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent font-medium"
            >
              <option value="monthly">Vue par mois</option>
              <option value="cumulative">Vue cumulée</option>
            </select>
            <select
              aria-label="Année"
              value={selectedYear}
              onChange={e => onYearChange(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent"
            >
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              aria-label="Plage de mois"
              value={`${startMonth}-${endMonth}`}
              onChange={e => {
                const [start, end] = e.target.value.split('-').map(Number);
                onRangeChange(start, end);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent"
            >
              <option value="0-11">Année complète</option>
              <option value="0-2">Q1 (Jan-Mar)</option>
              <option value="3-5">Q2 (Avr-Juin)</option>
              <option value="6-8">Q3 (Juil-Sep)</option>
              <option value="9-11">Q4 (Oct-Déc)</option>
              <option value="0-5">S1 (Jan-Juin)</option>
              <option value="6-11">S2 (Juil-Déc)</option>
            </select>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-lg">
            <div className="text-center text-slate-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée disponible</p>
            </div>
          </div>
        ) : (
          <div className="h-56 flex items-end justify-between gap-1.5 px-2 pb-3">
            {monthlyData.map((data, index) => {
              const displayAmount = viewMode === 'cumulative' ? data.cumulative || 0 : data.amount;
              const heightPercentage = Math.max(
                (displayAmount / chartMax) * 85,
                displayAmount > 0 ? 5 : 0
              );
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="relative group flex-1 w-full flex flex-col justify-end items-center">
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
                        <div className="font-semibold">{data.month}</div>
                        {viewMode === 'monthly' ? (
                          <div>{formatCurrency(data.amount)}</div>
                        ) : (
                          <>
                            <div className="text-slate-300">
                              Mensuel: {formatCurrency(data.amount)}
                            </div>
                            <div className="font-semibold">
                              Cumulé: {formatCurrency(data.cumulative || 0)}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-slate-900 transform rotate-45 mx-auto -mt-1"></div>
                    </div>
                    {displayAmount > 0 && (
                      <div className="mb-1 text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {formatCurrency(displayAmount)}
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-lg transition-all hover:opacity-90 cursor-pointer shadow-md ${
                        viewMode === 'cumulative'
                          ? 'bg-gradient-to-t from-finixar-purple to-finixar-teal hover:from-finixar-purple-hover hover:to-finixar-teal-hover'
                          : 'bg-gradient-to-t from-finixar-teal to-finixar-purple hover:from-finixar-purple hover:to-finixar-teal'
                      }`}
                      style={{ height: `${heightPercentage}%` }}
                      aria-label={`${data.month}: ${formatCurrency(displayAmount)}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{data.month}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
