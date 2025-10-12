import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from './Sidebar';
import { ArrowLeft, Upload, Download, Layers, AlertCircle } from 'lucide-react';

interface Tranche {
  id: string;
  tranche_name: string;
  frequence: string;
  taux_interet: string;
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

export function Tranches({ projectId, projectName, organization, onBack, onLogout, onNavigate }: TranchesProps) {
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    stats?: any;
    errorFileUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetchTranches();
  }, [projectId]);

  const fetchTranches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tranches')
      .select('*')
      .eq('projet_id', projectId)
      .order('created_at', { ascending: false });

    setTranches(data || []);
    setLoading(false);
  };

  const downloadTemplate = () => {
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
      'Date d\'émission',
      'Date échéance projet',
      'CGP',
      'Email du CGP',
      'investor_type',
      'investisseur_nom',
      'Prénom du représentant légal',
      'Nom du représentant légal',
      'Nom de jeune fille du représentant légal',
      'Raison sociale',
      'N° SIREN',
      'Adresse du siège social',
      'Email du représentant légal',
      'Téléphone',
      'Résidence Fiscale 1 du représentant légal',
      'Date de souscription',
      'Quantité',
      'Montant',
    ];

    const example = [
      organizationId,
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
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `modele_import_tranche.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          message: result.error || 'Erreur lors de l\'import',
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Erreur de connexion au serveur',
      });
    }

    setUploading(false);
    e.target.value = '';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const formatFrequence = (freq: string) => {
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux projets</span>
          </button>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Tranches</h1>
            <p className="text-slate-600 mt-1">{projectName}</p>
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
            <label className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Importer CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
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
                className={`w-5 h-5 ${uploadResult.success ? 'text-green-600' : 'text-red-600'} flex-shrink-0 mt-0.5`}
              />
              <div className="flex-1">
                <p
                  className={`font-medium ${uploadResult.success ? 'text-green-900' : 'text-red-900'}`}
                >
                  {uploadResult.message}
                </p>
                {uploadResult.stats && (
                  <div className="mt-2 text-sm text-slate-700">
                    <p>Lignes traitées: {uploadResult.stats.processed || 0}</p>
                    <p>Souscriptions créées: {uploadResult.stats.subscriptionsCreated || 0}</p>
                    <p>Lignes rejetées: {uploadResult.stats.rejected || 0}</p>
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
                  {tranches.map((tranche) => (
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
    </div>
  );
}
