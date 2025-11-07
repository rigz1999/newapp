import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, AlertCircle, Download } from 'lucide-react';

interface EcheancierCardProps {
  projectId: string;
  tranches: any[];
  onPaymentClick: (trancheId: string) => void;
  onViewAll?: () => void;
}

export function EcheancierCard({ projectId, tranches, onPaymentClick, onViewAll }: EcheancierCardProps) {
  const [tranchesStats, setTranchesStats] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || tranches.length === 0) {
      setLoading(false);
      return;
    }

    const fetchTranchesEcheanciers = async () => {
      setLoading(true);
      const statsMap = new Map();

      for (const tranche of tranches) {
        try {
          const { data: souscriptions } = await supabase
            .from('souscriptions')
            .select('id')
            .eq('tranche_id', tranche.id);

          if (!souscriptions || souscriptions.length === 0) continue;

          const subscriptionIds = souscriptions.map(s => s.id);

          const { data: echeances } = await supabase
            .from('coupons_echeances')
            .select('date_echeance, montant_coupon, statut, date_paiement, souscription_id')
            .in('souscription_id', subscriptionIds)
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
                nb_investisseurs: prochains.filter(e => e.date_echeance === prochainCoupon?.date_echeance).length
              } : null,
              totalEcheances: echeances.length
            });
          }
        } catch (error) {
          console.error(`Error fetching echeances for tranche ${tranche.id}:`, error);
        }
      }

      setTranchesStats(statsMap);
      setLoading(false);
    };

    fetchTranchesEcheanciers();
  }, [projectId, tranches.length]);

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

  const handleDownloadSynthese = async () => {
    const allEcheances: any[] = [];
    
    for (const tranche of tranches) {
      try {
        const { data: souscriptions } = await supabase
          .from('souscriptions')
          .select('id, investisseur_id')
          .eq('tranche_id', tranche.id);

        if (!souscriptions || souscriptions.length === 0) continue;

        const subscriptionIds = souscriptions.map(s => s.id);
        const investisseurIds = [...new Set(souscriptions.map(s => s.investisseur_id))];

        const { data: investisseurs } = await supabase
          .from('investisseurs')
          .select('id, nom_raison_sociale')
          .in('id', investisseurIds);

        const investisseursMap = new Map();
        investisseurs?.forEach(inv => {
          investisseursMap.set(inv.id, inv);
        });

        const { data: echeances } = await supabase
          .from('coupons_echeances')
          .select('*')
          .in('souscription_id', subscriptionIds)
          .order('date_echeance', { ascending: true });

        if (echeances) {
          allEcheances.push(...echeances.map((e: any) => {
            const sub = souscriptions.find(s => s.id === e.souscription_id);
            const investisseur = sub ? investisseursMap.get(sub.investisseur_id) : null;
            
            return {
              ...e,
              tranche_name: tranche.tranche_name,
              investisseur: investisseur || { nom_raison_sociale: 'Inconnu' }
            };
          }));
        }
      } catch (error) {
        console.error(`Error fetching data for tranche ${tranche.id}:`, error);
      }
    }

    const totalEcheances = allEcheances.length;
    const totalPayes = allEcheances.filter(e => e.statut === 'paye').length;
    const totalEnRetard = allEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()).length;
    const totalAVenir = allEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()).length;
    
    const montantTotal = allEcheances.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantPaye = allEcheances.filter(e => e.statut === 'paye').reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantEnRetard = allEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()).reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantAVenir = allEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()).reduce((sum, e) => sum + Number(e.montant_coupon), 0);

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const synthese = [
      ['SYNTHÈSE DE L\'ÉCHÉANCIER'],
      [''],
      ['Date d\'export', new Date().toLocaleDateString('fr-FR')],
      [''],
      ['STATISTIQUES GÉNÉRALES'],
      ['Total des coupons', totalEcheances],
      ['Coupons payés', totalPayes],
      ['Coupons en retard', totalEnRetard],
      ['Coupons à venir', totalAVenir],
      [''],
      ['MONTANTS (EUR)'],
      ['Montant total', montantTotal],
      ['Montant payé', montantPaye],
      ['Montant en retard', montantEnRetard],
      ['Montant à venir', montantAVenir],
      [''],
      ['PROGRESSION'],
      ['Taux de paiement', `${Math.round((totalPayes / totalEcheances) * 100)}%`],
    ];

    const wsSynthese = XLSX.utils.aoa_to_sheet(synthese);
    wsSynthese['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSynthese, 'Synthèse');

    const detailData = [
      ['Tranche', 'Investisseur', 'Date échéance', 'Montant (€)', 'Statut', 'Date paiement']
    ];

    allEcheances.forEach(e => {
      const statut = e.statut === 'paye' ? 'Payé' : (new Date(e.date_echeance) < new Date() ? 'En retard' : 'À venir');
      detailData.push([
        e.tranche_name,
        e.investisseur?.nom_raison_sociale || 'Inconnu',
        new Date(e.date_echeance).toLocaleDateString('fr-FR'),
        Number(e.montant_coupon),
        statut,
        e.date_paiement ? new Date(e.date_paiement).toLocaleDateString('fr-FR') : '-'
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail des coupons');

    const parTrancheData: any[] = [
      ['Tranche', 'Total coupons', 'Payés', 'En retard', 'À venir', 'Montant total (€)', 'Montant payé (€)']
    ];

    tranches.forEach(tranche => {
      const trancheEcheances = allEcheances.filter(e => e.tranche_name === tranche.tranche_name);
      const payes = trancheEcheances.filter(e => e.statut === 'paye').length;
      const enRetard = trancheEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()).length;
      const aVenir = trancheEcheances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()).length;
      const montantTotal = trancheEcheances.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
      const montantPaye = trancheEcheances.filter(e => e.statut === 'paye').reduce((sum, e) => sum + Number(e.montant_coupon), 0);

      parTrancheData.push([
        tranche.tranche_name,
        trancheEcheances.length,
        payes,
        enRetard,
        aVenir,
        montantTotal,
        montantPaye
      ]);
    });

    const wsParTranche = XLSX.utils.aoa_to_sheet(parTrancheData);
    wsParTranche['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsParTranche, 'Par tranche');

    XLSX.writeFile(wb, `Echeancier_Projet_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-900">Échéancier des Coupons</h2>
          </div>
          <button
            onClick={() => onViewAll?.()}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Voir tout
          </button>
        </div>
        <button
          onClick={handleDownloadSynthese}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Télécharger synthèse
        </button>
      </div>

      {tranches.length === 0 ? (
        <p className="text-center text-slate-400 py-8">Aucune tranche pour afficher l'échéancier</p>
      ) : (
        <div className="space-y-2">
          {tranches.map((tranche) => {
            const stats = tranchesStats.get(tranche.id);
            if (!stats) return null;

            const hasRetard = stats.enRetard > 0;
            const prochainCoupon = stats.prochainCoupon;

            return (
              <div
                key={tranche.id}
                className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all"
              >
                {/* ✅ LIGNE CLIQUABLE qui ouvre le modal */}
                <button
                  onClick={() => onViewAll?.()}
                  className="w-full px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Nom de tranche + Alerte si retard */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <h3 className="text-sm font-semibold text-slate-900">{tranche.tranche_name}</h3>
                      {hasRetard && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          {stats.enRetard} en retard
                        </span>
                      )}
                    </div>

                    {/* Infos compactes */}
                    <div className="flex items-center gap-6 flex-1">
                      {prochainCoupon && (
                        <>
                          <div className="text-xs">
                            <span className="text-slate-600">Prochain : </span>
                            <span className="font-semibold text-slate-900">{formatDate(prochainCoupon.date)}</span>
                            <span className="text-slate-500 ml-1">({getRelativeDate(prochainCoupon.date)})</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-slate-600">Montant : </span>
                            <span className="font-semibold text-slate-900">{formatCurrency(prochainCoupon.montant)}</span>
                            <span className="text-slate-500 ml-1">• {prochainCoupon.nb_investisseurs} inv.</span>
                          </div>
                        </>
                      )}
                      <div className="text-xs">
                        <span className="text-slate-600">Progression : </span>
                        <span className="font-semibold text-slate-900">{stats.payes}/{stats.totalEcheances}</span>
                        <span className="text-slate-500 ml-1">({Math.round((stats.payes / stats.totalEcheances) * 100)}%)</span>
                      </div>
                    </div>

                    {/* Bouton */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPaymentClick(tranche.id);
                      }}
                      className="flex-shrink-0 px-4 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors"
                    >
                      Enregistrer paiement
                    </button>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EcheancierCard;