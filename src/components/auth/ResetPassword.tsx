import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation states
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    if (!token) {
      setError('Lien de réinitialisation invalide');
    }
  }, [token]);

  useEffect(() => {
    // Update password validations
    setValidations({
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Validate all password requirements
    const allValid = Object.values(validations).every(v => v);
    if (!allValid) {
      setError('Le mot de passe ne respecte pas tous les critères requis');
      setLoading(false);
      return;
    }

    try {
      // Call reset-password edge function
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          token,
          newPassword: password,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-green-500 p-3 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-finixar-text mb-2">
              Mot de passe réinitialisé
            </h1>
            <p className="text-center text-slate-600 mb-8">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de
              connexion...
            </p>

            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
              Redirection en cours...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-finixar-deep-blue p-3 rounded-xl">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-finixar-text mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-center text-slate-600 mb-8">
            Choisissez un nouveau mot de passe sécurisé pour votre compte
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all"
                  placeholder="••••••••"
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
            </div>

            {/* Password requirements */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Critères du mot de passe :</p>
              <ul className="space-y-2">
                <li
                  className={`text-sm flex items-center gap-2 ${validations.length ? 'text-green-600' : 'text-slate-600'}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${validations.length ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}
                  >
                    {validations.length && <span className="text-white text-xs">✓</span>}
                  </span>
                  Au moins 12 caractères
                </li>
                <li
                  className={`text-sm flex items-center gap-2 ${validations.uppercase ? 'text-green-600' : 'text-slate-600'}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${validations.uppercase ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}
                  >
                    {validations.uppercase && <span className="text-white text-xs">✓</span>}
                  </span>
                  Une lettre majuscule
                </li>
                <li
                  className={`text-sm flex items-center gap-2 ${validations.lowercase ? 'text-green-600' : 'text-slate-600'}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${validations.lowercase ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}
                  >
                    {validations.lowercase && <span className="text-white text-xs">✓</span>}
                  </span>
                  Une lettre minuscule
                </li>
                <li
                  className={`text-sm flex items-center gap-2 ${validations.number ? 'text-green-600' : 'text-slate-600'}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${validations.number ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}
                  >
                    {validations.number && <span className="text-white text-xs">✓</span>}
                  </span>
                  Un chiffre
                </li>
                <li
                  className={`text-sm flex items-center gap-2 ${validations.special ? 'text-green-600' : 'text-slate-600'}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${validations.special ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}
                  >
                    {validations.special && <span className="text-white text-xs">✓</span>}
                  </span>
                  Un caractère spécial (!@#$%^&*...)
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-finixar-action-process text-white py-3 rounded-lg font-medium hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
