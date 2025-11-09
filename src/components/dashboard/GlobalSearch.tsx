// ============================================
// Global Search Component - Enhanced Version
// Path: src/components/GlobalSearch.tsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Search, X, Folder, Users, Layers, FileText, DollarSign, Receipt, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  type: 'project' | 'investor' | 'tranche' | 'subscription' | 'payment' | 'coupon';
  id: string;
  title: string;
  subtitle: string;
  metadata?: string[];
  icon: React.ReactNode;
  link: string;
  matchScore?: number;
}

interface GroupedResults {
  projects: SearchResult[];
  investors: SearchResult[];
  tranches: SearchResult[];
  subscriptions: SearchResult[];
  payments: SearchResult[];
  coupons: SearchResult[];
}

interface GlobalSearchProps {
  orgId: string;
  onClose?: () => void;
}

type FilterType = 'all' | 'project' | 'investor' | 'tranche' | 'subscription' | 'payment' | 'coupon';

export function GlobalSearch({ orgId, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>({
    projects: [],
    investors: [],
    tranches: [],
    subscriptions: [],
    payments: [],
    coupons: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        // Silently ignore parse errors
      }
    }
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({
        projects: [],
        investors: [],
        tranches: [],
        subscriptions: [],
        payments: [],
        coupons: []
      });
      setError(null);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, orgId]);

  // Save to recent searches
  const saveToRecentSearches = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Highlight matching text
  const highlightText = (text: string, query: string): JSX.Element => {
    if (!query.trim()) return <>{text}</>;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-slate-900">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Perform search with retry logic
  const performSearchWithRetry = async (searchQuery: string, retries = 2): Promise<void> => {
    try {
      await performSearch(searchQuery);
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return performSearchWithRetry(searchQuery, retries - 1);
      }
      throw err;
    }
  };

  // Main search function - runs all searches in parallel
  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const lowerQuery = searchQuery.toLowerCase();
      
      // Run all searches in parallel for maximum performance
      const [projectsRes, investorsRes, tranchesRes, subscriptionsRes, paymentsRes, couponsRes] = await Promise.all([
        // Search Projects
        supabase
          .from('projets')
          .select('id, projet, emetteur, statut')
          .eq('org_id', orgId)
          .or(`projet.ilike.%${lowerQuery}%,emetteur.ilike.%${lowerQuery}%`)
          .limit(10),

        // Search Investors
        supabase
          .from('investisseurs')
          .select('id, nom_raison_sociale, id_investisseur, type, email')
          .eq('org_id', orgId)
          .or(`nom_raison_sociale.ilike.%${lowerQuery}%,id_investisseur.ilike.%${lowerQuery}%,email.ilike.%${lowerQuery}%`)
          .limit(10),

        // Search Tranches
        supabase
          .from('tranches')
          .select(`
            id,
            tranche_name,
            taux_interet,
            projets!inner(id, projet, org_id)
          `)
          .eq('projets.org_id', orgId)
          .ilike('tranche_name', `%${lowerQuery}%`)
          .limit(10),

        // Search Subscriptions
        supabase
          .from('souscriptions')
          .select(`
            id,
            date_souscription,
            nombre_obligations,
            montant_investi,
            tranches(tranche_name, projets(projet)),
            investisseurs(nom_raison_sociale, id_investisseur)
          `)
          .eq('org_id', orgId)
          .limit(10),

        // Search Payments
        supabase
          .from('paiements')
          .select(`
            id,
            date_paiement,
            montant,
            type_paiement,
            souscriptions(
              investisseurs(nom_raison_sociale),
              tranches(projets(projet))
            )
          `)
          .eq('org_id', orgId)
          .limit(10),

        // Search Coupons (from paiements where type is coupon)
        supabase
          .from('paiements')
          .select(`
            id,
            date_paiement,
            montant,
            souscriptions(
              investisseurs(nom_raison_sociale),
              tranches(tranche_name, projets(projet))
            )
          `)
          .eq('org_id', orgId)
          .eq('type_paiement', 'coupon')
          .limit(10)
      ]);

      // Process Projects
      const projects: SearchResult[] = (projectsRes.data || []).map((p: any) => ({
        type: 'project' as const,
        id: p.id,
        title: p.projet,
        subtitle: `Émetteur: ${p.emetteur}`,
        metadata: p.statut ? [p.statut] : [],
        icon: <Folder className="w-5 h-5 text-blue-600" />,
        link: `/projets/${p.id}`
      }));

      // Process Investors
      const investors: SearchResult[] = (investorsRes.data || []).map((inv: any) => ({
        type: 'investor' as const,
        id: inv.id,
        title: inv.nom_raison_sociale || 'Sans nom',
        subtitle: `ID: ${inv.id_investisseur}`,
        metadata: [
          inv.type === 'morale' ? 'Personne Morale' : 'Personne Physique',
          inv.email || ''
        ].filter(Boolean),
        icon: <Users className="w-5 h-5 text-finixar-green" />,
        link: `/investisseurs`
      }));

      // Process Tranches
      const tranches: SearchResult[] = (tranchesRes.data || []).map((t: any) => ({
        type: 'tranche' as const,
        id: t.id,
        title: t.tranche_name,
        subtitle: `Projet: ${t.projets?.projet || 'Inconnu'}`,
        metadata: t.taux_interet ? [`Taux: ${t.taux_interet}%`] : [],
        icon: <Layers className="w-5 h-5 text-purple-600" />,
        link: `/projets/${t.projets?.id}`
      }));

      // Process Subscriptions - filter by search query
      const subscriptions: SearchResult[] = (subscriptionsRes.data || [])
        .filter((s: any) => {
          const investorName = s.investisseurs?.nom_raison_sociale?.toLowerCase() || '';
          const projectName = s.tranches?.projets?.projet?.toLowerCase() || '';
          const trancheName = s.tranches?.tranche_name?.toLowerCase() || '';
          return investorName.includes(lowerQuery) || 
                 projectName.includes(lowerQuery) ||
                 trancheName.includes(lowerQuery);
        })
        .map((s: any) => ({
          type: 'subscription' as const,
          id: s.id,
          title: `Souscription - ${s.investisseurs?.nom_raison_sociale || 'Investisseur'}`,
          subtitle: `${s.tranches?.projets?.projet || 'Projet'} - ${formatDate(s.date_souscription)}`,
          metadata: [
            `${s.nombre_obligations} obligations`,
            formatCurrency(s.montant_investi)
          ],
          icon: <FileText className="w-5 h-5 text-orange-600" />,
          link: `/souscriptions`
        }));

      // Process Payments - filter by search query
      const payments: SearchResult[] = (paymentsRes.data || [])
        .filter((p: any) => {
          const investorName = p.souscriptions?.investisseurs?.nom_raison_sociale?.toLowerCase() || '';
          const projectName = p.souscriptions?.tranches?.projets?.projet?.toLowerCase() || '';
          return investorName.includes(lowerQuery) || projectName.includes(lowerQuery);
        })
        .map((p: any) => ({
          type: 'payment' as const,
          id: p.id,
          title: `Paiement - ${p.souscriptions?.investisseurs?.nom_raison_sociale || 'Investisseur'}`,
          subtitle: `${p.souscriptions?.tranches?.projets?.projet || 'Projet'} - ${formatDate(p.date_paiement)}`,
          metadata: [
            formatCurrency(p.montant),
            p.type_paiement || 'Paiement'
          ],
          icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
          link: `/paiements`
        }));

      // Process Coupons - filter by search query
      const coupons: SearchResult[] = (couponsRes.data || [])
        .filter((c: any) => {
          const investorName = c.souscriptions?.investisseurs?.nom_raison_sociale?.toLowerCase() || '';
          const projectName = c.souscriptions?.tranches?.projets?.projet?.toLowerCase() || '';
          const trancheName = c.souscriptions?.tranches?.tranche_name?.toLowerCase() || '';
          return investorName.includes(lowerQuery) || 
                 projectName.includes(lowerQuery) ||
                 trancheName.includes(lowerQuery);
        })
        .map((c: any) => ({
          type: 'coupon' as const,
          id: c.id,
          title: `Coupon - ${c.souscriptions?.investisseurs?.nom_raison_sociale || 'Investisseur'}`,
          subtitle: `${c.souscriptions?.tranches?.projets?.projet || 'Projet'} - ${formatDate(c.date_paiement)}`,
          metadata: [
            formatCurrency(c.montant),
            c.souscriptions?.tranches?.tranche_name || ''
          ],
          icon: <Receipt className="w-5 h-5 text-pink-600" />,
          link: `/coupons`
        }));

      setResults({
        projects,
        investors,
        tranches,
        subscriptions,
        payments,
        coupons
      });

      // Save to recent searches if we got results
      const totalResults = projects.length + investors.length + tranches.length + 
                          subscriptions.length + payments.length + coupons.length;
      if (totalResults > 0) {
        saveToRecentSearches(searchQuery);
      }

      // Log search analytics

    } catch {
      setError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
    onClose?.();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Get filtered results based on active filter
  const getFilteredResults = (): SearchResult[] => {
    const allResults = [
      ...results.projects,
      ...results.investors,
      ...results.tranches,
      ...results.subscriptions,
      ...results.payments,
      ...results.coupons
    ];

    if (activeFilter === 'all') return allResults;
    return allResults.filter(r => r.type === activeFilter);
  };

  const filteredResults = getFilteredResults();
  const totalResults = filteredResults.length;

  // Count results by type
  const resultCounts = {
    all: results.projects.length + results.investors.length + results.tranches.length + 
         results.subscriptions.length + results.payments.length + results.coupons.length,
    project: results.projects.length,
    investor: results.investors.length,
    tranche: results.tranches.length,
    subscription: results.subscriptions.length,
    payment: results.payments.length,
    coupon: results.coupons.length
  };

  // Render results grouped by type
  const renderGroupedResults = () => {
    const groups = [
      { key: 'projects', title: 'Projets', icon: <Folder className="w-4 h-4" />, color: 'text-blue-600', results: results.projects },
      { key: 'investors', title: 'Investisseurs', icon: <Users className="w-4 h-4" />, color: 'text-finixar-green', results: results.investors },
      { key: 'tranches', title: 'Tranches', icon: <Layers className="w-4 h-4" />, color: 'text-purple-600', results: results.tranches },
      { key: 'subscriptions', title: 'Souscriptions', icon: <FileText className="w-4 h-4" />, color: 'text-orange-600', results: results.subscriptions },
      { key: 'payments', title: 'Paiements', icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-600', results: results.payments },
      { key: 'coupons', title: 'Coupons', icon: <Receipt className="w-4 h-4" />, color: 'text-pink-600', results: results.coupons }
    ];

    return groups
      .filter(group => activeFilter === 'all' ? group.results.length > 0 : group.key === activeFilter)
      .map(group => (
        <div key={group.key} className="mb-4">
          {/* Group Header */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <span className={group.color}>{group.icon}</span>
            <span className="font-semibold text-slate-700 text-sm">
              {group.title}
            </span>
            <span className="text-xs text-slate-500">({group.results.length})</span>
          </div>

          {/* Group Results */}
          <div>
            {group.results.slice(0, 5).map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
              >
                <div className="flex-shrink-0 mt-0.5">{result.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {highlightText(result.title, query)}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    {highlightText(result.subtitle, query)}
                  </p>
                  {result.metadata && result.metadata.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {result.metadata.map((meta, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded"
                        >
                          {meta}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* View All Button */}
            {group.results.length > 5 && (
              <button
                onClick={() => {
                  // Navigate to the appropriate page with search filter
                  const routes = {
                    projects: '/projets',
                    investors: '/investisseurs',
                    tranches: '/projets',
                    subscriptions: '/souscriptions',
                    payments: '/paiements',
                    coupons: '/coupons'
                  };
                  navigate(routes[group.key as keyof typeof routes]);
                  onClose?.();
                }}
                className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                → Voir tous les {group.title.toLowerCase()} ({group.results.length} résultats)
              </button>
            )}
          </div>
        </div>
      ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div 
        ref={modalRef} 
        className={`bg-white shadow-2xl w-full flex flex-col ${
          isMobile 
            ? 'fixed inset-0 rounded-none max-h-full' 
            : 'rounded-2xl max-w-3xl max-h-[80vh]'
        }`}
      >
        {/* Header with Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher projets, investisseurs, tranches, souscriptions..."
              className="w-full pl-12 pr-12 py-4 text-lg border-none focus:outline-none focus:ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Tout', count: resultCounts.all },
              { key: 'project', label: 'Projets', count: resultCounts.project },
              { key: 'investor', label: 'Investisseurs', count: resultCounts.investor },
              { key: 'tranche', label: 'Tranches', count: resultCounts.tranche },
              { key: 'subscription', label: 'Souscriptions', count: resultCounts.subscription },
              { key: 'payment', label: 'Paiements', count: resultCounts.payment },
              { key: 'coupon', label: 'Coupons', count: resultCounts.coupon }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as FilterType)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-finixar-teal text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-1.5 ${activeFilter === filter.key ? 'text-blue-100' : 'text-slate-500'}`}>
                    ({filter.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {/* Error State */}
          {error && (
            <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-finixar-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Erreur de recherche</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-600">Recherche en cours...</p>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && query.trim().length >= 2 && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-500">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Aucun résultat pour "{query}"</p>
              <div className="text-sm text-center max-w-md">
                <p className="mb-3">Suggestions :</p>
                <ul className="text-left space-y-1">
                  <li>• Vérifiez l'orthographe</li>
                  <li>• Essayez des termes plus généraux</li>
                  <li>• Recherchez par ID investisseur ou projet</li>
                  <li>• Utilisez les filtres ci-dessus</li>
                </ul>
              </div>
            </div>
          )}

          {/* Results - Grouped by Type */}
          {!loading && !error && totalResults > 0 && (
            <div className="pb-4">
              {renderGroupedResults()}
            </div>
          )}

          {/* Recent Searches */}
          {!loading && query.trim().length < 2 && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Recherches récentes</span>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Effacer
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State - Initial */}
          {!loading && query.trim().length < 2 && recentSearches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Recherche globale</p>
              <p className="text-sm text-center max-w-md px-4">
                Tapez au moins 2 caractères pour rechercher dans les projets, investisseurs, tranches, souscriptions, paiements et coupons
              </p>
            </div>
          )}
        </div>

        {/* Footer - Results Summary */}
        {!loading && totalResults > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-600 text-center">
              {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''} pour "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}