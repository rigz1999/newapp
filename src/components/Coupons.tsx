import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  X,
  User,
  Building2,
  RefreshCw,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Coupon {
  id: string;
  souscription_id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  date_paiement: string | null;
  montant_paye: number | null;
  
  investisseur_id: string;
  investisseur_nom: string;
  investisseur_id_display: string;
  investisseur_type: string;
  investisseur_email: string;
  investisseur_cgp: string | null;
  has_rib: boolean;
  
  projet_nom: string;
  tranche_nom: string;
  montant_net: number;
}

interface CouponsProps {
  organization: { id: string; name: string; role: string };
}

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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function Coupons({ organization }: CouponsProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [projetFilter, setProjetFilter] = useState('all');
  const [periodeFilter, setPeriodeFilter] = useState('all');
  
  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  
  // Payment form
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Lists for filters
  const [allProjets, setAllProjets] = useState<string[]>([]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statutFilter, projetFilter, periodeFilter, coupons]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons_echeances')
        .select(`
          *,
          souscription:souscriptions!inner(
            id,
            investisseur:investisseurs!inner(
              id,
              id_investisseur,
              nom_raison_sociale,
              type,
              email,
              cgp,
              rib_file_path
            ),
            tranche:tranches!inner(
              tranche_name,
              projet:projets!inner(
                projet
              )
            )
          )
        `)
        .order('date_echeance', { ascending: true });

      if (error) throw error;

      const processedCoupons: Coupon[] = (data || []).map((c: any) => {
        const investisseur = c.souscription.investisseur;
        const tranche = c.souscription.tranche;
        const projet = tranche.projet;
        
        const montant_net = investisseur.type === 'Physique' 
          ? c.montant_coupon * 0.70 
          : c.montant_coupon;

        return {
          id: c.id,
          souscription_id: c.souscription_id,
          date_echeance: c.date_echeance,
          montant_coupon: c.montant_coupon,
          statut: c.statut,
          date_paiement: c.date_paiement,
          montant_paye: c.montant_paye,
          
          investisseur_id: investisseur.id,
          investisseur_nom: investisseur.nom_raison_sociale,
          investisseur_id_display: investisseur.id_investisseur,
          investisseur_type: investisseur.type,
          investisseur_email: investisseur.email,
          investisseur_cgp: investisseur.cgp,
          has_rib: !!investisseur.rib_file_path,
          
          projet_nom: projet.projet,
          tranche_nom: tranche.tranche_name,
          montant_net,
        };
      });

      setCoupons(processedCoupons);
      
      const projets = Array.from(new Set(processedCoupons.map(c => c.projet_nom))).sort();
      setAllProjets(projets);
      
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...coupons];
    const now = new Date();

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.investisseur_nom.toLowerCase().includes(term) ||
        c.projet_nom.toLowerCase().includes(term) ||
        c.investisseur_id_display.toLowerCase().includes(term)
      );
    }

    // Status
    if (statutFilter !== 'all') {
      filtered = filtered.filter(c => {
        const isOverdue = new Date(c.date_echeance) < now && c.statut !== 'paye';
        const actualStatut = isOverdue ? 'en_retard' : c.statut;
        return actualStatut === statutFilter;
      });
    }

    // Project
    if (projetFilter !== 'all') {
      filtered = filtered.filter(c => c.projet_nom === projetFilter);
    }

    // Period
    if (periodeFilter !== 'all') {
      const days = parseInt(periodeFilter);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      
      filtered = filtered.filter(c => {
        const echeance = new Date(c.date_echeance);
        return echeance >= now && echeance <= endDate;
      });
    }

    setFilteredCoupons(filtered);
  };

  const calculateStats = () => {
    const now = new Date();
    
    const enAttente = coupons.filter(c => {
      const isOverdue = new Date(c.date_echeance) < now && c.statut !== 'paye';
      return c.statut === 'en_attente' && !isOverdue;
    });
    
    const payes = coupons.filter(c => c.statut === 'paye');
    
    const enRetard = coupons.filter(c => {
      return new Date(c.date_echeance) < now && c.statut !== 'paye';
    });

    return {
      enAttente: {
        count: enAttente.length,
        total: enAttente.reduce((sum, c) => sum + c.montant_net, 0),
      },
      payes: {
        count: payes.length,
        total: payes.reduce((sum, c) => sum + (c.montant_paye || c.montant_net), 0),
      },
      enRetard: {
        count: enRetard.length,
        total: enRetard.reduce((sum, c) => sum + c.montant_net, 0),
      },
    };
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (coupon: Coupon) => {
    const daysUntil = getDaysUntil(coupon.date_echeance);
    
    if (coupon.statut === 'paye') {
      return { text: '✅ Payé', className: 'bg-green-100 text-green-800' };
    }
    if (daysUntil < 0) {
      return { text: '🔴 En retard', className: 'bg-red-100 text-red-800' };
    }
    if (daysUntil <= 7) {
      return { text: '🟡 Urgent', className: 'bg-orange-100 text-orange-800' };
    }
    if (daysUntil <= 30) {
      return { text: '🟡 À venir', className: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: '🔵 Prévu', className: 'bg-blue-100 text-blue-800' };
  };

  const groupByDate = (coupons: Coupon[]) => {
    const grouped: { [key: string]: Coupon[] } = {};
    coupons.forEach((coupon) => {
      const date = coupon.date_echeance;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(coupon);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const handleMarkAsPaid = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentAmount(coupon.montant_net.toString());
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedCoupon || !paymentDate || !paymentAmount) return;

    setProcessingPayment(true);
    try {
      const { data: paiementData, error: paiementError } = await supabase
        .from('paiements')
        .insert({
          id_paiement: `PAY-${Date.now()}`,
          type: 'coupon',
          souscription_id: selectedCoupon.souscription_id,
          investisseur_id: selectedCoupon.investisseur_id,
          montant: parseFloat(paymentAmount),
          date_paiement: paymentDate,
          note: paymentNote || null,
          statut: 'payé',
        })
        .select()
        .single();

      if (paiementError) throw paiementError;

      const { error: updateError } = await supabase
        .from('coupons_echeances')
        .update({
          statut: 'paye',
          date_paiement: paymentDate,
          montant_paye: parseFloat(paymentAmount),
          paiement_id: paiementData.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCoupon.id);

      if (updateError) throw updateError;

      alert('✅ Paiement enregistré avec succès !');
      setShowPaymentModal(false);
      fetchCoupons();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('❌ Erreur lors de l\'enregistrement du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = filteredCoupons.map(c => ({
      'Date Échéance': formatDate(c.date_echeance),
      'Investisseur': c.investisseur_nom,
      'CGP': c.investisseur_cgp || '',
      'Projet': c.projet_nom,
      'Tranche': c.tranche_nom,
      'Montant Brut': c.montant_coupon,
      'Montant Net': c.montant_net,
      'Statut': c.statut,
      'Date Paiement': c.date_paiement ? formatDate(c.date_paiement) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coupons');
    XLSX.writeFile(wb, `coupons_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = calculateStats();
  const groupedCoupons = groupByDate(filteredCoupons);
  const totalAmount = filteredCoupons.reduce((sum, c) => sum + c.montant_net, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tous les Coupons</h2>
          <p className="text-slate-600 mt-1">
            {filteredCoupons.length} coupon{filteredCoupons.length > 1 ? 's' : ''} • Total: <span className="font-bold text-green-600">{formatCurrency(totalAmount)}</span>
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
              En Attente
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enAttente.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enAttente.count} coupons</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              Payés
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.payes.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.payes.count} coupons</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
              En Retard
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.enRetard.total)}</h3>
          <p className="text-sm text-slate-600 mt-1">{stats.enRetard.count} coupons</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">Filtres</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En Attente</option>
            <option value="paye">Payé</option>
            <option value="en_retard">En Retard</option>
          </select>

          <select
            value={projetFilter}
            onChange={(e) => setProjetFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les projets</option>
            {allProjets.map(projet => (
              <option key={projet} value={projet}>{projet}</option>
            ))}
          </select>

          <select
            value={periodeFilter}
            onChange={(e) => setPeriodeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les périodes</option>
            <option value="7">7 prochains jours</option>
            <option value="30">30 prochains jours</option>
            <option value="90">90 prochains jours</option>
          </select>
        </div>
      </div>

      {/* Coupons List Grouped by Date */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon</h3>
          <p className="text-slate-600">
            {coupons.length === 0
              ? 'Aucun coupon programmé'
              : 'Aucun coupon ne correspond aux filtres'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedCoupons.map(([date, dateCoupons]) => {
            const daysUntil = getDaysUntil(date);
            const dateTotal = dateCoupons.reduce((sum, c) => sum + c.montant_net, 0);

            return (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Date Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{formatDate(date)}</h3>
                      <p className="text-sm text-slate-600">
                        {daysUntil < 0 
                          ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}` 
                          : daysUntil === 0 
                            ? 'Aujourd\'hui' 
                            : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Total du jour</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(dateTotal)}</p>
                  </div>
                </div>

                {/* Coupons for this date */}
                <div className="divide-y divide-slate-100">
                  {dateCoupons.map((coupon) => {
                    const badge = getStatusBadge(coupon);
                    
                    return (
                      <div key={coupon.id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-lg ${
                                coupon.investisseur_type === 'Morale' 
                                  ? 'bg-purple-100' 
                                  : 'bg-blue-100'
                              }`}>
                                {coupon.investisseur_type === 'Morale' ? (
                                  <Building2 className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <User className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {coupon.investisseur_nom}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {coupon.investisseur_id_display}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-11 text-sm text-slate-600">
                              <span className="font-medium">{coupon.projet_nom}</span>
                              <span className="text-slate-400">•</span>
                              <span>{coupon.tranche_nom}</span>
                              {coupon.investisseur_cgp && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-amber-700">CGP: {coupon.investisseur_cgp}</span>
                                </>
                              )}
                            </div>

                            <div className="ml-11 mt-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                {badge.text}
                              </span>
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(coupon.montant_net)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Brut: {formatCurrency(coupon.montant_coupon)}
                            </p>
                            <div className="flex items-center gap-2 mt-3 justify-end">
                              <button
                                onClick={() => {
                                  setSelectedCoupon(coupon);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {coupon.statut !== 'paye' && (
                                <button
                                  onClick={() => handleMarkAsPaid(coupon)}
                                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Payer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Détail du Coupon</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Investisseur</h4>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">{selectedCoupon.investisseur_nom}</p>
                  <p className="text-xs text-slate-600">ID: {selectedCoupon.investisseur_id_display}</p>
                  <p className="text-xs text-slate-600">Email: {selectedCoupon.investisseur_email}</p>
                  {selectedCoupon.investisseur_cgp && (
                    <p className="text-xs text-slate-600">CGP: {selectedCoupon.investisseur_cgp}</p>
                  )}
                  <p className="text-xs text-slate-600">
                    RIB: {selectedCoupon.has_rib ? '✅ Disponible' : '❌ Manquant'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Détails</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Projet</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCoupon.projet_nom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Tranche</p>
                    <p className="text-sm font-medium text-slate-900">{selectedCoupon.tranche_nom}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Date Échéance</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_echeance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Montant Brut</p>
                    <p className="text-sm font-medium text-slate-900">{formatCurrency(selectedCoupon.montant_coupon)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Montant Net</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(selectedCoupon.montant_net)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Statut</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedCoupon).className}`}>
                      {getStatusBadge(selectedCoupon).text}
                    </span>
                  </div>
                  {selectedCoupon.date_paiement && (
                    <>
                      <div>
                        <p className="text-xs text-slate-600">Date de Paiement</p>
                        <p className="text-sm font-medium text-slate-900">{formatDate(selectedCoupon.date_paiement)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Montant Payé</p>
                        <p className="text-sm font-medium text-green-600">{formatCurrency(selectedCoupon.montant_paye || 0)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedCoupon.statut !== 'paye' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleMarkAsPaid(selectedCoupon);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme payé
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Marquer comme payé</h3>
              <p className="text-sm text-slate-600 mt-1">{selectedCoupon.investisseur_nom}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date de paiement *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Montant payé (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Montant net: {formatCurrency(selectedCoupon.montant_net)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Virement effectué"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                disabled={processingPayment}
              >
                Annuler
              </button>
              <button
                onClick={confirmPayment}
                disabled={processingPayment || !paymentDate || !paymentAmount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coupons;