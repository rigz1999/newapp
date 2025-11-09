// ============================================
// Updated Login Component (Admin-Controlled Access)
// Path: src/components/Login.tsx
// Replace your existing Login.tsx with this
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, UserPlus, Clock, RefreshCw } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Check if user is logged in and has access
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkUserAccess(session.user.id);
      } else {
        setCheckingAccess(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCheckingAccess(true);  // Set to true BEFORE checking access
        setUser(session.user);
        checkUserAccess(session.user.id);
      } else {
        setUser(null);
        setHasAccess(false);
        setCheckingAccess(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserAccess = async (userId: string) => {
    setCheckingAccess(true);
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, role, org_id')
      .eq('user_id', userId);

    if (memberships && memberships.length > 0) {
      setHasAccess(true);
      // Redirect will happen in parent component
    } else {
      setHasAccess(false);
    }
    setCheckingAccess(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(formatErrorMessage(error));
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!fullName.trim()) {
      setError('Le nom complet est requis');
      setLoading(false);
      return;
    }

    // Just create the user account - NO organization creation
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (authError) {
      setError(formatErrorMessage(authError));
      setLoading(false);
      return;
    }

    // Success - user created, they'll see waiting state
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://finixar.com/reset-password',
    });

    if (error) {
      setError(formatErrorMessage(error));
      setLoading(false);
    } else {
      setResetEmailSent(true);
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      checkUserAccess(user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Loading state - also show when user has access (prevents flash before redirect)
  if (checkingAccess || (user && hasAccess)) {
    return (
      <div className="min-h-screen bg-finixar-background flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-finixar-text animate-spin" />
      </div>
    );
  }

  // User logged in but no access - show waiting state
  if (user && !hasAccess) {
    return (
      <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-yellow-100 p-4 rounded-full">
                <Clock className="w-12 h-12 text-finixar-amber" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
              En attente d'approbation
            </h1>
            <p className="text-center text-slate-600 mb-6">
              Votre compte a été créé avec succès !
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Prochaine étape :</strong> Un administrateur doit vous donner accès à une
                organisation avant que vous puissiez utiliser la plateforme.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-700 mb-1">
                <strong>Votre email :</strong>
              </p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>

            <button
              onClick={handleRefresh}
              className="w-full bg-finixar-action-process text-white py-3 rounded-lg font-medium hover:bg-finixar-action-process-hover transition-colors mb-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Vérifier l'accès
            </button>

            <button
              onClick={handleSignOut}
              className="w-full text-slate-600 hover:text-slate-900 py-2 transition-colors text-sm"
            >
              Se déconnecter
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Besoin d'aide ? Contactez votre administrateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Forgot password form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-finixar-deep-blue p-3 rounded-xl">
                <LogIn className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-finixar-text mb-2">
              Mot de passe oublié
            </h1>
            <p className="text-center text-slate-600 mb-8">
              {resetEmailSent
                ? "Un email de réinitialisation a été envoyé"
                : "Entrez votre email pour réinitialiser votre mot de passe"}
            </p>

            {resetEmailSent ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                  Un email avec un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
                </div>
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetEmailSent(false);
                    setEmail('');
                    setError('');
                  }}
                  className="w-full bg-finixar-action-process text-white py-3 rounded-lg font-medium hover:bg-finixar-action-process-hover transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                    placeholder="votre@email.fr"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-finixar-action-process text-white py-3 rounded-lg font-medium hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError('');
                    }}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal login/signup form
  return (
    <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-finixar-deep-blue p-3 rounded-xl">
              {isSignUp ? (
                <UserPlus className="w-8 h-8 text-white" />
              ) : (
                <LogIn className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-finixar-text mb-2">
            Finixar
          </h1>
          <p className="text-center text-slate-600 mb-8">
            {isSignUp ? 'Créez votre compte' : 'Connectez-vous à votre compte'}
          </p>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                  placeholder="Jean Dupont"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-finixar-brand-blue hover:underline transition-colors"
                  >
                    Mot de passe oublié?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {isSignUp && (
                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-finixar-action-process text-white py-3 rounded-lg font-medium hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isSignUp ? 'Création...' : 'Connexion...') : (isSignUp ? 'Créer mon compte' : 'Se connecter')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setFullName('');
              }}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}