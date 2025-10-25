import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Download, Search } from 'lucide-react';

interface Subscription {
  id: string;
  date_souscription: string;
  nombre_obligations: number;
  montant_investi: number;
  coupon_brut: number;
  coupon_net: number;
  prochaine_date_coupon: string | null;
  tranches: {
    tranche_name: string;
    frequence: string;
    projets: {
      projet: string;
      emetteur: string;
    };
  };
  investisseurs: {
    type: string;
    nom_raison_sociale: string | null;
    representant_legal: string | null;
    email: string | null;
  };
}

interface SubscriptionsProps {
  organization: { id: string; name: string; role: string };
}

export function Subscriptions({ organization }: SubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [trancheFilter, setTrancheFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchSubscriptions();
      }
    };

    loadData();

    return () => {
      isMounted = false;
      setSubscriptions([]);
      setFilteredSubscriptions([]);
    };
  }, [organization.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('souscriptions')
      .select(
        `
        *,
        tranches (
          tranche_name,
          frequence,
          projets (
            projet,
            emetteur
          )
        ),
        investisseurs (
          type,
          nom_raison_sociale,
          representant_legal,
          email
        )
      `
      )
      .order('date_souscription', { ascending: false });

    setSubscriptions((data as any) || []);
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

  const exportToCSV = () => {
    const headers = [
      'Projet',
      'Émetteur',
      'Tranche',
      'Investisseur',
      'Type',
      'Email',
      'Date souscription',
      'Quantité',
      'Montant investi',
      'Coupon brut',
      'Coupon net',
      'Prochaine date coupon',
    ];

    const rows = filteredSubscriptions.map((sub) => [
      sub.tranches.projets.projet,
      sub.tranches.projets.emetteur,
      sub.tranches.tranche_name,
      sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '',
      sub.investisseurs.type,
      sub.investisseurs.email || '',
      formatDate(sub.date_souscription),
      sub.nombre_obligations,
      sub.montant_investi,
      sub.coupon_brut,
      sub.coupon_net,
      formatDate(sub.prochaine_date_coupon),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueProjects = Array.from(new Set(subscriptions.map(s => s.tranches.projets.projet)));

  const availableTranches = projectFilter === 'all'
    ? []
    : Array.from(new Set(
        subscriptions
          .filter(s => s.tranches.projets.projet === projectFilter)
          .map(s => s.tranches.tranche_name)
      ));

  const uniqueYears = Array.from(new Set(
    subscriptions.map(s => new Date(s.date_souscription).getFullYear())
  )).sort((a, b) => b - a);

  const availableMonths = yearFilter === 'all' ? [] : Array.from(new Set(
    subscriptions
      .filter(s => new Date(s.date_souscription).getFullYear().toString() === yearFilter)
      .map(s => new Date(s.date_souscription).getMonth() + 1)
  )).sort((a, b) => a - b);

  const availableDays = (yearFilter === 'all' || monthFilter === 'all') ? [] : Array.from(new Set(
    subscriptions
      .filter(s => {
        const date = new Date(s.date_souscription);
        return date.getFullYear().toString() === yearFilter &&
               (date.getMonth() + 1).toString() === monthFilter;
      })
      .map(s => new Date(s.date_souscription).getDate())
  )).sort((a, b) => a - b);

  const handleProjectChange = (project: string) => {
    setProjectFilter(project);
    setTrancheFilter('all');
  };

  const handleYearChange = (year: string) => {
    setYearFilter(year);
    setMonthFilter('all');
    setDayFilter('all');
  };

  const handleMonthChange = (month: string) => {
    setMonthFilter(month);
    setDayFilter('all');
  };

  const matchesDateFilter = (dateStr: string) => {
    const date = new Date(dateStr);

    if (yearFilter !== 'all' && date.getFullYear().toString() !== yearFilter) {
      return false;
    }

    if (monthFilter !== 'all' && (date.getMonth() + 1).toString() !== monthFilter) {
      return false;
    }

    if (dayFilter !== 'all' && date.getDate().toString() !== dayFilter) {
      return false;
    }

    return true;
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        sub.tranches.projets.projet.toLowerCase().includes(term) ||
        sub.tranches.projets.emetteur.toLowerCase().includes(term) ||
        sub.tranches.tranche_name.toLowerCase().includes(term) ||
        sub.investisseurs.nom_raison_sociale?.toLowerCase().includes(term) ||
        sub.investisseurs.representant_legal?.toLowerCase().includes(term) ||
        sub.investisseurs.email?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    if (projectFilter !== 'all' && sub.tranches.projets.projet !== projectFilter) {
      return false;
    }

    if (trancheFilter !== 'all' && sub.tranches.tranche_name !== trancheFilter) {
      return false;
    }

    if (!matchesDateFilter(sub.date_souscription)) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Toutes les souscriptions ({filteredSubscriptions.length})
          </h2>
          <button
            onClick={exportToCSV}
            disabled={filteredSubscriptions.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Exporter CSV</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">Tous les projets</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <select
              value={trancheFilter}
              onChange={(e) => setTrancheFilter(e.target.value)}
              disabled={projectFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Toutes les tranches</option>
              {availableTranches.map((tranche) => (
                <option key={tranche} value={tranche}>
                  {tranche}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={yearFilter}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">Toutes les années</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={yearFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Tous les mois</option>
              {availableMonths.map((month) => (
                <option key={month} value={month.toString()}>
                  {new Date(2000, month - 1).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              disabled={yearFilter === 'all' || monthFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Tous les jours</option>
              {availableDays.map((day) => (
                <option key={day} value={day.toString()}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune souscription</h3>
            <p className="text-slate-600">
              {searchTerm ? 'Aucun résultat pour cette recherche' : 'Importez des tranches pour voir les souscriptions'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Projet / Tranche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Investisseur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Coupon Net
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Prochain Coupon
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.tranches.projets.projet}
                        </div>
                        <div className="text-sm text-slate-600">{sub.tranches.tranche_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '-'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {sub.investisseurs.type.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.date_souscription)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                        {sub.nombre_obligations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                        {formatCurrency(sub.montant_investi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                        {formatCurrency(sub.coupon_net)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.prochaine_date_coupon)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

export default Subscriptions;
