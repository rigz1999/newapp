import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Download, Filter, CheckCircle } from 'lucide-react';

interface CouponData {
  id: string;
  id_souscription: string;
  prochaine_date_coupon: string;
  coupon_net: number;
  montant_investi: number;
  projet: {
    projet: string;
    emetteur: string;
  };
  tranche: {
    tranche_name: string;
  };
  investisseur: {
    nom_raison_sociale: string;
    email: string | null;
    type: string;
  };
}

interface CouponsProps {
  organization: { id: string; name: string; role: string };
}

export function Coupons({ organization }: CouponsProps) {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [projects, setProjects] = useState<Array<{ id: string; projet: string }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterCoupons();
  }, [coupons, selectedPeriod, selectedProject, selectedStatus]);

  const fetchData = async () => {
    setLoading(true);

    const { data: projectsData } = await supabase
      .from('projets')
      .select('id, projet')
      .order('projet');

    setProjects(projectsData || []);

    const today = new Date().toISOString().split('T')[0];

    const { data: souscriptionsData } = await supabase
      .from('souscriptions')
      .select(`
        id,
        id_souscription,
        prochaine_date_coupon,
        coupon_net,
        montant_investi,
        projet:projets(projet, emetteur),
        tranche:tranches(tranche_name),
        investisseur:investisseurs(nom_raison_sociale, email, type)
      `)
      .not('prochaine_date_coupon', 'is', null)
      .order('prochaine_date_coupon', { ascending: true });

    if (souscriptionsData) {
      const validCoupons = souscriptionsData.filter(
        (s: any) => s.prochaine_date_coupon && s.projet && s.tranche && s.investisseur
      ) as any;

      setCoupons(validCoupons);
      setFilteredCoupons(validCoupons);
    }

    setLoading(false);
  };

  const filterCoupons = () => {
    let filtered = [...coupons];

    if (selectedPeriod !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let endDate = new Date(today);

      switch (selectedPeriod) {
        case '7':
          endDate.setDate(today.getDate() + 7);
          break;
        case '30':
          endDate.setDate(today.getDate() + 30);
          break;
        case '90':
          endDate.setDate(today.getDate() + 90);
          break;
      }

      filtered = filtered.filter((coupon) => {
        const couponDate = new Date(coupon.prochaine_date_coupon);
        return couponDate >= today && couponDate <= endDate;
      });
    }

    if (selectedProject !== 'all') {
      filtered = filtered.filter((coupon) => {
        const projectName = coupon.projet?.projet;
        return projectName === selectedProject;
      });
    }

    if (selectedStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((coupon) => {
        const couponDate = new Date(coupon.prochaine_date_coupon);
        couponDate.setHours(0, 0, 0, 0);
        const diffTime = couponDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (selectedStatus) {
          case 'late':
            return daysUntil < 0;
          case 'urgent':
            return daysUntil >= 0 && daysUntil <= 7;
          case 'upcoming':
            return daysUntil > 7 && daysUntil <= 30;
          case 'future':
            return daysUntil > 30;
          default:
            return true;
        }
      });
    }

    setFilteredCoupons(filtered);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return {
        text: 'En retard',
        className: 'bg-red-100 text-red-700',
      };
    } else if (daysUntil <= 7) {
      return {
        text: 'Urgent',
        className: 'bg-orange-100 text-orange-700',
      };
    } else if (daysUntil <= 30) {
      return {
        text: 'À venir',
        className: 'bg-yellow-100 text-yellow-700',
      };
    } else {
      return {
        text: 'Futur',
        className: 'bg-blue-100 text-blue-700',
      };
    }
  };

  const groupByDate = (coupons: CouponData[]) => {
    const grouped: { [key: string]: CouponData[] } = {};

    coupons.forEach((coupon) => {
      const date = coupon.prochaine_date_coupon;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(coupon);
    });

    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const totalCoupons = filteredCoupons.reduce((sum, coupon) => sum + (coupon.coupon_net || 0), 0);
  const groupedCoupons = groupByDate(filteredCoupons);

  return (
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tous les Coupons</h2>
              <p className="text-slate-600 mt-1">
                {filteredCoupons.length} coupon{filteredCoupons.length > 1 ? 's' : ''} • Total: <span className="font-bold text-green-600">{formatCurrency(totalCoupons)}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">Filtres</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Période
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tous les coupons</option>
                  <option value="7">7 prochains jours</option>
                  <option value="30">30 prochains jours</option>
                  <option value="90">90 prochains jours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Projet
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tous les projets</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.projet}>
                      {project.projet}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Statut
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="late">En retard</option>
                  <option value="urgent">Urgent (7 jours)</option>
                  <option value="upcoming">À venir (30 jours)</option>
                  <option value="future">Futur (&gt;30 jours)</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun coupon</h3>
              <p className="text-slate-600">
                {coupons.length === 0
                  ? 'Aucun coupon programmé'
                  : 'Aucun coupon ne correspond aux filtres sélectionnés'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedCoupons.map(([date, dateCoupons]) => {
                const daysUntil = getDaysUntil(date);
                const dateTotal = dateCoupons.reduce((sum, c) => sum + (c.coupon_net || 0), 0);

                return (
                  <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{formatDate(date)}</h3>
                          <p className="text-sm text-slate-600">
                            {daysUntil < 0 ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''}` :
                             daysUntil === 0 ? 'Aujourd\'hui' :
                             `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(daysUntil).className}`}>
                          {getStatusBadge(daysUntil).text}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total du jour</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(dateTotal)}</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {dateCoupons.map((coupon) => (
                        <div key={coupon.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-bold text-slate-900">
                                      {coupon.projet?.projet || 'N/A'}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-sm text-slate-600">
                                      {coupon.tranche?.tranche_name || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <span className="font-medium text-slate-900">
                                      {coupon.investisseur?.nom_raison_sociale || 'N/A'}
                                    </span>
                                    {coupon.investisseur?.email && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span>{coupon.investisseur.email}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(coupon.coupon_net || 0)}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Investi: {formatCurrency(coupon.montant_investi || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}
