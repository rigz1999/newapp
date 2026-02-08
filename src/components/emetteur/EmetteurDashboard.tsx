import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Banknote,
  MessageSquare,
  Clock,
  FolderOpen,
  Megaphone,
  ChevronRight,
  Percent,
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

interface RpcEmetteurProject {
  projet_id: string;
  projet_name: string;
  emetteur_name: string;
  org_id: string;
  org_name: string;
  date_emission: string | null;
  taux_interet: number | null;
  montant_global: number | null;
}

const ACCENT_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
];

const ACCENT_BG_LIGHT = [
  'bg-blue-50',
  'bg-emerald-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-cyan-50',
  'bg-orange-50',
];

const ACCENT_TEXT = [
  'text-blue-700',
  'text-emerald-700',
  'text-amber-700',
  'text-rose-700',
  'text-cyan-700',
  'text-orange-700',
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
    if (data) {
      setUserProfile(data);
    }
  };

  const loadEmetteurProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: projectsError } = (await supabase.rpc('get_emetteur_projects' as any, {
        p_user_id: user!.id,
      })) as unknown as { data: RpcEmetteurProject[] | null; error: { message: string } | null };

      if (projectsError) {
        throw projectsError;
      }

      const projectsWithDetails = await Promise.all(
        (data || []).map(async (project: RpcEmetteurProject) => {
          const { data: subs } = await supabase
            .from('souscriptions')
            .select('id')
            .eq('projet_id', project.projet_id);

          const subscriptionIds = (subs || []).map((s: Record<string, unknown>) => s.id as string);

          let nextPayment = null;
          if (subscriptionIds.length > 0) {
            const { data: np } = await supabase
              .from('coupons_echeances')
              .select('date_echeance, montant_coupon, souscription_id')
              .eq('statut', 'en_attente')
              .in('souscription_id', subscriptionIds)
              .order('date_echeance', { ascending: true })
              .limit(1)
              .maybeSingle();
            nextPayment = np;
          }

          let totalAmount = 0;
          if (nextPayment && subscriptionIds.length > 0) {
            const { data: allPayments } = await supabase
              .from('coupons_echeances')
              .select('montant_coupon')
              .eq('date_echeance', nextPayment.date_echeance)
              .eq('statut', 'en_attente')
              .in('souscription_id', subscriptionIds);
            totalAmount = allPayments?.reduce((sum, p) => sum + Number(p.montant_coupon), 0) || 0;
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
                  author:
                    ((latestComment.user as unknown as Record<string, unknown>)
                      ?.full_name as string) || 'Utilisateur',
                }
              : null,
          };
        })
      );

      setProjects(projectsWithDetails);
    } catch (err: unknown) {
      console.error('Error loading emetteur projects:', err);
      setError((err as Error).message);
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
    const cleaned = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '');
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.substring(0, maxLength)}...`;
  };

  const getUrgencyLabel = (days: number) => {
    if (days < 0) {
      return { text: 'En retard', className: 'bg-red-100 text-red-700' };
    }
    if (days === 0) {
      return { text: "Aujourd'hui", className: 'bg-red-100 text-red-700' };
    }
    if (days <= 3) {
      return { text: `${days}j`, className: 'bg-red-100 text-red-700' };
    }
    if (days <= 14) {
      return { text: `${days}j`, className: 'bg-amber-100 text-amber-700' };
    }
    if (days <= 30) {
      return { text: `${days}j`, className: 'bg-blue-100 text-blue-700' };
    }
    return { text: `${days}j`, className: 'bg-slate-100 text-slate-600' };
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
      <div className="max-w-5xl mx-auto px-6 py-8">
        <ErrorMessage message={error} />
      </div>
    );
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || '';
  const totalNextPayment = projects.reduce((sum, p) => sum + (p.next_payment_amount || 0), 0);
  const nearestPayment = projects
    .filter(p => p.next_payment_date)
    .sort(
      (a, b) => new Date(a.next_payment_date!).getTime() - new Date(b.next_payment_date!).getTime()
    )[0];
  const totalRecentActivity = projects.reduce((sum, p) => sum + p.recent_actualites, 0);
  const nearestDays = nearestPayment?.next_payment_date
    ? getDaysUntil(nearestPayment.next_payment_date)
    : null;

  if (projects.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="max-w-md mx-auto text-center py-24">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-200">
            <FolderOpen className="w-9 h-9 text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Aucun projet assigne</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            L'administrateur de votre organisation doit vous inviter sur un projet pour commencer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {firstName ? `Bonjour, ${firstName}` : 'Mes Projets'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vue d'ensemble de vos {projects.length} projet{projects.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-[18px] h-[18px] text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Projets</p>
              <p className="text-2xl font-semibold text-slate-900 leading-tight mt-0.5">
                {projects.length}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-[18px] h-[18px] text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Prochain coupon
              </p>
              {nearestPayment?.next_payment_date ? (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-2xl font-semibold text-slate-900 leading-tight">
                    {formatCurrency(totalNextPayment)}
                  </p>
                  {nearestDays !== null && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getUrgencyLabel(nearestDays).className}`}
                    >
                      {getUrgencyLabel(nearestDays).text}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-0.5">--</p>
              )}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-[18px] h-[18px] text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Actualites
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className="text-2xl font-semibold text-slate-900 leading-tight">
                  {totalRecentActivity}
                </p>
                <span className="text-xs text-slate-400">cette semaine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {projects.map((project, index) => {
          const daysUntilPayment = project.next_payment_date
            ? getDaysUntil(project.next_payment_date)
            : null;
          const accentGradient = ACCENT_GRADIENTS[index % ACCENT_GRADIENTS.length];
          const accentBg = ACCENT_BG_LIGHT[index % ACCENT_BG_LIGHT.length];
          const accentText = ACCENT_TEXT[index % ACCENT_TEXT.length];

          return (
            <Link
              key={project.projet_id}
              to={`/emetteur/projets/${project.projet_id}`}
              className="block group"
            >
              <div className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                    >
                      <span className="text-white font-semibold text-sm">
                        {project.projet_name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[15px] font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {project.projet_name}
                        </h3>
                        {project.recent_actualites > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 flex-shrink-0 tracking-wide">
                            <Megaphone className="w-2.5 h-2.5" />
                            {project.recent_actualites} nouveau
                            {project.recent_actualites > 1 ? 'x' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{project.org_name}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                        {project.montant_global != null && (
                          <div className="flex items-center gap-1.5">
                            <Banknote className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                              {formatCurrency(project.montant_global)}
                            </span>
                          </div>
                        )}
                        {project.taux_interet != null && (
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">
                              {project.taux_interet}%
                            </span>
                          </div>
                        )}
                        {project.date_emission && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {formatDate(project.date_emission)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0 pt-1">
                      <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ouvrir
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {(project.next_payment_date || project.latest_actualite) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                      {project.next_payment_date && (
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${accentBg} flex-shrink-0`}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Prochain coupon</span>
                            <span className={`text-sm font-semibold ${accentText}`}>
                              {formatCurrency(project.next_payment_amount || 0)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(project.next_payment_date)}
                            </span>
                            {daysUntilPayment !== null && (
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${getUrgencyLabel(daysUntilPayment).className}`}
                              >
                                {getUrgencyLabel(daysUntilPayment).text}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {project.latest_actualite && (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-600 truncate">
                            <span className="font-medium">{project.latest_actualite.author}</span>{' '}
                            {truncateText(project.latest_actualite.text, 50)}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                            {getRelativeTime(project.latest_actualite.date)}
                          </span>
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
  );
}
