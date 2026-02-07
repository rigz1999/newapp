import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Banknote,
  MessageSquare,
  ArrowRight,
  Clock,
  FolderOpen,
  Megaphone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Spinner } from '../common/Spinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  recent_actualites: number;
  latest_actualite: { text: string; date: string; author: string } | null;
}

const ACCENT_COLORS = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
  'border-l-orange-500',
];

export default function EmetteurDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<EmetteurProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      loadEmetteurProjects();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user!.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const loadEmetteurProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: projectsError } = await supabase.rpc(
        'get_emetteur_projects',
        { p_user_id: user!.id }
      );

      if (projectsError) throw projectsError;

      const projectsWithDetails = await Promise.all(
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
            .maybeSingle();

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

          const { count: recentCount } = await supabase
            .from('project_comments')
            .select('*', { count: 'exact', head: true })
            .eq('projet_id', project.projet_id)
            .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          const { data: latestComment } = await supabase
            .from('project_comments')
            .select('comment_text, created_at, user:profiles(full_name)')
            .eq('projet_id', project.projet_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...project,
            next_payment_date: nextPayment?.date_echeance || null,
            next_payment_amount: totalAmount || null,
            recent_actualites: recentCount || 0,
            latest_actualite: latestComment
              ? {
                  text: latestComment.comment_text,
                  date: latestComment.created_at,
                  author: (latestComment.user as any)?.full_name || 'Utilisateur',
                }
              : null,
          };
        })
      );

      setProjects(projectsWithDetails);
    } catch (err: any) {
      console.error('Error loading emetteur projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
    } catch {
      return dateString;
    }
  };

  const getDaysUntil = (dateString: string) => {
    const target = new Date(dateString);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const truncateText = (text: string, maxLength: number) => {
    const cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Chargement de vos projets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <ErrorMessage message={error} />
      </div>
    );
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || '';
  const totalNextPayment = projects.reduce((sum, p) => sum + (p.next_payment_amount || 0), 0);
  const nearestPayment = projects
    .filter((p) => p.next_payment_date)
    .sort((a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime())[0];
  const totalRecentActivity = projects.reduce((sum, p) => sum + p.recent_actualites, 0);

  if (projects.length === 0) {
    return (
      <div className="px-6 py-6">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Aucun projet assigne</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            L'administrateur de votre organisation doit vous inviter sur un projet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {firstName ? `Bonjour, ${firstName}` : 'Mes Projets'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {projects.length} projet{projects.length > 1 ? 's' : ''} actif{projects.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Projets actifs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Prochain coupon</p>
              {nearestPayment?.next_payment_date ? (
                <>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(totalNextPayment)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(nearestPayment.next_payment_date)}
                    <span className="text-amber-600 font-medium ml-1">
                      ({getDaysUntil(nearestPayment.next_payment_date)}j)
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 mt-2">Aucun coupon prevu</p>
              )}
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">Actualites cette semaine</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalRecentActivity}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Projets</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project, index) => {
            const daysUntilPayment = project.next_payment_date
              ? getDaysUntil(project.next_payment_date)
              : null;
            const isPaymentSoon = daysUntilPayment !== null && daysUntilPayment <= 14;
            const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];

            return (
              <Link
                key={project.projet_id}
                to={`/emetteur/projets/${project.projet_id}`}
                className="block group"
              >
                <div
                  className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${accentColor} hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {project.projet_name}
                          </h3>
                          {project.recent_actualites > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 flex-shrink-0">
                              <Megaphone className="w-3 h-3" />
                              {project.recent_actualites}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{project.org_name}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      {project.montant_global != null && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Banknote className="w-3.5 h-3.5 text-slate-400" />
                          {formatCurrency(project.montant_global)}
                        </div>
                      )}
                      {project.taux_interet != null && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                          {project.taux_interet}%
                        </div>
                      )}
                      {project.date_emission && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(project.date_emission)}
                        </div>
                      )}
                    </div>

                    {(project.next_payment_date || project.latest_actualite) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {project.next_payment_date && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock
                                className={`w-3.5 h-3.5 ${isPaymentSoon ? 'text-amber-500' : 'text-slate-400'}`}
                              />
                              <span className="text-xs text-slate-500">Prochain coupon</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${isPaymentSoon ? 'text-amber-700' : 'text-slate-900'}`}>
                                {formatCurrency(project.next_payment_amount || 0)}
                              </span>
                              <span className="text-xs text-slate-500 ml-2">
                                {formatDate(project.next_payment_date)}
                              </span>
                            </div>
                          </div>
                        )}

                        {project.latest_actualite && (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-slate-700 truncate">
                                {truncateText(project.latest_actualite.text, 60)}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {project.latest_actualite.author} {getRelativeTime(project.latest_actualite.date)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
