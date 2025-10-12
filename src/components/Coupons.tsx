import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, TrendingUp, Download } from 'lucide-react';

interface Coupon {
  id: string;
  prochaine_date_coupon: string;
  coupon_net: number;
  montant_investi: number;
  tranches: {
    tranche_name: string;
    frequence: string;
    projects: {
      project_name: string;
      emetteur: string;
    };
  };
  investors: {
    investor_type: string;
    raison_sociale: string | null;
    representant_legal: string | null;
    email: string | null;
  };
}

interface CouponsProps {
  organizationId: string;
  onBack: () => void;
}

export function Coupons({ organizationId, onBack }: CouponsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, [organizationId]);

  const fetchCoupons = async () => {
    setLoading(true);

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('org_id', organizationId);

    const projectIds = projects?.map((p) => p.id) || [];

    if (projectIds.length === 0) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    const { data: tranches } = await supabase
      .from('tranches')
      .select('id')
      .in('project_id', projectIds);

    const trancheIds = tranches?.map((t) => t.id) || [];

    if (trancheIds.length === 0) {
      setCoupons([]);
      setLoading(false);
      return;
    }

    const today = new Date();
    const in90Days = new Date();
    in90Days.setDate(today.getDate() + 90);

    const { data } = await supabase
      .from('subscriptions')
      .select(
        `
        *,
        tranches (
          tranche_name,
          frequence,
          projects (
            project_name,
            emetteur
          )
        ),
        investors (
          investor_type,
          raison_sociale,
          representant_legal,
          email
        )
      `
      )
      .in('tranche_id', trancheIds)
      .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
      .lte('prochaine_date_coupon', in90Days.toISOString().split('T')[0])
      .order('prochaine_date_coupon', { ascending: true });

    setCoupons((data as any) || []);
    setLoading(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalCoupons = coupons.reduce((sum, coupon) => sum + coupon.coupon_net, 0);

  const exportToCSV = () => {
    const headers = [
      'Date du coupon',
      'Projet',
      'Émetteur',
      'Tranche',
      'Investisseur',
      'Type',
      'Email',
      'Montant coupon net',
      'Montant investi',
    ];

    const rows = coupons.map((coupon) => [
      formatDate(coupon.prochaine_date_coupon),
      coupon.tranches.projects.project_name,
      coupon.tranches.projects.emetteur,
      coupon.tranches.tranche_name,
      coupon.investors.raison_sociale || coupon.investors.representant_legal || '',
      coupon.investors.investor_type,
      coupon.investors.email || '',
      coupon.coupon_net,
      coupon.montant_investi,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coupons_90jours_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900">Coupons à venir</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Coupons à 90 jours</h2>
            <p className="text-slate-600 mt-1">
              Total à verser: <span className="font-bold text-slate-900">{formatCurrency(totalCoupons)}</span>
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={coupons.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Exporter CSV</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon à venir</h3>
            <p className="text-slate-600">Aucun coupon n'est prévu dans les 90 prochains jours</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Dans
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Projet / Tranche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Investisseur
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Montant Investi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Coupon Net
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {coupons.map((coupon) => {
                    const daysUntil = getDaysUntil(coupon.prochaine_date_coupon);
                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {formatDate(coupon.prochaine_date_coupon)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              daysUntil <= 7
                                ? 'bg-red-100 text-red-800'
                                : daysUntil <= 30
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {coupon.tranches.projects.project_name}
                          </div>
                          <div className="text-sm text-slate-600">{coupon.tranches.tranche_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">
                            {coupon.investors.raison_sociale || coupon.investors.representant_legal || '-'}
                          </div>
                          <div className="text-sm text-slate-600">{coupon.investors.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                          {formatCurrency(coupon.montant_investi)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                          {formatCurrency(coupon.coupon_net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                      Total à verser:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                      {formatCurrency(totalCoupons)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
