import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

interface Echeance {
  id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  souscription: {
    investisseur: {
      nom_raison_sociale: string;
    };
  };
}

interface EcheancierModalProps {
  tranche: any;
  onClose: () => void;
  onPaymentClick: () => void;
}

export function EcheancierModal({ tranche, onClose, onPaymentClick }: EcheancierModalProps) {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedEcheances, setGroupedEcheances] = useState<Map<string, Echeance[]>>(new Map());

  useEffect(() => {
    fetchEcheances();
  }, [tranche.id]);

  const fetchEcheances = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('coupons_echeances')
      .select(`
        id,
        date_echeance,
        montant_coupon,
        statut,
        date_paiement,
        souscription:souscriptions!inner(
          tranche_id,
          investisseur:investisseurs(nom_raison_sociale)
        )
      `)
      .eq('souscription.tranche_id', tranche.id)
      .order('date_echeance', { ascending: true });

    if (data) {
      setEcheances(data as any);
      
      // Grouper par date
      const grouped = new Map<string, Echeance[]>();
      data.forEach((ech: any) => {
        const date = ech.date_echeance;
        if (!grouped.has(date)) {
          grouped.set(date, []);
        }
        grouped.get(date)!.push(ech);
      });
      setGroupedEcheances(grouped);
    }

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
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatutBadge = (statut: string, dateEcheance: string) => {
    const isPast = new Date(dateEcheance) < new Date();
    
    if (statut === 'paye') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle className="w-3.5 h-3.5" />
          Payé
        </span>
      );
    }
    
    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          <AlertCircle className="w-3.5 h-3.5" />
          En retard
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
        <Clock className="w-3.5 h-3.5" />
        À venir
      </span>
    );
  };

  const stats = {
    total: echeances.length,
    payes: echeances.filter(e => e.statut === 'paye').length,
    enRetard: echeances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) < new Date()).length,
    aVenir: echeances.filter(e => e.statut !== 'paye' && new Date(e.date_echeance) >= new Date()).length,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{tranche.tranche_name}</h2>
              <p className="text-sm text-slate-600 mt-1">Échéancier complet des coupons</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-600 mt-1">Total coupons</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.payes}</p>
              <p className="text-xs text-green-600 mt-1">Payés</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.enRetard}</p>
              <p className="text-xs text-red-600 mt-1">En retard</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.aVenir}</p>
              <p className="text-xs text-blue-600 mt-1">À venir</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedEcheances.entries()).map(([date, echeancesGroupe]) => {
                const totalMontant = echeancesGroupe.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
                const statut = echeancesGroupe[0].statut;
                const datePaiement = echeancesGroupe[0].date_paiement;

                return (
                  <div key={date} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Date header */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{formatDate(date)}</p>
                          {datePaiement && (
                            <p className="text-xs text-slate-600">
                              Payé le {formatDate(datePaiement)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(totalMontant)}
                        </span>
                        {getStatutBadge(statut, date)}
                      </div>
                    </div>

                    {/* Investisseurs */}
                    <div className="divide-y divide-slate-100">
                      {echeancesGroupe.map((ech) => (
                        <div key={ech.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <p className="text-sm text-slate-700">
                            {ech.souscription.investisseur.nom_raison_sociale}
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            {formatCurrency(ech.montant_coupon)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                onClose();
                onPaymentClick();
              }}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Enregistrer un paiement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EcheancierModal;