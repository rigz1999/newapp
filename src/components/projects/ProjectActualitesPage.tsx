import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  Bold,
  Italic,
  Link as LinkIcon,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sanitizeHTML } from '../../utils/sanitizer';
import { FileUpload } from './actualites/FileUpload';
import { AttachmentDisplay } from './actualites/AttachmentDisplay';

interface Attachment {
  filename: string;
  url: string;
  size: number;
  type: 'image' | 'video' | 'document';
}

interface Actualite {
  id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user: {
    full_name: string;
  } | null;
  user_id: string | null;
  attachments: Attachment[];
}

interface Project {
  projet: string;
  org_id: string | null;
}

export function ProjectActualitesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newActualite, setNewActualite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actualiteToDelete, setActualiteToDelete] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const ACTUALITES_PER_PAGE = 20;

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchActualites();
      getCurrentUser();
    }
  }, [projectId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchProject = async () => {
    if (!projectId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projets')
        .select('projet, org_id')
        .eq('id', projectId)
        .single();

      if (error) {
        throw error;
      }
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchActualites = async (loadMore = false) => {
    if (!projectId) {
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const offset = loadMore ? (page + 1) * ACTUALITES_PER_PAGE : 0;

      const { data, error, count } = await supabase
        .from('project_comments')
        .select(
          `
          id,
          comment_text,
          created_at,
          updated_at,
          is_edited,
          user_id,
          attachments,
          user:profiles(full_name)
        `,
          { count: 'exact' }
        )
        .eq('projet_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + ACTUALITES_PER_PAGE - 1);

      if (error) {
        throw error;
      }

      if (loadMore) {
        setActualites([...actualites, ...((data || []) as unknown as Actualite[])]);
        setPage(page + 1);
      } else {
        setActualites((data || []) as unknown as Actualite[]);
        setPage(0);
      }

      const totalFetched = loadMore ? actualites.length + (data?.length || 0) : data?.length || 0;
      setHasMore(totalFetched < (count || 0));
    } catch (error) {
      console.error('Error fetching actualites:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const uploadFiles = async (actualiteId: string): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];

    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${project?.org_id}/${projectId}/${actualiteId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('actualites-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('actualites-attachments').getPublicUrl(filePath);

      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'document';

      attachments.push({
        filename: file.name,
        url: publicUrl,
        size: file.size,
        type,
      });
    }

    return attachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActualite.trim() || submitting || !project) {
      return;
    }

    setSubmitting(true);
    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('project_comments')
        .insert({
          projet_id: projectId,
          org_id: project.org_id,
          comment_text: newActualite.trim(),
          user_id: currentUserId,
        } as never)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (uploadedFiles.length > 0 && insertedData) {
        const attachments = await uploadFiles(insertedData.id);

        const { error: updateError } = await supabase
          .from('project_comments')
          .update({ attachments } as never)
          .eq('id', insertedData.id);

        if (updateError) {
          console.error('Error updating attachments:', updateError);
        }

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-actualite-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                actualiteId: insertedData.id,
                projectId,
                orgId: project.org_id,
              }),
            }
          );

          if (!response.ok) {
            console.error('Failed to send email notification');
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }

      setNewActualite('');
      setUploadedFiles([]);
      setShowFileUpload(false);
      await fetchActualites();
    } catch (error) {
      console.error('Error posting actualite:', error);
      alert("Erreur lors de la publication de l'actualité");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (actualiteId: string) => {
    if (!editText.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({
          comment_text: editText.trim(),
        })
        .eq('id', actualiteId);

      if (error) {
        throw error;
      }

      setEditingId(null);
      setEditText('');
      await fetchActualites();
    } catch (error) {
      console.error('Error updating actualite:', error);
      alert("Erreur lors de la modification de l'actualité");
    }
  };

  const handleDelete = async () => {
    if (!actualiteToDelete) {
      return;
    }

    try {
      const actualite = actualites.find(a => a.id === actualiteToDelete);
      if (actualite?.attachments && actualite.attachments.length > 0) {
        for (const attachment of actualite.attachments) {
          const urlParts = attachment.url.split('/');
          const pathIndex = urlParts.indexOf('actualites-attachments') + 1;
          const filePath = urlParts.slice(pathIndex).join('/');

          await supabase.storage.from('actualites-attachments').remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', actualiteToDelete);

      if (error) {
        throw error;
      }
      setDeleteConfirmOpen(false);
      setActualiteToDelete(null);
      await fetchActualites();
    } catch (error) {
      console.error('Error deleting actualite:', error);
      alert("Erreur lors de la suppression de l'actualité");
    }
  };

  const insertFormatting = (
    format: 'bold' | 'italic' | 'link',
    text: string,
    setText: (text: string) => void
  ) => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    const start = textarea?.selectionStart || text.length;
    const end = textarea?.selectionEnd || text.length;
    const selectedText = text.substring(start, end);

    let formattedText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'texte en gras'}**`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'texte en italique'}*`;
        newCursorPos = start + 1;
        break;
      case 'link':
        formattedText = `[${selectedText || 'texte du lien'}](url)`;
        newCursorPos = start + 1;
        break;
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursorPos, newCursorPos + (selectedText?.length || 0));
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
      )
      .replace(/\n/g, '<br/>');

    const sanitized = sanitizeHTML(html);

    return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
  };

  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-slate-600">Chargement des actualités...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/projets/${projectId}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au projet
          </button>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Actualités</h1>
              <p className="text-slate-600">{project?.projet || 'Projet'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold', newActualite, setNewActualite)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Gras"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('italic', newActualite, setNewActualite)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Italique"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('link', newActualite, setNewActualite)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Lien"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className={`p-2 hover:bg-slate-100 rounded ${
                    showFileUpload
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Joindre des fichiers"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={newActualite}
                onChange={e => setNewActualite(e.target.value)}
                placeholder="Partager une actualité du projet..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {showFileUpload && (
              <div className="mb-4">
                <FileUpload onFilesChange={setUploadedFiles} />
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newActualite.trim() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </form>
        </div>

        {actualites.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg">Aucune actualité pour le moment</p>
            <p className="text-slate-400 text-sm mt-2">Soyez le premier à partager!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actualites.map(actualite => (
              <div
                key={actualite.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
              >
                {editingId === actualite.id ? (
                  <div>
                    <div className="flex gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => insertFormatting('bold', editText, setEditText)}
                        className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('italic', editText, setEditText)}
                        className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting('link', editText, setEditText)}
                        className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-3 resize-none"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(actualite.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg text-slate-900">
                            {actualite.user?.full_name || 'Utilisateur supprimé'}
                          </span>
                          <span className="text-sm text-slate-500">
                            {getRelativeTime(actualite.created_at)}
                            {actualite.is_edited && ' (modifié)'}
                          </span>
                        </div>
                      </div>
                      {currentUserId === actualite.user_id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(actualite.id);
                              setEditText(actualite.comment_text);
                            }}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActualiteToDelete(actualite.id);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-slate-700 prose prose-sm max-w-none">
                      {renderMarkdown(actualite.comment_text)}
                    </div>
                    {actualite.attachments && actualite.attachments.length > 0 && (
                      <AttachmentDisplay attachments={actualite.attachments} />
                    )}
                  </>
                )}
              </div>
            ))}

            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchActualites(true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 font-medium"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </span>
                  ) : (
                    'Charger plus'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer l'actualité</h3>
              <p className="text-slate-600 mb-6">
                Êtes-vous sûr de vouloir supprimer cette actualité ? Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setActualiteToDelete(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
