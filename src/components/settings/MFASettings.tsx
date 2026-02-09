import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Key,
} from 'lucide-react';
import { logAuditEvent } from '../../utils/auditLogger';

export function MFASettings() {
  const [hasVerifiedFactor, setHasVerifiedFactor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkFactors();
  }, []);

  const checkFactors = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.some(f => f.status === 'verified') ?? false;
      setHasVerifiedFactor(verified);

      if (verified) {
        // Get remaining recovery codes count
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { data: countData } = await supabase.functions.invoke('manage-recovery-codes', {
            body: { action: 'count' },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (countData?.remaining !== undefined) {
            setRemainingCodes(countData.remaining);
          }
        }
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    setGeneratingCodes(true);
    setError('');
    setRecoveryCodes(null);
    setSavedConfirmed(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const { data, error: fnError } = await supabase.functions.invoke('manage-recovery-codes', {
        body: { action: 'generate' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        throw fnError;
      }
      if (data?.codes) {
        setRecoveryCodes(data.codes);
        setRemainingCodes(data.codes.length);

        logAuditEvent({
          action: 'created',
          entityType: 'membre',
          description: 'Codes de récupération 2FA régénérés',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération des codes.');
    } finally {
      setGeneratingCodes(false);
    }
  };

  const copyCodes = async () => {
    if (!recoveryCodes) {
      return;
    }
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const downloadCodes = () => {
    if (!recoveryCodes) {
      return;
    }
    const content = `Finixar - Codes de récupération 2FA\n${'='.repeat(40)}\n\nGardez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.\n\n${recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGénérés le : ${new Date().toLocaleDateString('fr-FR')}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finixar-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Double authentification (2FA)</h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            hasVerifiedFactor ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          {hasVerifiedFactor ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900">2FA activ&eacute;</p>
                <p className="text-xs text-green-800">
                  Votre compte est prot&eacute;g&eacute; par la double authentification TOTP.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">2FA non activ&eacute;</p>
                <p className="text-xs text-amber-800">
                  La double authentification sera configur&eacute;e lors de votre prochaine
                  connexion.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Recovery Codes Section */}
        {hasVerifiedFactor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Codes de r&eacute;cup&eacute;ration
                </h3>
              </div>
              {remainingCodes !== null && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    remainingCodes > 2
                      ? 'bg-green-100 text-green-700'
                      : remainingCodes > 0
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {remainingCodes} restant(s)
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600">
              Les codes de r&eacute;cup&eacute;ration vous permettent d'acc&eacute;der &agrave;
              votre compte si vous perdez votre application d'authentification. Chaque code ne peut
              &ecirc;tre utilis&eacute; qu'une seule fois.
            </p>

            {/* Show generated codes */}
            {recoveryCodes && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code, i) => (
                      <code
                        key={i}
                        className="text-sm font-mono text-slate-800 bg-white px-3 py-1.5 rounded border border-slate-200 text-center"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {codesCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Copi&eacute;
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    T&eacute;l&eacute;charger
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Sauvegardez ces codes maintenant. Ils ne seront plus affich&eacute;s
                      apr&egrave;s avoir quitt&eacute; cette page.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={savedConfirmed}
                    onChange={e => setSavedConfirmed(e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-700">
                    J'ai sauvegard&eacute; mes codes en lieu s&ucirc;r
                  </span>
                </label>

                {savedConfirmed && (
                  <button
                    onClick={() => setRecoveryCodes(null)}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    Fermer
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            {/* Generate / Regenerate button */}
            {!recoveryCodes && (
              <button
                onClick={handleGenerateRecoveryCodes}
                disabled={generatingCodes}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {generatingCodes ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    G&eacute;n&eacute;ration...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    {remainingCodes !== null && remainingCodes > 0
                      ? 'R&eacute;g&eacute;n&eacute;rer les codes'
                      : 'G&eacute;n&eacute;rer des codes de r&eacute;cup&eacute;ration'}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
