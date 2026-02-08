import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Sidebar } from '../layouts/Sidebar';
import { ArrowLeft, Upload, Download, Layers, AlertCircle, X, FileText } from 'lucide-react';
import { FileUpload } from '../investors/FileUpload';

interface Tranche {
  id: string;
  tranche_name: string;
  frequence: string;
  taux_interet: number;
  maturite_mois: number;
  date_emission: string | null;
  date_echeance: string | null;
  cgp: string | null;
  created_at: string;
}

interface TranchesProps {
  projectId: string;
  projectName: string;
  organization: { id: string; name: string; role: string };
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export function Tranches({
  projectId,
  projectName,
  organization,
  onBack,
  onLogout,
  onNavigate,
}: TranchesProps): JSX.Element {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    stats?: Record<string, unknown>;
    errorFileUrl?: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchTranches = useCallback(async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase
      .from('tranches')
      .select('*')
      .eq('projet_id', projectId)
      .order('created_at', { ascending: false });

    setTranches((data || []) as unknown as Tranche[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void fetchTranches();
  }, [projectId, fetchTranches]);

  const downloadTemplate = (): void => {
    const headers = [
      'org_id',
      'Projet',
      'EMETTEUR',
      'Nom du représentant de la masse',
      'Mail représentant de la masse',
      'tranche_name',
      'Type de coupon',
      'Rendement estimé',
      'Maturité',
      "Date d'émission",
      'Date échéance projet',
      'CGP',
      'E-mail du CGP',
      'investor_type',
      'investisseur_nom',
      'Prénom du représentant légal',
      'Nom du représentant légal',
      'Nom de jeune fille du représentant légal',
      'Raison sociale',
      'N° SIREN',
      'Adresse du siège social',
      'E-mail du représentant légal',
      'Téléphone',
      'Résidence Fiscale 1 du représentant légal',
      'Date de souscription',
      'Quantité',
      'Montant',
    ];

    const example = [
      organization.id,
      projectName,
      'Exemple SA',
      'Jean Dupont',
      'jean.dupont@exemple.fr',
      'Tranche A',
      '6',
      '0.10',
      '24',
      '01012025',
      '01012027',
      'Cabinet CGP',
      'cgp@exemple.fr',
      'morale',
      '',
      '',
      'Marie Martin',
      '',
      'Investisseur SARL',
      '123456789',
      '123 rue de Paris, 75001 Paris',
      'marie.martin@investisseur.fr',
      '0612345678',
      'France',
      '15012025',
      '10',
      '10000',
    ];

    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modele_import_tranche.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('org_id', organization.id);
    formData.append('project_id', projectId);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-tranche`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: 'Import réussi',
          stats: result.stats,
          errorFileUrl: result.errorFileUrl,
        });
        fetchTranches();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de l'import",
        });
      }
    } catch {
      setUploadResult({
        success: false,
        message: 'Erreur de connexion au serveur',
      });
    }

    setUploading(false);
    e.target.value = '';
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) {
      return '-';
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const formatFrequence = (freq: string): string => {
    const map: Record<string, string> = {
      annuel: 'Annuel',
      semestriel: 'Semestriel',
      trimestriel: 'Trimestriel',
    };
    return map[freq] || freq;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        organization={organization}
        activePage="projects"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto ml-64">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux projets</span>
          </button>
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Tranches</h1>
                <p className="text-slate-600">{projectName}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Gérer les tranches</h2>
            <div className="flex gap-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Modèle CSV</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Importer CSV</span>
              </button>
            </div>
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-900 font-medium">Import en cours...</span>
              </div>
            </div>
          )}

          {uploadResult && (
            <div
              className={`${
                uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              } border rounded-lg p-4 mb-6`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`w-5 h-5 ${uploadResult.success ? 'text-finixar-green' : 'text-finixar-red'} flex-shrink-0 mt-0.5`}
                />
                <div className="flex-1">
                  <p
                    className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}
                  >
                    {uploadResult.message}
                  </p>
                  {uploadResult.stats && (
                    <div className="mt-2 text-sm text-slate-700">
                      <p>Lignes traitées: {(uploadResult.stats.processed as number) || 0}</p>
                      <p>
                        Souscriptions créées:{' '}
                        {(uploadResult.stats.subscriptionsCreated as number) || 0}
                      </p>
                      <p>Lignes rejetées: {(uploadResult.stats.rejected as number) || 0}</p>
                    </div>
                  )}
                  {uploadResult.errorFileUrl && (
                    <a
                      href={uploadResult.errorFileUrl}
                      download="erreurs.csv"
                      className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Télécharger le fichier d'erreurs
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : tranches.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune tranche</h3>
              <p className="text-slate-600 mb-4">
                Importez un fichier CSV pour créer votre première tranche
              </p>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger le modèle</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Fréquence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Taux
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Maturité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Émission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Échéance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                        CGP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tranches.map(tranche => (
                      <tr key={tranche.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{tranche.tranche_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {formatFrequence(tranche.frequence)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {tranche.taux_interet}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {tranche.maturite_mois} mois
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {formatDate(tranche.date_emission)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {formatDate(tranche.date_echeance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {tranche.cgp || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Importer des souscriptions CSV</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <FileUpload
                accept=".csv"
                disabled={uploading}
                onFileSelect={files => {
                  if (files && files.length > 0) {
                    handleFileUpload({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
                    setShowImportModal(false);
                  }
                }}
                label={uploading ? 'Import en cours...' : 'Sélectionner un fichier CSV'}
                description="Glissez-déposez votre fichier CSV ici ou cliquez pour sélectionner"
              />
            </div>

            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
