import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, X, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { EcheancierModal } from './EcheancierModal';

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
  const [selectedTranche, setSelectedTranche] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

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
                className="group border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer bg-white"
                onClick={() => {
                  setSelectedTranche(tranche);
                  setShowModal(true);
                }}
              >
                {/* Header avec nom de tranche et bouton */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">{tranche.tranche_name}</h3>
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

                {/* Alerte si retard */}
                {hasRetard && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        {stats.enRetard} coupon{stats.enRetard > 1 ? 's' : ''} en retard
                      </p>
                      <p className="text-xs text-red-700">Action requise : paiement en attente</p>
                    </div>
                  </div>
                )}

                {/* Grille d'informations */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Prochain paiement */}
                  {prochainCoupon && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-1">Prochain paiement</p>
                      <p className="text-sm font-bold text-slate-900">{formatDate(prochainCoupon.date)}</p>
                      <p className="text-xs text-slate-600 mt-1">{getRelativeDate(prochainCoupon.date)}</p>
                    </div>
                  )}

                  {/* Montant du prochain */}
                  {prochainCoupon && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 mb-1">Montant à payer</p>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(prochainCoupon.montant)}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {prochainCoupon.nb_investisseurs} inv.
                      </p>
                    </div>
                  )}

                  {/* Progression */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Progression</p>
                    <p className="text-sm font-bold text-slate-900">
                      {stats.payes} / {stats.totalEcheances}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {Math.round((stats.payes / stats.totalEcheances) * 100)}% payés
                    </p>
                  </div>
                </div>

                {/* Si tous payés */}
                {!prochainCoupon && !hasRetard && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">
                      Tous les coupons ont été payés
                    </p>
                  </div>
                )}

                {/* Indicateur cliquable */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 text-center group-hover:text-slate-700 transition-colors">
                    Cliquez pour voir le détail complet de l'échéancier →
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détaillé */}
      {showModal && selectedTranche && (
        <EcheancierModal
          tranche={selectedTranche}
          onClose={() => {
            setShowModal(false);
            setSelectedTranche(null);
          }}
          onPaymentClick={() => onPaymentClick(selectedTranche.id)}
        />
      )}
    </div>
  );
}

export default EcheancierCard;