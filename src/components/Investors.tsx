import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { Users, Search, Eye, CreditCard as Edit, Trash2, Building2, User, ArrowUpDown } from 'lucide-react';

interface InvestorWithStats {
  id: string;
  id_investisseur: string;
  type: string;
  nom_raison_sociale: string;
  email: string | null;
  siren: number | null;
  residence_fiscale: string | null;
  created_at: string;
  total_investi: number;
  nb_souscriptions: number;
}

interface InvestorsProps {
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onSelectInvestor: (investorId: string) => void;
}

type SortField = 'id_investisseur' | 'nom_raison_sociale' | 'type' | 'email' | 'total_investi' | 'nb_souscriptions';
type SortDirection = 'asc' | 'desc';

export function Investors({ organization, onLogout, onNavigate, onSelectInvestor }: InvestorsProps) {
  const [investors, setInvestors] = useState<InvestorWithStats[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<InvestorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('nom_raison_sociale');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchInvestors();
  }, []);

  useEffect(() => {
    let filtered = investors;

    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv.nom_raison_sociale.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id_investisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.email && inv.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => inv.type === typeFilter);
    }

    filtered = sortInvestors(filtered, sortField, sortDirection);

    setFilteredInvestors(filtered);
  }, [searchTerm, typeFilter, investors, sortField, sortDirection]);

  const fetchInvestors = async () => {
    setLoading(true);

    const { data: investorsData } = await supabase
      .from('investisseurs')
      .select('*')
      .order('nom_raison_sociale');

    if (investorsData) {
      const investorsWithStats = await Promise.all(
        investorsData.map(async (investor) => {
          const { data: subscriptions } = await supabase
            .from('souscriptions')
            .select('montant_investi')
            .eq('investisseur_id', investor.id);

          const totalInvesti = subscriptions?.reduce((sum, sub) => sum + Number(sub.montant_investi || 0), 0) || 0;

          return {
            ...investor,
            total_investi: totalInvesti,
            nb_souscriptions: subscriptions?.length || 0,
          };
        })
      );

      setInvestors(investorsWithStats);
      setFilteredInvestors(investorsWithStats);
    }

    setLoading(false);
  };

  const sortInvestors = (data: InvestorWithStats[], field: SortField, direction: SortDirection) => {
    return [...data].sort((a, b) => {
      let aValue: any = a[field];
      let bValue: any = b[field];

      if (field === 'nom_raison_sociale' || field === 'id_investisseur' || field === 'email' || field === 'type') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-6 py-4 text-left text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        <ArrowUpDown className={`w-4 h-4 ${
          sortField === field ? 'text-blue-600' : 'text-slate-400'
        }`} />
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="investors"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Tous les Investisseurs</h2>
            <p className="text-slate-600 mt-1">{investors.length} investisseur{investors.length > 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Tous les types</option>
                <option value="physique">Personne Physique</option>
                <option value="morale">Personne Morale</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredInvestors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {searchTerm || typeFilter !== 'all' ? 'Aucun investisseur trouvé' : 'Aucun investisseur'}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || typeFilter !== 'all'
                  ? 'Essayez avec d\'autres critères'
                  : 'Ajoutez votre premier investisseur'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <SortableHeader field="id_investisseur">ID</SortableHeader>
                      <SortableHeader field="nom_raison_sociale">Nom / Raison Sociale</SortableHeader>
                      <SortableHeader field="type">Type</SortableHeader>
                      <SortableHeader field="email">Email</SortableHeader>
                      <SortableHeader field="total_investi">Total Investi</SortableHeader>
                      <SortableHeader field="nb_souscriptions">Souscriptions</SortableHeader>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestors.map((investor) => (
                      <tr key={investor.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-slate-600">{investor.id_investisseur}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              investor.type === 'morale' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {investor.type === 'morale' ? (
                                <Building2 className="w-4 h-4 text-purple-600" />
                              ) : (
                                <User className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{investor.nom_raison_sociale}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            investor.type === 'morale'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {investor.type === 'morale' ? 'Morale' : 'Physique'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{investor.email || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(investor.total_investi)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-900 font-medium">{investor.nb_souscriptions}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => onSelectInvestor(investor.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Éditer">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
