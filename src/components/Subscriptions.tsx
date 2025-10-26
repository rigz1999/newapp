import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Download, Search, Edit2, X, AlertTriangle, Eye, Trash2 } from 'lucide-react';

interface Subscription {
  id: string;
  date_souscription: string;
  nombre_obligations: number;
  montant_investi: number;
  coupon_brut: number;
  coupon_net: number;
  prochaine_date_coupon: string | null;
  tranches: {
    tranche_name: string;
    projets: {
      projet: string;
      emetteur: string;
    };
  };
  investisseurs: {
    type: string;
    nom_raison_sociale: string | null;
    representant_legal: string | null;
    email: string | null;
  };
}

interface SubscriptionsProps {
  organization: { id: string; name: string; role: string };
}

export function Subscriptions({ organization }: SubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [trancheFilter, setTrancheFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [viewingSubscription, setViewingSubscription] = useState<Subscription | null>(null);
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null);
  const [editFormData, setEditFormData] = useState({
    date_souscription: '',
    nombre_obligations: 0,
    montant_investi: 0,
    coupon_brut: 0,
    coupon_net: 0,
    prochaine_date_coupon: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchSubscriptions();
      }
    };

    loadData();

    return () => {
      isMounted = false;
      setSubscriptions([]);
    };
  }, [organization.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('souscriptions')
      .select(
        `
        *,
        tranches (
          tranche_name,
          projets (
            projet,
            emetteur
          )
        ),
        investisseurs (
          type,
          nom_raison_sociale,
          representant_legal,
          email
        )
      `
      )
      .order('date_souscription', { ascending: false });

    setSubscriptions((data as any) || []);
    setLoading(false);
  };

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditFormData({
      date_souscription: subscription.date_souscription,
      nombre_obligations: subscription.nombre_obligations,
      montant_investi: subscription.montant_investi,
      coupon_brut: subscription.coupon_brut,
      coupon_net: subscription.coupon_net,
      prochaine_date_coupon: subscription.prochaine_date_coupon || '',
    });
    setShowEditModal(true);
  };

  const handleSaveClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!editingSubscription) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          date_souscription: editFormData.date_souscription,
          nombre_obligations: editFormData.nombre_obligations,
          montant_investi: editFormData.montant_investi,
          coupon_brut: editFormData.coupon_brut,
          coupon_net: editFormData.coupon_net,
          prochaine_date_coupon: editFormData.prochaine_date_coupon || null,
        })
        .eq('id', editingSubscription.id);

      if (error) throw error;

      // Refresh data
      await fetchSubscriptions();
      
      // Close modals
      setShowConfirmModal(false);
      setShowEditModal(false);
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingSubscription(null);
  };

  const handleViewClick = (subscription: Subscription) => {
    setViewingSubscription(subscription);
    setShowViewModal(true);
  };

  const handleDeleteClick = (subscription: Subscription) => {
    setDeletingSubscription(subscription);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubscription) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('souscriptions')
        .delete()
        .eq('id', deletingSubscription.id);

      if (error) throw error;

      // Refresh data
      await fetchSubscriptions();
      
      // Close modal
      setShowDeleteModal(false);
      setDeletingSubscription(null);
    } catch (error) {
      console.error('Error deleting subscription:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      'Projet',
      'Émetteur',
      'Tranche',
      'Investisseur',
      'Type',
      'Email',
      'Date souscription',
      'Quantité',
      'Montant investi',
      'Coupon brut',
      'Coupon net',
      'Prochaine date coupon',
    ];

    const rows = filteredSubscriptions.map((sub) => [
      sub.tranches.projets.projet,
      sub.tranches.projets.emetteur,
      sub.tranches.tranche_name,
      sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '',
      sub.investisseurs.type,
      sub.investisseurs.email || '',
      formatDate(sub.date_souscription),
      sub.nombre_obligations,
      sub.montant_investi,
      sub.coupon_brut,
      sub.coupon_net,
      formatDate(sub.prochaine_date_coupon),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueProjects = Array.from(new Set(subscriptions.map(s => s.tranches.projets.projet)));

  const availableTranches = projectFilter === 'all'
    ? []
    : Array.from(new Set(
        subscriptions
          .filter(s => s.tranches.projets.projet === projectFilter)
          .map(s => s.tranches.tranche_name)
      ));

  const uniqueYears = Array.from(new Set(
    subscriptions.map(s => new Date(s.date_souscription).getFullYear())
  )).sort((a, b) => b - a);

  const availableMonths = yearFilter === 'all' ? [] : Array.from(new Set(
    subscriptions
      .filter(s => new Date(s.date_souscription).getFullYear().toString() === yearFilter)
      .map(s => new Date(s.date_souscription).getMonth() + 1)
  )).sort((a, b) => a - b);

  const availableDays = (yearFilter === 'all' || monthFilter === 'all') ? [] : Array.from(new Set(
    subscriptions
      .filter(s => {
        const date = new Date(s.date_souscription);
        return date.getFullYear().toString() === yearFilter &&
               (date.getMonth() + 1).toString() === monthFilter;
      })
      .map(s => new Date(s.date_souscription).getDate())
  )).sort((a, b) => a - b);

  const handleProjectChange = (project: string) => {
    setProjectFilter(project);
    setTrancheFilter('all');
  };

  const handleYearChange = (year: string) => {
    setYearFilter(year);
    setMonthFilter('all');
    setDayFilter('all');
  };

  const handleMonthChange = (month: string) => {
    setMonthFilter(month);
    setDayFilter('all');
  };

  const matchesDateFilter = (dateStr: string) => {
    const date = new Date(dateStr);

    if (yearFilter !== 'all' && date.getFullYear().toString() !== yearFilter) {
      return false;
    }

    if (monthFilter !== 'all' && (date.getMonth() + 1).toString() !== monthFilter) {
      return false;
    }

    if (dayFilter !== 'all' && date.getDate().toString() !== dayFilter) {
      return false;
    }

    return true;
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        sub.tranches.projets.projet.toLowerCase().includes(term) ||
        sub.tranches.projets.emetteur.toLowerCase().includes(term) ||
        sub.tranches.tranche_name.toLowerCase().includes(term) ||
        sub.investisseurs.nom_raison_sociale?.toLowerCase().includes(term) ||
        sub.investisseurs.representant_legal?.toLowerCase().includes(term) ||
        sub.investisseurs.email?.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    if (projectFilter !== 'all' && sub.tranches.projets.projet !== projectFilter) {
      return false;
    }

    if (trancheFilter !== 'all' && sub.tranches.tranche_name !== trancheFilter) {
      return false;
    }

    if (!matchesDateFilter(sub.date_souscription)) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Toutes les souscriptions ({filteredSubscriptions.length})
          </h2>
          <button
            onClick={exportToCSV}
            disabled={filteredSubscriptions.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            <span>Exporter CSV</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">Tous les projets</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>

            <select
              value={trancheFilter}
              onChange={(e) => setTrancheFilter(e.target.value)}
              disabled={projectFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Toutes les tranches</option>
              {availableTranches.map((tranche) => (
                <option key={tranche} value={tranche}>
                  {tranche}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={yearFilter}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">Toutes les années</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={yearFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Tous les mois</option>
              {availableMonths.map((month) => (
                <option key={month} value={month.toString()}>
                  {new Date(2000, month - 1).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              disabled={yearFilter === 'all' || monthFilter === 'all'}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">Tous les jours</option>
              {availableDays.map((day) => (
                <option key={day} value={day.toString()}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune souscription</h3>
            <p className="text-slate-600">
              {searchTerm ? 'Aucun résultat pour cette recherche' : 'Importez des tranches pour voir les souscriptions'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Projet / Tranche
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Investisseur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Coupon Net
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Prochain Coupon
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.tranches.projets.projet}
                        </div>
                        <div className="text-sm text-slate-600">{sub.tranches.tranche_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {sub.investisseurs.nom_raison_sociale || sub.investisseurs.representant_legal || '-'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {sub.investisseurs.type.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.date_souscription)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                        {sub.nombre_obligations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                        {formatCurrency(sub.montant_investi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                        {formatCurrency(sub.coupon_net)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(sub.prochaine_date_coupon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-700 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sub)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                            title="Supprimer"
                          >
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

        {/* Edit Modal */}
        {showEditModal && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Modifier la souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {editingSubscription.tranches.projets.projet} - {editingSubscription.tranches.tranche_name}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Date de souscription
                    </label>
                    <input
                      type="date"
                      value={editFormData.date_souscription}
                      onChange={(e) => setEditFormData({ ...editFormData, date_souscription: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Nombre d'obligations
                    </label>
                    <input
                      type="number"
                      value={editFormData.nombre_obligations}
                      onChange={(e) => setEditFormData({ ...editFormData, nombre_obligations: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Montant investi (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.montant_investi}
                      onChange={(e) => setEditFormData({ ...editFormData, montant_investi: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Prochaine date de coupon
                    </label>
                    <input
                      type="date"
                      value={editFormData.prochaine_date_coupon}
                      onChange={(e) => setEditFormData({ ...editFormData, prochaine_date_coupon: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Coupon brut (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.coupon_brut}
                      onChange={(e) => setEditFormData({ ...editFormData, coupon_brut: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      Coupon net (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.coupon_net}
                      onChange={(e) => setEditFormData({ ...editFormData, coupon_net: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>Investisseur:</strong> {editingSubscription.investisseurs.nom_raison_sociale || editingSubscription.investisseurs.representant_legal}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Les informations de l'investisseur ne peuvent pas être modifiées ici
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveClick}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Confirmer la modification
                    </h3>
                    <p className="text-sm text-slate-600">
                      Êtes-vous sûr de vouloir modifier cette souscription ? Cette action ne peut pas être annulée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Confirmer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && viewingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Détails de la souscription</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {viewingSubscription.tranches.projets.projet} - {viewingSubscription.tranches.tranche_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Project Info */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Projet</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nom du projet:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.projets.projet}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Émetteur:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.projets.emetteur}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Tranche:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.tranches.tranche_name}</span>
                    </div>
                  </div>
                </div>

                {/* Investor Info */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Investisseur</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nom:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {viewingSubscription.investisseurs.nom_raison_sociale || viewingSubscription.investisseurs.representant_legal || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Type:</span>
                      <span className="text-sm font-medium text-slate-900">
                        {viewingSubscription.investisseurs.type.toLowerCase() === 'physique' ? 'Personne physique' : 'Personne morale'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Email:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.investisseurs.email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Details */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Détails de la souscription</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Date de souscription:</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(viewingSubscription.date_souscription)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nombre d'obligations:</span>
                      <span className="text-sm font-medium text-slate-900">{viewingSubscription.nombre_obligations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Montant investi:</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(viewingSubscription.montant_investi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Coupon brut:</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(viewingSubscription.coupon_brut)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Coupon net:</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(viewingSubscription.coupon_net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Prochaine date de coupon:</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(viewingSubscription.prochaine_date_coupon)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Confirmer la suppression
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Êtes-vous sûr de vouloir supprimer cette souscription ?
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-slate-600">
                        <strong>Projet:</strong> {deletingSubscription.tranches.projets.projet}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Investisseur:</strong> {deletingSubscription.investisseurs.nom_raison_sociale || deletingSubscription.investisseurs.representant_legal}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Montant:</strong> {formatCurrency(deletingSubscription.montant_investi)}
                      </p>
                    </div>
                    <p className="text-sm text-red-600 mt-3 font-medium">
                      ⚠️ Cette action est irréversible
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Subscriptions;