import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../common/Spinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { ProjectDetail } from '../projects/ProjectDetail';
import { isValidShortId } from '../../utils/shortId';

export default function EmetteurProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && user) {
      checkAccessAndLoadOrg();
    }
  }, [projectId, user]);

  const checkAccessAndLoadOrg = async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve short_id to UUID if needed
      let resolvedId = projectId!;
      if (isValidShortId(projectId!, 'projet')) {
        const { data: projectByShortId } = await supabase
          .from('projets')
          .select('id')
          .eq('short_id', projectId!)
          .single();

        if (!projectByShortId) {
          setError('Projet non trouve');
          return;
        }
        resolvedId = projectByShortId.id;
      }

      const { data: accessCheck } = await supabase
        .from('emetteur_projects')
        .select('id')
        .eq('projet_id', resolvedId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!accessCheck) {
        setError('Acces non autorise a ce projet');
        return;
      }

      const { data: projectData } = await supabase
        .from('projets')
        .select('org_id, organizations:org_id(id, name)')
        .eq('id', resolvedId)
        .maybeSingle();

      if (!projectData) {
        setError('Projet non trouve');
        return;
      }

      const org = projectData.organizations as Record<string, unknown> | null;
      setOrgInfo({
        id: (org?.id as string) || projectData.org_id || '',
        name: (org?.name as string) || 'Organisation',
      });
    } catch (err: unknown) {
      console.error('Error checking emetteur access:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (error || !orgInfo) {
    return (
      <div className="px-6 py-6">
        <ErrorMessage message={error || 'Projet non trouve'} />
      </div>
    );
  }

  return <ProjectDetail organization={{ id: orgInfo.id, name: orgInfo.name, role: 'emetteur' }} />;
}
