import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, X, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';

interface Echeance {
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  souscription_id: string;
  investisseur: {
    nom_raison_sociale: string;
  };
}

interface EcheancierCardProps {
  projectId: string;
  tranches: any[];
  onPaymentClick: (trancheId: string) => void;
}

export function EcheancierCard({ projectId, tranches, onPaymentClick }: EcheancierCardProps) {
  const [tranchesStats, setTranchesStats] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranchesEcheanciers();
  }, [projectId, tranches]);

  const fetchTranchesEcheanciers = async () => {
    setLoading(true);
    const statsMap = new Map();

    for (const tranche of tranches) {
      // Récupérer toutes les échéances de la tranche
      const { data: echeances } = await supabase
        .from('coupons_echeances')
        .select(`
          date_echeance,
          montant_coupon,
          statut,
          date_paiement,
          souscription_id,
          souscriptions!inner(
            tranche_id,
            investisseur:investisseurs(nom_raison_sociale)
          )
        `)
        .eq('souscriptions.tranche_id', tranche.id)
        .order('date_echeance', { ascending: true });

      if (echeances) {
        const now = new Date();
        const payes = echeances.filter(e => e.statut === 'paye').length;
        const enRetard = echeances.filter(e => e.statut === 'en_attente' && new Date(e.date_echeance) < now).length;
        const prochains = echeances.filter(e => e.statut === 'en_attente' && new Date(e.date_echeance) >= now);
        
        const prochainCoupon = prochains[0];
        const totalProchainCoupon = prochains
          .filter(e => e.date_echeance === prochainCoupon?.date_echeance)
          .reduce((sum, e) => sum + Number(e.montant_coupon), 0);

        statsMap.set(tranche.id, {
          payes,
          enRetard,
          prochainCoupon: prochainCoupon ? {
            date: prochainCoupon.date_echeance,
            montant: totalProchainCoupon,
            nb_investisseurs: prochains.filter(e => e.date_echeance === prochainCoupon.date_echeance).length
          } : null,
          totalEcheances: echeances.length
        });
      }
    }

    setTranchesStats(statsMap);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Demain";
    if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
    if (diffDays <= 7) return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffDays <= 30) return `Dans ${Math.ceil(diffDays / 7)} semaine${Math.ceil(diffDays / 7) > 1 ? 's' : ''}`;
    return `Dans ${Math.ceil(diffDays / 30)} mois`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Échéancier des Coupons</h2>
        </div>
      </div>

      {tranches.length === 0 ? (
        <p className="text-center text-slate-400 py-8">Aucune tranche pour afficher l'échéancier</p>
      ) : (
        <div className="space-y-3">
          {tranches.map((tranche) => {
            const stats = tranchesStats.get(tranche.id);
            if (!stats) return null;

            const hasRetard = stats.enRetard > 0;
            const prochainCoupon = stats.prochainCoupon;

            return (
              <div
                key={tranche.id}
                className="group border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onPaymentClick(tranche.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 mb-3">{tranche.tranche_name}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      {/* Statut principal */}
                      {hasRetard ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">
                            {stats.enRetard} coupon{stats.enRetard > 1 ? 's' : ''} en retard
                          </span>
                        </div>
                      ) : prochainCoupon ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-700">
                            {formatDate(prochainCoupon.date)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            Tous les coupons payés
                          </span>
                        </div>
                      )}

                      {/* Montant du prochain */}
                      {prochainCoupon && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-semibold">{formatCurrency(prochainCoupon.montant)}</span>
                        </div>
                      )}

                      {/* Nombre d'investisseurs */}
                      {prochainCoupon && (
                        <span className="text-sm text-slate-600">
                          {prochainCoupon.nb_investisseurs} investisseur{prochainCoupon.nb_investisseurs > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Ligne de statut et badge délai */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {stats.payes} payé{stats.payes > 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>{stats.totalEcheances - stats.payes} restant{stats.totalEcheances - stats.payes > 1 ? 's' : ''}</span>
                      </div>

                      {/* Badge "dans X jours" */}
                      {prochainCoupon && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          hasRetard 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {getRelativeDate(prochainCoupon.date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPaymentClick(tranche.id);
                    }}
                    className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-sm"
                  >
                    Enregistrer paiement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EcheancierCard;