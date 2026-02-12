import { useState, useEffect } from 'react';
import {
  hasConsentBeenGiven,
  acceptAll,
  rejectAll,
  setConsentState,
} from '../../utils/cookieConsent';
import { initSentry } from '../../config/sentry';
import { Shield, Settings, X } from 'lucide-react';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [errorTracking, setErrorTracking] = useState(false);

  useEffect(() => {
    if (!hasConsentBeenGiven()) {
      setVisible(true);
    }

    const handleOpenSettings = () => {
      setVisible(true);
      setShowDetails(true);
    };
    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    const state = acceptAll();
    if (state.error_tracking) {
      initSentry();
    }
    setVisible(false);
  };

  const handleRejectAll = () => {
    rejectAll();
    setVisible(false);
  };

  const handleSavePreferences = () => {
    const state = setConsentState({ error_tracking: errorTracking });
    if (state.error_tracking) {
      initSentry();
    }
    setVisible(false);
    setShowDetails(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 pointer-events-auto" />

      {/* Banner */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 pointer-events-auto border border-slate-200">
        {!showDetails ? (
          /* Main banner */
          <>
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-slate-900 rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Gestion des cookies</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Finixar utilise des cookies strictement nécessaires au fonctionnement du site
                  (authentification, sécurité). Nous souhaitons également utiliser des cookies pour
                  le suivi d'erreurs (Sentry) afin d'améliorer la qualité du service. Vous pouvez
                  accepter ou refuser ces cookies optionnels.
                </p>
              </div>
            </div>

            {/* CNIL-compliant: Accept and Reject have equal visual prominence */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Tout accepter
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Tout refuser
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          /* Granular preferences panel */
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Préférences de cookies</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Strictly necessary - always on */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Strictement nécessaires</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Authentification, sécurité de session, stockage du consentement. Ces cookies
                    sont indispensables au fonctionnement du site.
                  </p>
                </div>
                <div className="ml-4">
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500 cursor-not-allowed">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-center">Toujours actifs</p>
                </div>
              </div>

              {/* Error tracking - optional */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Suivi d'erreurs (Sentry)</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Permet de détecter et corriger les erreurs techniques pour améliorer la
                    stabilité de l'application. Données anonymisées.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setErrorTracking(!errorTracking)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      errorTracking ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        errorTracking ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Enregistrer mes préférences
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 px-5 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Tout refuser
              </button>
            </div>
          </>
        )}

        {/* Privacy policy link */}
        <p className="text-xs text-slate-500 mt-4 text-center">
          En savoir plus dans notre{' '}
          <a
            href="/politique-de-confidentialite"
            className="text-slate-700 underline hover:text-slate-900"
          >
            politique de confidentialité
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Small button to re-open cookie preferences.
 * Place in footer for CNIL compliance (must be permanently accessible).
 */
export function CookieSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-slate-400 hover:text-white transition-colors text-sm">
      Gérer les cookies
    </button>
  );
}
