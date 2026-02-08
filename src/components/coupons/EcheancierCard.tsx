import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, AlertCircle, Download } from 'lucide-react';

interface Echeance {
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  souscription_id: string;
}

interface GlobalStats {
  payes: number;
  enRetard: number;
  prochainCoupon: {
    date: string;
    montant: number;
    nb_investisseurs: number;
  } | null;
  totalEcheances: number;
}

interface EnrichedEcheance extends Record<string, unknown> {
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  souscription_id: string;
  tranche_name: string;
  investisseur: { nom_raison_sociale: string };
}

interface EcheancierCardProps {
  projectId: string;
  tranches: { id: string; tranche_name: string }[];
  onPaymentClick: (trancheId: string) => void;
  onViewAll?: () => void;
}

export function EcheancierCard({
  projectId,
  tranches,
  onPaymentClick: _onPaymentClick,
  onViewAll: _onViewAll,
}: EcheancierCardProps) {
  const navigate = useNavigate();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || tranches.length === 0) {
      setLoading(false);
      return;
    }

    const fetchGlobalEcheancier = async () => {
      setLoading(true);

      const allEcheances: Echeance[] = [];

      // Charger toutes les échéances de toutes les tranches
      for (const tranche of tranches) {
        try {
          const { data: souscriptions } = await supabase
            .from('souscriptions')
            .select('id')
            .eq('tranche_id', tranche.id);

          if (!souscriptions || souscriptions.length === 0) {
            continue;
          }

          const subscriptionIds = souscriptions.map((s: { id: string }) => s.id);

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
        const enRetard = allEcheances.filter(
          (e: Echeance) => e.statut === 'en_attente' && new Date(e.date_echeance) < now
        ).length;
        const prochains = allEcheances.filter(
          (e: Echeance) => e.statut === 'en_attente' && new Date(e.date_echeance) >= now
        );

        // Trouver le prochain coupon (la plus proche échéance à venir)
        const prochainCoupon = prochains[0];

        // Calculer le total et le nombre d'investisseurs pour toutes les échéances du même jour
        const totalProchainCoupon = prochainCoupon
          ? prochains
              .filter((e: Echeance) => e.date_echeance === prochainCoupon.date_echeance)
              .reduce((sum: number, e: Echeance) => sum + Number(e.montant_coupon), 0)
          : 0;

        const nbInvestisseursProchain = prochainCoupon
          ? new Set(
              prochains
                .filter((e: Echeance) => e.date_echeance === prochainCoupon.date_echeance)
                .map((e: Echeance) => e.souscription_id)
            ).size
          : 0;

        setGlobalStats({
          payes,
          enRetard,
          prochainCoupon: prochainCoupon
            ? {
                date: prochainCoupon.date_echeance,
                montant: totalProchainCoupon,
                nb_investisseurs: nbInvestisseursProchain,
              }
            : null,
          totalEcheances: allEcheances.length,
        });
      }

      setLoading(false);
    };

    fetchGlobalEcheancier();
  }, [projectId, tranches.length]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    }
    if (diffDays === 1) {
      return 'Demain';
    }
    if (diffDays < 0) {
      return `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
    }
    if (diffDays <= 7) {
      return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
    if (diffDays <= 30) {
      return `Dans ${Math.ceil(diffDays / 7)} semaine${Math.ceil(diffDays / 7) > 1 ? 's' : ''}`;
    }
    return `Dans ${Math.ceil(diffDays / 30)} mois`;
  };

  const handleDownloadSynthese = async () => {
    // Lazy load ExcelJS for better performance
    const ExcelJS = await import('exceljs');

    const allEcheances: EnrichedEcheance[] = [];

    for (const tranche of tranches) {
      try {
        const { data: souscriptions } = await supabase
          .from('souscriptions')
          .select('id, investisseur_id')
          .eq('tranche_id', tranche.id);

        if (!souscriptions || souscriptions.length === 0) {
          continue;
        }

        const subscriptionIds = souscriptions.map((s: { id: string }) => s.id);
        const investisseurIds = [
          ...new Set(souscriptions.map((s: { investisseur_id: string }) => s.investisseur_id)),
        ];

        const { data: investisseurs } = await supabase
          .from('investisseurs')
          .select('id, nom_raison_sociale')
          .in('id', investisseurIds);

        const investisseursMap = new Map<string, { id: string; nom_raison_sociale: string }>();
        investisseurs?.forEach((inv: { id: string; nom_raison_sociale: string }) => {
          investisseursMap.set(inv.id, inv);
        });

        const { data: echeances } = await supabase
          .from('coupons_echeances')
          .select('*')
          .in('souscription_id', subscriptionIds)
          .order('date_echeance', { ascending: true });

        if (echeances) {
          allEcheances.push(
            ...echeances.map((e: Record<string, unknown>) => {
              const sub = souscriptions.find(
                (s: { id: string }) => s.id === (e as { souscription_id: string }).souscription_id
              );
              const investisseur = sub ? investisseursMap.get(sub.investisseur_id) : null;

              return {
                ...e,
                tranche_name: tranche.tranche_name,
                investisseur: investisseur || { nom_raison_sociale: 'Inconnu' },
              } as EnrichedEcheance;
            })
          );
        }
      } catch (error) {
        console.error(`Error fetching data for tranche ${tranche.id}:`, error);
      }
    }

    const totalEcheances = allEcheances.length;
    const totalPayes = allEcheances.filter(e => e.statut === 'paye').length;
    const totalEnRetard = allEcheances.filter(
      e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()
    ).length;
    const totalAVenir = allEcheances.filter(
      e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()
    ).length;

    const montantTotal = allEcheances.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantPaye = allEcheances
      .filter(e => e.statut === 'paye')
      .reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantEnRetard = allEcheances
      .filter(e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date())
      .reduce((sum, e) => sum + Number(e.montant_coupon), 0);
    const montantAVenir = allEcheances
      .filter(e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date())
      .reduce((sum, e) => sum + Number(e.montant_coupon), 0);

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Synthèse
    const wsSynthese = workbook.addWorksheet('Synthèse');
    wsSynthese.columns = [
      { key: 'label', width: 25 },
      { key: 'value', width: 15 },
    ];

    const synthese = [
      ["SYNTHÈSE DE L'ÉCHÉANCIER", ''],
      ['', ''],
      ["Date d'export", new Date().toLocaleDateString('fr-FR')],
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
      ['Tranche', 'Investisseur', 'Date échéance', 'Montant (€)', 'Statut', 'Date paiement'],
    ];

    allEcheances.forEach(e => {
      const statut =
        e.statut === 'paye'
          ? 'Payé'
          : new Date(e.date_echeance) < new Date()
            ? 'En retard'
            : 'À venir';
      detailData.push([
        e.tranche_name,
        e.investisseur?.nom_raison_sociale || 'Inconnu',
        new Date(e.date_echeance).toLocaleDateString('fr-FR'),
        String(Number(e.montant_coupon)),
        statut,
        e.date_paiement ? new Date(e.date_paiement).toLocaleDateString('fr-FR') : '-',
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
      { key: 'datePaiement', header: 'Date paiement', width: 15 },
    ];
    detailData.slice(1).forEach(row => {
      wsDetail.addRow({
        tranche: row[0],
        investisseur: row[1],
        date: row[2],
        montant: row[3],
        statut: row[4],
        datePaiement: row[5],
      });
    });

    const parTrancheData: (string | number)[][] = [
      [
        'Tranche',
        'Total coupons',
        'Payés',
        'En retard',
        'À venir',
        'Montant total (€)',
        'Montant payé (€)',
      ],
    ];

    tranches.forEach(tranche => {
      const trancheEcheances = allEcheances.filter(e => e.tranche_name === tranche.tranche_name);
      const payes = trancheEcheances.filter(e => e.statut === 'paye').length;
      const enRetard = trancheEcheances.filter(
        e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()
      ).length;
      const aVenir = trancheEcheances.filter(
        e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()
      ).length;
      const montantTotal = trancheEcheances.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
      const montantPaye = trancheEcheances
        .filter(e => e.statut === 'paye')
        .reduce((sum, e) => sum + Number(e.montant_coupon), 0);

      parTrancheData.push([
        tranche.tranche_name,
        trancheEcheances.length,
        payes,
        enRetard,
        aVenir,
        montantTotal,
        montantPaye,
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
      { key: 'montantPaye', header: 'Montant payé (€)', width: 18 },
    ];
    parTrancheData.slice(1).forEach(row => {
      wsParTranche.addRow({
        tranche: row[0],
        total: row[1],
        payes: row[2],
        enRetard: row[3],
        aVenir: row[4],
        montantTotal: row[5],
        montantPaye: row[6],
      });
    });

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-900">Échéancier des Coupons</h2>
          </div>
          <button
            onClick={() => navigate(`/projets/${projectId}/echeancier`)}
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
            onClick={() => navigate(`/projets/${projectId}/echeancier`)}
            className="w-full px-6 py-5 hover:bg-slate-50 transition-colors text-left"
          >
            {/* Zone haute : Prochain versement */}
            {globalStats.prochainCoupon && (
              <div className="mb-5">
                <p className="text-sm text-slate-600 mb-3">Prochain versement</p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900 mb-1">
                      {formatCurrency(globalStats.prochainCoupon.montant)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {globalStats.prochainCoupon.nb_investisseurs} investisseur
                      {globalStats.prochainCoupon.nb_investisseurs > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">
                      {formatDate(globalStats.prochainCoupon.date)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {getRelativeDate(globalStats.prochainCoupon.date)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-200 my-4"></div>

            {/* Zone basse : Progression + Alertes */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  {globalStats.payes} sur {globalStats.totalEcheances} versements effectués (
                  {Math.round((globalStats.payes / globalStats.totalEcheances) * 100)}%)
                </p>
              </div>

              {globalStats.enRetard > 0 && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{globalStats.enRetard} en retard</span>
                </div>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default EcheancierCard;
