import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  trancheId?: string;
  projectName?: string;
  trancheName?: string;
}

export function CalendarExportModal({
  isOpen,
  onClose,
  projectId,
  trancheId,
  projectName,
  trancheName,
}: CalendarExportModalProps) {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [success, setSuccess] = useState<{
    total: number;
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  } | null>(null);

  const [settings, setSettings] = useState({
    includeUnpaidOnly: true,
    includePastDue: false,
    reminderMinutes: 10080, // 7 days
  });

  const reminderOptions = [
    { value: 1440, label: '1 jour avant' },
    { value: 4320, label: '3 jours avant' },
    { value: 10080, label: '7 jours avant' },
    { value: 20160, label: '14 jours avant' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setIsConnectionError(false);
    setSuccess(null);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        'export-echeances-to-calendar',
        {
          body: {
            projectId: projectId || null,
            trancheId: trancheId || null,
            settings,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccess(data.summary);
    } catch (err) {
      console.error('Error exporting to calendar:', err);

      // Check for specific error messages
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes('No email connection found') ||
          errorMessage.includes('connect your email')) {
        setIsConnectionError(true);
        setError(
          'Aucune connexion e-mail trouvée. Veuillez connecter votre compte Outlook dans les Paramètres pour activer l\'export vers le calendrier.'
        );
      } else if (errorMessage.includes('Calendar export is only supported for Microsoft')) {
        setIsConnectionError(true);
        setError(
          'L\'export calendrier n\'est disponible que pour les comptes Microsoft Outlook. Veuillez reconnecter votre e-mail avec un compte Microsoft.'
        );
      } else if (errorMessage.includes('Failed to refresh access token') ||
                 errorMessage.includes('reconnect your email')) {
        setIsConnectionError(true);
        setError(
          'Votre connexion e-mail a expiré. Veuillez reconnecter votre compte Outlook dans les Paramètres pour continuer.'
        );
      } else {
        setError(
          errorMessage || 'Une erreur est survenue lors de l\'export'
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-finixar-brand-blue" />
              <h2 className="text-xl font-semibold text-gray-900">
                Exporter au calendrier Outlook
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Content */}
        <div className="p-6">
          {!success ? (
            <>
              {/* Export scope */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Vous allez exporter :
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {projectName && <li>• Projet : {projectName}</li>}
                  {trancheName && <li>• Tranche : {trancheName}</li>}
                  {!trancheName && projectId && <li>• Toutes les tranches du projet</li>}
                </ul>
              </div>

              {/* Settings */}
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="includeUnpaidOnly"
                    checked={settings.includeUnpaidOnly}
                    onChange={(e) =>
                      setSettings({ ...settings, includeUnpaidOnly: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-finixar-brand-blue border-gray-300 rounded focus:ring-finixar-brand-blue"
                  />
                  <label htmlFor="includeUnpaidOnly" className="text-sm text-gray-700">
                    Inclure uniquement les échéances impayées
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="includePastDue"
                    checked={settings.includePastDue}
                    onChange={(e) =>
                      setSettings({ ...settings, includePastDue: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-finixar-brand-blue border-gray-300 rounded focus:ring-finixar-brand-blue"
                  />
                  <label htmlFor="includePastDue" className="text-sm text-gray-700">
                    Inclure les échéances passées
                  </label>
                </div>

                <div>
                  <label htmlFor="reminder" className="block text-sm font-medium text-gray-700 mb-2">
                    Rappel
                  </label>
                  <select
                    id="reminder"
                    value={settings.reminderMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, reminderMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent"
                  >
                    {reminderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info message */}
              <div className="mb-6 p-3 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-700">
                Les événements apparaîtront dans votre calendrier Outlook. Si vous avez déjà
                exporté ces échéances, seuls les changements seront synchronisés.
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  {isConnectionError && (
                    <button
                      onClick={() => {
                        navigate('/settings');
                        onClose();
                      }}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Aller aux Paramètres
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Success message */
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Export réussi !
              </h3>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p>Total : {success.total} échéance{success.total > 1 ? 's' : ''}</p>
                {success.created > 0 && (
                  <p className="text-green-600">
                    ✓ {success.created} créée{success.created > 1 ? 's' : ''}
                  </p>
                )}
                {success.updated > 0 && (
                  <p className="text-blue-600">
                    ↻ {success.updated} mise{success.updated > 1 ? 's' : ''} à jour
                  </p>
                )}
                {success.deleted > 0 && (
                  <p className="text-red-600">
                    ✗ {success.deleted} supprimée{success.deleted > 1 ? 's' : ''}
                  </p>
                )}
                {success.unchanged > 0 && (
                  <p className="text-gray-500">
                    = {success.unchanged} inchangée{success.unchanged > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Les événements sont maintenant visibles dans votre calendrier Outlook.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          {!success ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                disabled={isExporting}
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-medium text-white bg-finixar-brand-blue hover:bg-finixar-brand-blue-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Exporter
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-finixar-brand-blue hover:bg-finixar-brand-blue-dark rounded-lg transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
