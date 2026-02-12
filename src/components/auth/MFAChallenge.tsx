import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { OTPInput } from '../common/OTPInput';
import { ShieldCheck, AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface MFAChallengeProps {
  onVerified: () => void;
}

export function MFAChallenge({ onVerified }: MFAChallengeProps) {
  const [factorId, setFactorId] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    try {
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();

      if (factorsError) {
        throw factorsError;
      }

      const verifiedFactor = data.totp.find(f => f.status === 'verified');
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!factorId) {
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        throw challengeError;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        throw verifyError;
      }

      onVerified();
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setError(
          'Trop de tentatives. Veuillez patienter quelques minutes avant de r\u00e9essayer.'
        );
      } else {
        const message = err instanceof Error ? err.message : 'Code invalide.';
        setError(
          message.includes('Invalid')
            ? `Code invalide. ${5 - newAttempts} tentative(s) restante(s).`
            : message
        );
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-finixar-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-finixar-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-slate-900 p-3 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Vérification 2FA</h1>
          <p className="text-center text-slate-600 mb-8">
            Saisissez le code à 6 chiffres de votre application d'authentification.
          </p>

          <div className="mb-6">
            <OTPInput onComplete={handleVerify} disabled={verifying || attempts >= 5} />
          </div>

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-slate-600 mb-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Vérification...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
