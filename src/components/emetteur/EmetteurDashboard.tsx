import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, FileText, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Spinner } from '../common/Spinner';
import { ErrorMessage } from '../common/ErrorMessage';

interface EmetteurProject {
  projet_id: string;
  projet_name: string;
  emetteur_name: string;
  org_id: string;
  org_name: string;
  date_emission: string | null;
  taux_interet: number | null;
  montant_global: number | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  unread_actualites: number;
}

export default function EmetteurDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<EmetteurProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEmetteurProjects();
    }
  }, [user]);

  const loadEmetteurProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: projectsError } = await supabase.rpc(
        'get_emetteur_projects',
        {
          p_user_id: user!.id,
        }
      );

      if (projectsError) throw projectsError;

      const projectsWithPayments = await Promise.all(
        (data || []).map(async (project: any) => {
          const { data: nextPayment } = await supabase
            .from('coupons_echeances')
            .select('date_echeance, montant_coupon, souscription_id')
            .eq('statut', 'en_attente')
            .in('souscription_id', [
              supabase
                .from('souscriptions')
                .select('id')
                .eq('projet_id', project.projet_id),
            ])
            .order('date_echeance', { ascending: true })
            .limit(1)
            .single();

          let totalAmount = 0;
          if (nextPayment) {
            const { data: allPayments } = await supabase
              .from('coupons_echeances')
              .select('montant_coupon')
              .eq('date_echeance', nextPayment.date_echeance)
              .eq('statut', 'en_attente')
              .in('souscription_id', [
                supabase
                  .from('souscriptions')
                  .select('id')
                  .eq('projet_id', project.projet_id),
              ]);

            totalAmount =
              allPayments?.reduce((sum, p) => sum + Number(p.montant_coupon), 0) || 0;
          }

          const { count: unreadCount } = await supabase
            .from('project_comments')
            .select('*', { count: 'exact', head: true })
            .eq('projet_id', project.projet_id)
            .gt(
              'created_at',
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            );

          return {
            ...project,
            next_payment_date: nextPayment?.date_echeance || null,
            next_payment_amount: totalAmount || null,
            unread_actualites: unreadCount || 0,
          };
        })
      );

      setProjects(projectsWithPayments);
    } catch (err: any) {
      console.error('Error loading emetteur projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun projet assigné</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vous n'avez pas encore de projets assignés.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes Projets</h1>
        <p className="text-sm text-gray-500">{projects.length} projet{projects.length > 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.projet_id}
            to={`/emetteur/projets/${project.projet_id}`}
            className="block group"
          >
            <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {project.projet_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{project.org_name}</p>
                  </div>
                  {project.unread_actualites > 0 && (
                    <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      <Bell className="h-3 w-3" />
                      <span className="text-xs font-medium">{project.unread_actualites}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {project.next_payment_date && (
                    <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                      <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          Prochain paiement
                        </p>
                        <p className="text-sm text-blue-700">
                          {formatDate(project.next_payment_date)} -{' '}
                          {formatCurrency(project.next_payment_amount)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {project.taux_interet && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Taux</p>
                          <p className="text-sm font-medium text-gray-900">
                            {project.taux_interet}%
                          </p>
                        </div>
                      </div>
                    )}
                    {project.montant_global && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Montant</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(project.montant_global)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                  Voir le détail →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
