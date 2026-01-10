// Gestion des profils de format pour l'import de registre des titres
// Accessible uniquement aux super admins

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react';
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

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData(): Promise<void> {
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
  }

  function showAlert(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): void {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
  }

  function viewProfile(profile: FormatProfile): void {
    setSelectedProfile(profile);
    setShowViewModal(true);
  }

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profils de Format</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Gérez les profils de format pour l'import de registre des titres par société
          </p>
        </div>
        <button
          onClick={() =>
            showAlert(
              'Fonctionnalité à venir',
              "La création de nouveaux profils via l'interface sera disponible prochainement. Pour l'instant, utilisez directement la base de données.",
              'info'
            )
          }
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nouveau Profil
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Profils</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{profiles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Profils Actifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profiles.filter(p => p.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Profils Personnalisés</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profiles.filter(p => !p.is_standard).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des profils */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dernière MAJ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Aucun profil de format</p>
                  </td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr
                    key={profile.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet
                          className={`w-5 h-5 ${profile.is_standard ? 'text-blue-600' : 'text-purple-600'}`}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile.profile_name}
                          </p>
                          {profile.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {profile.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile.is_standard ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Format Standard
                        </span>
                      ) : profile.organizations ? (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {profile.organizations.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      v{profile.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewProfile(profile)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        title="Voir les détails"
                      >
                        <Eye className="w-5 h-5" />
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
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mr-3"
                            title="Modifier"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              showAlert(
                                'Suppression impossible',
                                "La suppression de profils n'est pas encore implémentée. Contactez le support.",
                                'warning'
                              )
                            }
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
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
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* En-tête */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedProfile.profile_name}
                    </h2>
                    {selectedProfile.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedProfile.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Société</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedProfile.is_standard
                          ? 'Format Standard'
                          : selectedProfile.organizations?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Version</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        v{selectedProfile.version}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedProfile.is_active ? '✅ Actif' : '❌ Inactif'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dernière MAJ</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedProfile.updated_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration JSON */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Configuration du format
                  </h3>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200">
                    {JSON.stringify(selectedProfile.format_config, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Pied de page */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
