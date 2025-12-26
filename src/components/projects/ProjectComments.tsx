import { useState, useEffect } from 'react';
import { MessageSquare, Send, Edit2, Trash2, Eye, Bold, Italic, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ProjectCommentsProps {
  projectId: string;
  orgId: string;
}

export function ProjectComments({ projectId, orgId }: ProjectCommentsProps) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchComments();
    getCurrentUser();
  }, [projectId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('project_comments')
        .select('*', { count: 'exact', head: true })
        .eq('projet_id', projectId);

      setTotalCount(count || 0);

      // Get latest 5 comments
      const { data, error } = await supabase
        .from('project_comments')
        .select(`
          id,
          comment_text,
          created_at,
          updated_at,
          is_edited,
          user_id,
          user:profiles(full_name)
        `)
        .eq('projet_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('project_comments')
        .insert({
          projet_id: projectId,
          org_id: orgId,
          comment_text: newComment.trim(),
          user_id: currentUserId,
        });

      if (error) throw error;

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
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .update({
          comment_text: editText.trim(),
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditText('');
      await fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Erreur lors de la modification du commentaire');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Erreur lors de la suppression du commentaire');
    }
  };

  const insertFormatting = (format: 'bold' | 'italic' | 'link', text: string, setText: (text: string) => void) => {
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

    // Restore focus and cursor position
    setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(newCursorPos, newCursorPos + (selectedText?.length || 0));
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown renderer
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>') // Links
      .replace(/\n/g, '<br/>'); // Line breaks

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Commentaires du projet</h2>
        </div>
        <p className="text-slate-500 text-center py-8">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Commentaires du projet</h2>
          {totalCount > 0 && (
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
              {totalCount}
            </span>
          )}
        </div>
        {totalCount > 5 && (
          <button
            onClick={() => navigate(`/projets/${projectId}/comments`)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <Eye className="w-4 h-4" />
            Voir tout
          </button>
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="mb-6">
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
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Aucun commentaire. Soyez le premier à commenter!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border border-slate-200 rounded-lg p-4">
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
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(comment.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {comment.user?.full_name || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-slate-500">
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
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-slate-700 text-sm prose prose-sm max-w-none">
                    {renderMarkdown(comment.comment_text)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
