// ============================================
// Global Search Component
// Path: src/components/GlobalSearch.tsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Search, X, Folder, Users, Layers, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  type: 'project' | 'investor' | 'tranche' | 'subscription';
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  link: string;
}

interface GlobalSearchProps {
  orgId: string;
  onClose?: () => void;
}

export function GlobalSearch({ orgId, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
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

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce

    return () => clearTimeout(searchTimeout);
  }, [query, orgId]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      const lowerQuery = searchQuery.toLowerCase();

      // Recherche dans les projets
      const { data: projects } = await supabase
        .from('projets')
        .select('id, projet, emetteur')
        .eq('org_id', orgId)
        .or(`projet.ilike.%${lowerQuery}%,emetteur.ilike.%${lowerQuery}%`)
        .limit(5);

      if (projects) {
        projects.forEach((p) => {
          searchResults.push({
            type: 'project',
            id: p.id,
            title: p.projet,
            subtitle: `Émetteur: ${p.emetteur}`,
            icon: <Folder className="w-5 h-5 text-blue-600" />,
            link: `/projets/${p.id}`
          });
        });
      }

      // Recherche dans les investisseurs
      const { data: investors } = await supabase
        .from('investisseurs')
        .select('id, nom_raison_sociale, id_investisseur, type')
        .eq('org_id', orgId)
        .or(`nom_raison_sociale.ilike.%${lowerQuery}%,id_investisseur.ilike.%${lowerQuery}%`)
        .limit(5);

      if (investors) {
        investors.forEach((inv) => {
          searchResults.push({
            type: 'investor',
            id: inv.id,
            title: inv.nom_raison_sociale || 'Sans nom',
            subtitle: `ID: ${inv.id_investisseur} - ${inv.type === 'morale' ? 'Personne Morale' : 'Personne Physique'}`,
            icon: <Users className="w-5 h-5 text-green-600" />,
            link: `/investisseurs`
          });
        });
      }

      // Recherche dans les tranches
      const { data: tranches } = await supabase
        .from('tranches')
        .select(`
          id,
          tranche_name,
          projets!inner(id, projet)
        `)
        .eq('projets.org_id', orgId)
        .ilike('tranche_name', `%${lowerQuery}%`)
        .limit(5);

      if (tranches) {
        tranches.forEach((t: any) => {
          searchResults.push({
            type: 'tranche',
            id: t.id,
            title: t.tranche_name,
            subtitle: `Projet: ${t.projets?.projet || 'Inconnu'}`,
            icon: <Layers className="w-5 h-5 text-purple-600" />,
            link: `/projets/${t.projets?.id}`
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col">
        {/* Header avec recherche */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un projet, investisseur ou tranche..."
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
        </div>

        {/* Résultats */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p>Aucun résultat trouvé</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0">{result.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-900">{result.title}</p>
                    <p className="text-sm text-slate-600">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Search className="w-12 h-12 mb-3 opacity-30" />
              <p>Tapez au moins 2 caractères pour rechercher</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}