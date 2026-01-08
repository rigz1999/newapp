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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sanitizeHTML } from '../../utils/sanitizer';

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user: {
    full_name: string;
  };
  user_id: string;
}

interface Project {
  projet: string;
  org_id: string;
}

export function ProjectCommentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const COMMENTS_PER_PAGE = 20;

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchComments();
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

  const fetchComments = async (loadMore = false) => {
    if (!projectId) {
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const offset = loadMore ? (page + 1) * COMMENTS_PER_PAGE : 0;

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
          user:profiles(full_name)
        `,
          { count: 'exact' }
        )
        .eq('projet_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + COMMENTS_PER_PAGE - 1);

      if (error) {
        throw error;
      }

      if (loadMore) {
        setComments([...comments, ...(data || [])]);
        setPage(page + 1);
      } else {
        setComments(data || []);
        setPage(0);
      }

      const totalFetched = loadMore ? comments.length + (data?.length || 0) : data?.length || 0;
      setHasMore(totalFetched < (count || 0));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting || !project) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('project_comments').insert({
        projet_id: projectId,
        org_id: project.org_id,
        comment_text: newComment.trim(),
        user_id: currentUserId,
      });

      if (error) {
        throw error;
      }

      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Erreur lors de la publication du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({
          comment_text: editText.trim(),
        })
        .eq('id', commentId);

      if (error) {
        throw error;
      }

      setEditingId(null);
      setEditText('');
      await fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Erreur lors de la modification du commentaire');
    }
  };

  const handleDelete = async () => {
    if (!commentToDelete) {
      return;
    }

    try {
      const { error } = await supabase.from('project_comments').delete().eq('id', commentToDelete);

      if (error) {
        throw error;
      }
      setDeleteConfirmOpen(false);
      setCommentToDelete(null);
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erreur lors de la suppression du commentaire');
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

    // Sanitize HTML to prevent XSS attacks
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
            <span className="text-slate-600">Chargement des commentaires...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
              <h1 className="text-2xl font-bold text-slate-900">Commentaires</h1>
              <p className="text-slate-600">{project?.projet || 'Projet'}</p>
            </div>
          </div>
        </div>

        {/* New Comment Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold', newComment, setNewComment)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Gras"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('italic', newComment, setNewComment)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Italique"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('link', newComment, setNewComment)}
                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                  title="Lien"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg">Aucun commentaire pour le moment</p>
            <p className="text-slate-400 text-sm mt-2">
              Soyez le premier à partager vos réflexions!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div
                key={comment.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
              >
                {editingId === comment.id ? (
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
                        onClick={() => handleEdit(comment.id)}
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
                            {comment.user?.full_name || 'Utilisateur'}
                          </span>
                          <span className="text-sm text-slate-500">
                            {getRelativeTime(comment.created_at)}
                            {comment.is_edited && ' (modifié)'}
                          </span>
                        </div>
                      </div>
                      {currentUserId === comment.user_id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditText(comment.comment_text);
                            }}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCommentToDelete(comment.id);
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
                      {renderMarkdown(comment.comment_text)}
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchComments(true)}
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

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer le commentaire</h3>
              <p className="text-slate-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setCommentToDelete(null);
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
