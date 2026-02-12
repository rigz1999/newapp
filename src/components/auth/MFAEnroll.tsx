import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { OTPInput } from '../common/OTPInput';
import { ShieldCheck, Smartphone, Copy, CheckCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface MFAEnrollProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type EnrollStep = 'intro' | 'qr' | 'verify' | 'success';

export function MFAEnroll({ onComplete }: MFAEnrollProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [step, setStep] = useState<EnrollStep>('intro');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleStartEnroll = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Finixar Authenticator',
      });

      if (enrollError) {
        throw enrollError;
      }

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('qr');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'activation du 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
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

      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Code invalide.';
      setError(message.includes('Invalid') ? 'Code invalide. Veuillez r\u00e9essayer.' : message);
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut({ scope: 'local' });
  };

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

          {step === 'intro' && (
            <>
              <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                Activez la double authentification
              </h1>
              <p className="text-center text-slate-600 mb-6">
                Pour sécuriser votre compte Finixar, la double authentification (2FA) est
                obligatoire. Vous aurez besoin d'une application d'authentification.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">Applications recommandées :</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Google Authenticator (iOS / Android)</li>
                      <li>• Microsoft Authenticator (iOS / Android)</li>
                      <li>• Authy (iOS / Android / Desktop)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleStartEnroll}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Préparation...
                  </span>
                ) : (
                  'Commencer la configuration'
                )}
              </button>
            </>
          )}

          {step === 'qr' && (
            <>
              <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
                Scannez le QR code
              </h1>
              <p className="text-center text-slate-600 mb-6">
                Ouvrez votre application d'authentification et scannez le QR code ci-dessous.
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual entry fallback */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 text-center mb-2">
                  Impossible de scanner ? Saisissez cette clé manuellement :
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <code className="flex-1 text-xs font-mono text-slate-700 break-all select-all">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="flex-shrink-0 text-slate-500 hover:text-slate-700 transition-colors"
                    title="Copier"
                  >
                    {secretCopied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                J'ai scanné le QR code
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Vérification</h1>
              <p className="text-center text-slate-600 mb-8">
                Saisissez le code à 6 chiffres affiché dans votre application d'authentification.
              </p>

              <div className="mb-6">
                <OTPInput onComplete={handleVerify} disabled={verifying} />
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

              <button
                onClick={() => setStep('qr')}
                className="w-full text-center text-sm text-slate-600 hover:text-slate-900 transition-colors mt-2"
              >
                Retour au QR code
              </button>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">2FA activé avec succès !</h1>
                <p className="text-slate-600 mb-8">
                  Votre compte est maintenant protégé par la double authentification. Vous devrez
                  saisir un code à chaque connexion.
                </p>

                <button
                  onClick={onComplete}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Continuer vers l'application
                </button>
              </div>
            </>
          )}

          {step !== 'success' && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleLogout}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 text-sm transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? 'D\u00e9connexion...' : 'Se d\u00e9connecter'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
