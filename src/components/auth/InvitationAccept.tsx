// ============================================
// Invitation Accept Page
// Path: src/components/InvitationAccept.tsx
// ============================================

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Lock, Mail, User, RefreshCw } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  org_id: string;
  role: 'member' | 'admin';
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  organizations?: {
    name: string;
  };
}

export function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Lien d\'invitation invalide. Aucun token fourni.');
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    setLoading(true);
    setError('');

    try {
      // Récupérer l'invitation avec le token
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select(`
          *,
          organizations:organizations(name)
        `)
        .eq('token', token!)
        .single();

      if (invitationError || !invitationData) {
        setError('Invitation introuvable. Le lien est peut-être invalide.');
        setLoading(false);
        return;
      }

      // Vérifier le statut
      if (invitationData.status === 'accepted') {
        setError('Cette invitation a déjà été utilisée.');
        setLoading(false);
        return;
      }

      if (invitationData.status === 'expired') {
        setError('Cette invitation a expiré.');
        setLoading(false);
        return;
      }

      // Vérifier la date d'expiration
      const expiresAt = new Date(invitationData.expires_at);
      const now = new Date();

      if (expiresAt < now) {
        // Marquer comme expirée
        await supabase
          .from('invitations')
          .update({ status: 'expired' } as never)
          .eq('id', invitationData.id);

        setError('Cette invitation a expiré.');
        setLoading(false);
        return;
      }

      setInvitation(invitationData);
    } catch {
      setError('Erreur lors de la vérification de l\'invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    // Validation
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // 1. Créer le compte utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: `${invitation.first_name} ${invitation.last_name}`,
          },
        },
      });

      if (authError) {
        // Si l'utilisateur existe déjà
        if (authError.message.includes('already registered')) {
          setError('Un compte existe déjà avec cet email. Veuillez vous connecter.');
          setCreating(false);
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte.');
      }

      // 2. Créer le membership dans l'organisation
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: authData.user.id,
          org_id: invitation.org_id,
          role: invitation.role,
        } as any);

      if (membershipError) {
        throw new Error('Erreur lors de l\'ajout à l\'organisation.');
      }

      // 3. Marquer l'invitation comme acceptée
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        } as never)
        .eq('id', invitation.id);

      if (updateError) {
        // Non bloquant, on continue
      }

      // 4. Succès !
      setSuccess(true);

      // Redirection après 3 secondes
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte. Veuillez réessayer.');
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-slate-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Vérification de votre invitation...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Compte créé avec succès !
            </h1>
            <p className="text-slate-600 mb-4">
              Bienvenue {invitation?.first_name} {invitation?.last_name}
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                Votre compte a été créé et vous avez été ajouté à l'organisation{' '}
                <strong>{invitation?.organizations?.name}</strong>.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Redirection vers la page de connexion...
            </p>

            <div className="mt-4">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
              Invitation invalide
            </h1>
            <p className="text-center text-slate-600 mb-6">
              {error}
            </p>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-slate-900 p-3 rounded-xl">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Créer votre compte
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Vous avez été invité à rejoindre{' '}
            <strong>{invitation?.organizations?.name}</strong>
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-6">
            {/* Prénom */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                Prénom
              </label>
              <input
                id="firstName"
                type="text"
                value={invitation?.first_name || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Nom */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                Nom
              </label>
              <input
                id="lastName"
                type="text"
                value={invitation?.last_name || ''}
                disabled
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rôle
              </label>
              <div className="px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 capitalize">
                {invitation?.role === 'admin' ? 'Administrateur' : 'Membre'}
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Minimum 6 caractères"
                />
              </div>
            </div>

            {/* Confirmer mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Confirmer votre mot de passe"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Vous avez déjà un compte ?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-slate-900 hover:underline font-medium"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
