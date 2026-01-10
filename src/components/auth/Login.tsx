// ============================================
// Updated Login Component (Admin-Controlled Access)
// Path: src/components/Login.tsx
// Replace your existing Login.tsx with this
// ============================================

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorMessages';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError(formatErrorMessage(error));
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call custom edge function to send password reset email via Resend
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) {
        console.error('Edge function invocation error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Password reset request successful:', data);
      setResetEmailSent(true);
      setLoading(false);
    } catch (error) {
      console.error('Password reset failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      setLoading(false);
    }
  };

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
                ? 'Un email de réinitialisation a été envoyé'
                : 'Entrez votre email pour réinitialiser votre mot de passe'}
            </p>

            {resetEmailSent ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                  Un email avec un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                  Vérifiez votre boîte de réception.
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
                    onChange={e => setEmail(e.target.value)}
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
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-finixar-text mb-2">Finixar</h1>
          <p className="text-center text-slate-600 mb-8">Connectez-vous à votre compte</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-finixar-brand-blue hover:underline transition-colors"
                >
                  Mot de passe oublié?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Pas encore de compte ? Contactez votre administrateur pour recevoir une invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
