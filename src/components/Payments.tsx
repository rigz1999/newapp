import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, DollarSign, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { ViewProofsModal } from './ViewProofsModal';
import { TableSkeleton } from './Skeleton';
import { Pagination, paginate } from './Pagination';

interface PaymentsProps {
  organization: { id: string; name: string; role: string };
}

interface Payment {
  id: string;
  id_paiement: string;
  type: string;
  montant: number;
  date_paiement: string;
  tranche: {
    tranche_name: string;
    projet: {
      projet: string;
      emetteur: string;
    };
  };
  investisseur: {
    nom_raison_sociale: string;
  } | null;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'late';
type SortOrder = 'desc' | 'asc';

export function Payments({ organization }: PaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewingProofs, setViewingProofs] = useState<Payment | null>(null);
  const [proofs, setProofs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalLate: 0,
    paymentsCount: 0,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    fetchPayments();
  }, [organization.id]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    filterPayments();
  }, [payments, searchTerm, sortOrder]);

  const fetchPayments = async () => {
    setLoading(true);

    try {
      console.log('Payments: Fetching data...');

      const { data, error } = await supabase
        .from('paiements')
        .select(`
          id,
          id_paiement,
          type,
          montant,
          date_paiement,
          tranche:tranches(
            tranche_name,
            projet:projets(
              projet,
              emetteur
            )
          ),
          investisseur:investisseurs(
            nom_raison_sociale
          )
        `)
        .order('date_paiement', { ascending: false });

      if (error) throw error;

      console.log('Payments: Data fetched', { count: data?.length });

      const paymentsData = (data || []) as Payment[];
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);

      const totalPaid = paymentsData.reduce((sum, p) => sum + Number(p.montant), 0);

      setStats({
        totalPaid,
        totalPending: 0,
        totalLate: 0,
        paymentsCount: paymentsData.length,
      });

      console.log('Payments: Complete');
    } catch (error) {
      console.error('Payments: Error', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProofs = async (paymentId: string) => {
    const { data } = await supabase
      .from('payment_proofs')
      .select('*')
      .eq('paiement_id', paymentId);
    return data || [];
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.tranche?.projet?.projet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tranche?.tranche_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.investisseur?.nom_raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id_paiement?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date_paiement).getTime();
      const dateB = new Date(b.date_paiement).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredPayments(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'paid' || s === 'payé') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (s === 'pending' || s === 'en attente') return <Clock className="w-4 h-4 text-yellow-600" />;
    if (s === 'late' || s === 'en retard') return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-slate-600" />;
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'paid' || s === 'payé') return 'bg-green-100 text-green-700';
    if (s === 'pending' || s === 'en attente') return 'bg-yellow-100 text-yellow-700';
    if (s === 'late' || s === 'en retard') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const exportToCSV = () => {
    const headers = ['ID Paiement', 'Projet', 'Émetteur', 'Tranche', 'Investisseur', 'Type', 'Montant', 'Date'];
    const rows = filteredPayments.map((payment) => [
      payment.id_paiement,
      payment.tranche?.projet?.projet || '',
      payment.tranche?.projet?.emetteur || '',
      payment.tranche?.tranche_name || '',
      payment.investisseur?.nom_raison_sociale || '',
      payment.type || 'Coupon',
      payment.montant,
      formatDate(payment.date_paiement),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Historique des Paiements</h2>
          <p className="text-slate-600 mt-1">{filteredPayments.length} paiement{filteredPayments.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Exporter CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Montant Total Payé</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalPaid)}</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Nombre de Paiements</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.paymentsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par projet, tranche, investisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="desc">Plus récents</option>
            <option value="asc">Plus anciens</option>
          </select>
        </div>

        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} columns={8} />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun paiement</h3>
            <p className="text-slate-600">
              {searchTerm
                ? "Aucun paiement ne correspond à vos critères"
                : "Aucun paiement enregistré"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Projet</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Tranche</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Montant</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredPayments, currentPage, itemsPerPage).map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{payment.id_paiement}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-900">{payment.tranche?.projet?.projet || '-'}</p>
                        <p className="text-xs text-slate-500">{payment.tranche?.projet?.emetteur || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{payment.tranche?.tranche_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{payment.type || 'Coupon'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(payment.montant)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(payment.date_paiement)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const proofsData = await loadProofs(payment.id);
                            setProofs(proofsData);
                            setViewingProofs(payment);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-xs font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Voir Justificatifs
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredPayments.length / itemsPerPage)}
              totalItems={filteredPayments.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              itemName="paiements"
            />
          </div>
        )}
      </div>

      {viewingProofs && (
        <ViewProofsModal
          payment={viewingProofs}
          proofs={proofs}
          onClose={() => setViewingProofs(null)}
          onProofDeleted={() => {
            fetchPayments();
            handleViewProofs(viewingProofs);
          }}
        />
      )}
    </div>
  );
}

export default Payments;