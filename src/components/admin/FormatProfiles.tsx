// Gestion des profils de format pour l'import de registre des titres
// Accessible uniquement aux super admins

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { FileSpreadsheet, Plus, Eye, Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { AlertModal } from '../common/Modals';

interface FormatProfile {
  id: string;
  company_id: string | null;
  profile_name: string;
  is_standard: boolean;
  is_active: boolean;
  version: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  format_config: Record<string, unknown>;
  organizations?: {
    name: string;
  };
}

export default function FormatProfiles(): JSX.Element {
  const [profiles, setProfiles] = useState<FormatProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<FormatProfile | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info'
    ): void => {
      setAlertConfig({ title, message, type });
      setShowAlertModal(true);
    },
    []
  );

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      // Charger les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('company_format_profiles')
        .select(
          `
          *,
          organizations (
            name
          )
        `
        )
        .order('is_standard', { ascending: false })
        .order('profile_name', { ascending: true });

      if (profilesError) {
        throw profilesError;
      }

      setProfiles(profilesData || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur chargement données:', error);
      showAlert('Erreur', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  function viewProfile(profile: FormatProfile): void {
    setSelectedProfile(profile);
    setShowViewModal(true);
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profils de Format</h1>
              <p className="text-slate-600">
                Gérez les profils de format pour l'import de registre des titres par société
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              showAlert(
                'Fonctionnalité à venir',
                "La création de nouveaux profils via l'interface sera disponible prochainement.",
                'info'
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau Profil
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Profils</p>
            <p className="text-2xl font-bold text-slate-900">{profiles.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Profils Actifs</p>
            <p className="text-2xl font-bold text-finixar-green">
              {profiles.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Profils Personnalisés</p>
            <p className="text-2xl font-bold text-purple-600">
              {profiles.filter(p => !p.is_standard).length}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des profils */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Profil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Dernière MAJ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600">Aucun profil de format</p>
                  </td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${profile.is_standard ? 'bg-blue-100' : 'bg-purple-100'}`}
                        >
                          <FileSpreadsheet
                            className={`w-5 h-5 ${profile.is_standard ? 'text-blue-600' : 'text-purple-600'}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{profile.profile_name}</p>
                          {profile.description && (
                            <p className="text-sm text-slate-600">{profile.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile.is_standard ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Format Standard
                        </span>
                      ) : profile.organizations ? (
                        <span className="text-sm text-slate-900">{profile.organizations.name}</span>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      v{profile.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewProfile(profile)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!profile.is_standard && (
                          <>
                            <button
                              onClick={() =>
                                showAlert(
                                  'Fonctionnalité à venir',
                                  "La modification de profils via l'interface sera disponible prochainement.",
                                  'info'
                                )
                              }
                              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                showAlert(
                                  'Suppression impossible',
                                  "La suppression de profils n'est pas encore implémentée.",
                                  'warning'
                                )
                              }
                              className="p-2 text-finixar-red hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de visualisation */}
      {showViewModal && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* En-tête */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedProfile.profile_name}
                    </h2>
                    {selectedProfile.description && (
                      <p className="text-sm text-slate-600">{selectedProfile.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Contenu */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Informations générales */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Société</p>
                      <p className="font-medium text-slate-900">
                        {selectedProfile.is_standard
                          ? 'Format Standard'
                          : selectedProfile.organizations?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Version</p>
                      <p className="font-medium text-slate-900">v{selectedProfile.version}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Statut</p>
                      <p className="font-medium text-slate-900">
                        {selectedProfile.is_active ? '✅ Actif' : '❌ Inactif'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Dernière MAJ</p>
                      <p className="font-medium text-slate-900">
                        {new Date(selectedProfile.updated_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration JSON */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">
                    Configuration du format
                  </h3>
                  <pre className="bg-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono text-slate-800">
                    {JSON.stringify(selectedProfile.format_config, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Pied de page */}
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'alerte */}
      {showAlertModal && (
        <AlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      )}
    </div>
  );
}
