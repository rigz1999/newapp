import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, AlertCircle, Download } from 'lucide-react';
import ExcelJS from 'exceljs';

interface Echeance {
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  souscription_id: string;
}

interface EcheancierCardProps {
  projectId: string;
  tranches: any[];
  onPaymentClick: (trancheId: string) => void;
  onViewAll?: () => void;
}

export function EcheancierCard({ projectId, tranches, onPaymentClick, onViewAll }: EcheancierCardProps) {
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || tranches.length === 0) {
      setLoading(false);
      return;
    }

    const fetchGlobalEcheancier = async () => {
      setLoading(true);

      let allEcheances: Echeance[] = [];

      // Charger toutes les échéances de toutes les tranches
      for (const tranche of tranches) {
        try {
          const { data: souscriptions } = await supabase
            .from('souscriptions')
            .select('id')
            .eq('tranche_id', tranche.id);

          if (!souscriptions || souscriptions.length === 0) continue;

          const subscriptionIds = souscriptions.map((s: any) => s.id);

          const { data: echeances } = await supabase
            .from('coupons_echeances')
            .select('date_echeance, montant_coupon, statut, date_paiement, souscription_id')
            .in('souscription_id', subscriptionIds)
            .order('date_echeance', { ascending: true });

          if (echeances) {
            allEcheances.push(...echeances);
          }
        } catch (error) {
          console.error(`Error fetching echeances for tranche ${tranche.id}:`, error);
        }
      }

      // Calculer les stats globales
      if (allEcheances.length > 0) {
        const now = new Date();
        const payes = allEcheances.filter((e: Echeance) => e.statut === 'paye').length;
        const enRetard = allEcheances.filter((e: Echeance) => e.statut === 'en_attente' && new Date(e.date_echeance) < now).length;
        const prochains = allEcheances.filter((e: Echeance) => e.statut === 'en_attente' && new Date(e.date_echeance) >= now);

        // Trouver le prochain coupon (la plus proche échéance à venir)
        const prochainCoupon = prochains[0];

        // Calculer le total et le nombre d'investisseurs pour toutes les échéances du même jour
        const totalProchainCoupon = prochainCoupon
          ? prochains
              .filter((e: Echeance) => e.date_echeance === prochainCoupon.date_echeance)
              .reduce((sum: number, e: Echeance) => sum + Number(e.montant_coupon), 0)
          : 0;

        const nbInvestisseursProchain = prochainCoupon
          ? new Set(prochains
              .filter((e: Echeance) => e.date_echeance === prochainCoupon.date_echeance)
              .map((e: Echeance) => e.souscription_id)
            ).size
          : 0;

        setGlobalStats({
          payes,
          enRetard,
          prochainCoupon: prochainCoupon ? {
            date: prochainCoupon.date_echeance,
            montant: totalProchainCoupon,
            nb_investisseurs: nbInvestisseursProchain
          } : null,
          totalEcheances: allEcheances.length
        });
      }

      setLoading(false);
    };

    fetchGlobalEcheancier();
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

        const subscriptionIds = souscriptions.map((s: any) => s.id);
        const investisseurIds = [...new Set(souscriptions.map((s: any) => s.investisseur_id))];

        const { data: investisseurs } = await supabase
          .from('investisseurs')
          .select('id, nom_raison_sociale')
          .in('id', investisseurIds);

        const investisseursMap = new Map();
        investisseurs?.forEach((inv: any) => {
          investisseursMap.set(inv.id, inv);
        });

        const { data: echeances } = await supabase
          .from('coupons_echeances')
          .select('*')
          .in('souscription_id', subscriptionIds)
          .order('date_echeance', { ascending: true });

        if (echeances) {
          allEcheances.push(...echeances.map((e: any) => {
            const sub = souscriptions.find((s: any) => s.id === e.souscription_id);
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

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Synthèse
    const wsSynthese = workbook.addWorksheet('Synthèse');
    wsSynthese.columns = [
      { key: 'label', width: 25 },
      { key: 'value', width: 15 }
    ];

    const synthese = [
      ['SYNTHÈSE DE L\'ÉCHÉANCIER', ''],
      ['', ''],
      ['Date d\'export', new Date().toLocaleDateString('fr-FR')],
      ['', ''],
      ['STATISTIQUES GÉNÉRALES', ''],
      ['Total des coupons', totalEcheances],
      ['Coupons payés', totalPayes],
      ['Coupons en retard', totalEnRetard],
      ['Coupons à venir', totalAVenir],
      ['', ''],
      ['MONTANTS (EUR)', ''],
      ['Montant total', montantTotal],
      ['Montant payé', montantPaye],
      ['Montant en retard', montantEnRetard],
      ['Montant à venir', montantAVenir],
      ['', ''],
      ['PROGRESSION', ''],
      ['Taux de paiement', `${Math.round((totalPayes / totalEcheances) * 100)}%`],
    ];
    synthese.forEach(row => wsSynthese.addRow(row));

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

    // Sheet 2: Détail des coupons
    const wsDetail = workbook.addWorksheet('Détail des coupons');
    wsDetail.columns = [
      { key: 'tranche', header: 'Tranche', width: 20 },
      { key: 'investisseur', header: 'Investisseur', width: 25 },
      { key: 'date', header: 'Date échéance', width: 15 },
      { key: 'montant', header: 'Montant (€)', width: 12 },
      { key: 'statut', header: 'Statut', width: 12 },
      { key: 'datePaiement', header: 'Date paiement', width: 15 }
    ];
    detailData.slice(1).forEach(row => {
      wsDetail.addRow({
        tranche: row[0],
        investisseur: row[1],
        date: row[2],
        montant: row[3],
        statut: row[4],
        datePaiement: row[5]
      });
    });

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

    // Sheet 3: Par tranche
    const wsParTranche = workbook.addWorksheet('Par tranche');
    wsParTranche.columns = [
      { key: 'tranche', header: 'Tranche', width: 20 },
      { key: 'total', header: 'Total coupons', width: 15 },
      { key: 'payes', header: 'Payés', width: 10 },
      { key: 'enRetard', header: 'En retard', width: 12 },
      { key: 'aVenir', header: 'À venir', width: 10 },
      { key: 'montantTotal', header: 'Montant total (€)', width: 18 },
      { key: 'montantPaye', header: 'Montant payé (€)', width: 18 }
    ];
    parTrancheData.slice(1).forEach(row => {
      wsParTranche.addRow({
        tranche: row[0],
        total: row[1],
        payes: row[2],
        enRetard: row[3],
        aVenir: row[4],
        montantTotal: row[5],
        montantPaye: row[6]
      });
    });

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Echeancier_Projet_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-finixar-brand-blue rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Télécharger synthèse
        </button>
      </div>

      {tranches.length === 0 ? (
        <p className="text-center text-slate-400 py-8">Aucune tranche pour afficher l'échéancier</p>
      ) : !globalStats ? (
        <p className="text-center text-slate-400 py-8">Aucune échéance disponible</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
          <button
            onClick={() => onViewAll?.()}
            className="w-full px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="space-y-4">
              {/* En-tête avec alerte si retard */}
              {globalStats.enRetard > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {globalStats.enRetard} échéance{globalStats.enRetard > 1 ? 's' : ''} en retard
                  </span>
                </div>
              )}

              {/* Prochain coupon */}
              {globalStats.prochainCoupon && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Prochain versement</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatDate(globalStats.prochainCoupon.date)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {getRelativeDate(globalStats.prochainCoupon.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Montant total</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(globalStats.prochainCoupon.montant)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {globalStats.prochainCoupon.nb_investisseurs} investisseur{globalStats.prochainCoupon.nb_investisseurs > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Progression globale */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Progression</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {Math.round((globalStats.payes / globalStats.totalEcheances) * 100)}%
                    </span>
                    <span className="text-sm text-slate-500">
                      ({globalStats.payes}/{globalStats.totalEcheances} versements)
                    </span>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="flex-1 max-w-xs ml-6">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((globalStats.payes / globalStats.totalEcheances) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default EcheancierCard;