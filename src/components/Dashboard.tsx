import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, FolderOpen, Layers, Users, TrendingUp } from 'lucide-react';

interface DashboardProps {
  organization: { id: string; name: string; role: string };
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface Stats {
  projects: number;
  tranches: number;
  subscriptions: number;
  upcomingCoupons: number;
}

export function Dashboard({ organization, onLogout, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    tranches: 0,
    subscriptions: 0,
    upcomingCoupons: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', organization.id);

      const { count: projectCount } = projects || { count: 0 };

      const { data: projectIds } = await supabase
        .from('projects')
        .select('id')
        .eq('org_id', organization.id);

      const pIds = projectIds?.map((p) => p.id) || [];

      let trancheCount = 0;
      let subscriptionCount = 0;
      let upcomingCount = 0;

      if (pIds.length > 0) {
        const { data: tranches } = await supabase
          .from('tranches')
          .select('id', { count: 'exact', head: true })
          .in('project_id', pIds);

        trancheCount = tranches?.count || 0;

        const { data: trancheIds } = await supabase
          .from('tranches')
          .select('id')
          .in('project_id', pIds);

        const tIds = trancheIds?.map((t) => t.id) || [];

        if (tIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .in('tranche_id', tIds);

          subscriptionCount = subscriptions?.count || 0;

          const today = new Date();
          const in90Days = new Date();
          in90Days.setDate(today.getDate() + 90);

          const { data: upcoming } = await supabase
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .in('tranche_id', tIds)
            .gte('prochaine_date_coupon', today.toISOString().split('T')[0])
            .lte('prochaine_date_coupon', in90Days.toISOString().split('T')[0]);

          upcomingCount = upcoming?.count || 0;
        }
      }

      setStats({
        projects: projectCount || 0,
        tranches: trancheCount,
        subscriptions: subscriptionCount,
        upcomingCoupons: upcomingCount,
      });
      setLoading(false);
    };

    fetchStats();
  }, [organization.id]);

  const statCards = [
    {
      title: 'Projets',
      value: stats.projects,
      icon: FolderOpen,
      color: 'bg-blue-500',
      action: () => onNavigate('projects'),
    },
    {
      title: 'Tranches',
      value: stats.tranches,
      icon: Layers,
      color: 'bg-green-500',
      action: () => onNavigate('projects'),
    },
    {
      title: 'Souscriptions',
      value: stats.subscriptions,
      icon: Users,
      color: 'bg-orange-500',
      action: () => onNavigate('subscriptions'),
    },
    {
      title: 'Coupons à 90j',
      value: stats.upcomingCoupons,
      icon: TrendingUp,
      color: 'bg-slate-700',
      action: () => onNavigate('coupons'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gestion des Souscriptions</h1>
              <p className="text-sm text-slate-600">{organization.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Tableau de bord</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((card) => (
                <button
                  key={card.title}
                  onClick={card.action}
                  className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-slate-200 text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${card.color} p-3 rounded-lg`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{card.value}</p>
                  <p className="text-sm text-slate-600">{card.title}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <button
                onClick={() => onNavigate('projects')}
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-all border border-slate-200 text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-500 p-4 rounded-xl">
                    <FolderOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Gérer les projets</h3>
                    <p className="text-slate-600">Créer et gérer vos projets d'émission</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('subscriptions')}
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-all border border-slate-200 text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-orange-500 p-4 rounded-xl">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Voir les souscriptions</h3>
                    <p className="text-slate-600">Consulter toutes les souscriptions</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate('coupons')}
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-all border border-slate-200 text-left"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-slate-700 p-4 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Coupons à venir</h3>
                    <p className="text-slate-600">Voir les coupons des 90 prochains jours</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
