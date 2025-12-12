// ============================================
// Invitation Accept Page
// Path: src/components/InvitationAccept.tsx
// ============================================

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Lock, Mail, User, RefreshCw, Eye, EyeOff, Check, X } from 'lucide-react';

// Create a fresh anonymous client without any stored session
const anonSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Don't use stored sessions
      autoRefreshToken: false,
    },
  }
);

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      // Récupérer l'invitation avec le token (using anonymous client)
      const { data: invitationData, error: invitationError } = await anonSupabase
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
        // Marquer comme expirée (using anonymous client)
        await anonSupabase
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

  // Password strength checker
  const checkPasswordRequirements = (password: string) => {
    return {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
      hasMinLength: password.length >= 12
    };
  };

  const passwordRequirements = checkPasswordRequirements(password);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    // Validation
    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas tous les critères de sécurité.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Make a direct fetch call to get better error handling
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/accept-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          token: token,
          password: password,
        }),
      });

      const data = await response.json();
      console.log('Edge function response:', { status: response.status, data });

      if (!response.ok) {
        console.error('Error response:', data);

        // Handle specific errors from the Edge Function
        if (data.userExists) {
          setError('Un compte existe déjà avec cet email. Veuillez vous connecter.');
          setCreating(false);
          return;
        }

        throw new Error(data.error || 'Erreur lors de la création du compte.');
      }

      if (!data?.success) {
        console.error('No success flag in response:', data);
        throw new Error('Erreur lors de la création du compte.');
      }

      // If we got a session, set it
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      // Success!
      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      console.error('Caught error:', err);
      const errorMessage = err.message || 'Erreur lors de la création du compte. Veuillez réessayer.';
      console.error('Error message to display:', errorMessage);
      setError(errorMessage);
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
                <AlertCircle className="w-12 h-12 text-finixar-red" />
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Minimum 12 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements Visual Indicators */}
              {password && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Critères de sécurité :</p>

                  <PasswordRequirement
                    met={passwordRequirements.hasMinLength}
                    text="Au moins 12 caractères"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasLowercase}
                    text="Une lettre minuscule (a-z)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasUppercase}
                    text="Une lettre majuscule (A-Z)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasNumber}
                    text="Un chiffre (0-9)"
                  />
                  <PasswordRequirement
                    met={passwordRequirements.hasSpecial}
                    text="Un caractère spécial (!@#$%...)"
                  />

                  {isPasswordValid && (
                    <div className="pt-2 mt-2 border-t border-slate-300">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">Mot de passe sécurisé !</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  placeholder="Confirmer votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <PasswordRequirement
                    met={password === confirmPassword}
                    text={password === confirmPassword ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
                  />
                </div>
              )}
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

// Password Requirement Component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
          met
            ? 'bg-green-500 text-white'
            : 'bg-slate-300 text-slate-400'
        }`}
      >
        {met ? (
          <Check className="w-3 h-3" strokeWidth={3} />
        ) : (
          <X className="w-3 h-3" strokeWidth={3} />
        )}
      </div>
      <span
        className={`text-xs transition-colors duration-200 ${
          met ? 'text-green-700 font-medium' : 'text-slate-600'
        }`}
      >
        {text}
      </span>
    </div>
  );
}
