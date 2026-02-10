import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Database, Download, Trash2, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { logAuditEvent } from '../../utils/auditLogger';

export function DataPrivacySettings() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleExportData = async () => {
    setExporting(true);
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const { data, error: fnError } = await supabase.functions.invoke('export-user-data', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        throw fnError;
      }

      // Download the JSON data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finixar-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

      logAuditEvent({
        action: 'created',
        entityType: 'membre',
        description: 'Export des données personnelles (RGPD)',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER MON COMPTE') {
      setError('Tapez exactement "SUPPRIMER MON COMPTE" pour confirmer.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const { data, error: fnError } = await supabase.functions.invoke('delete-user-account', {
        body: { confirmation: deleteConfirmation },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        throw fnError;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">Mes données (RGPD)</h2>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Conformément au RGPD, vous pouvez exporter ou supprimer vos données
          personnelles.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Data Export */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Exporter mes données
            </h3>
            <p className="text-xs text-slate-600">
              Téléchargez une copie de toutes vos données personnelles au
              format JSON (droit à la portabilité — Article 20).
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex-shrink-0"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Export...
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                Exporté
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exporter
              </>
            )}
          </button>
        </div>

        <hr className="border-slate-200" />

        {/* Account Deletion */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-1">Supprimer mon compte</h3>
            <p className="text-xs text-slate-600">
              Suppression définitive de votre compte et de vos données personnelles
              (droit à l'effacement — Article 17). Les données
              financières soumises à obligation légale de conservation (10 ans)
              seront anonymisées.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200 text-sm font-medium flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteConfirmation('');
            setError('');
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Supprimer votre compte ?</h3>
              <p className="text-sm text-slate-600">
                Cette action est <strong>irréversible</strong>. Toutes vos données
                personnelles seront supprimées. Les données financières seront
                anonymisées conformément aux obligations légales.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tapez <strong className="text-red-700">SUPPRIMER MON COMPTE</strong> pour
                  confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="SUPPRIMER MON COMPTE"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmation !== 'SUPPRIMER MON COMPTE'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Supprimer définitivement
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
