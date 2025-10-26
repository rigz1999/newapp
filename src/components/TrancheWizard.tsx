import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { FileUpload } from './FileUpload';

interface Project {
  id: string;
  projet: string;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
}

export function TrancheWizard({ onClose, onSuccess, preselectedProjectId }: TrancheWizardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [trancheName, setTrancheName] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projets')
      .select('id, projet')
      .order('created_at', { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const getSuggestedTrancheName = async (projectId: string) => {
    const { data: project } = await supabase
      .from('projets')
      .select('projet')
      .eq('id', projectId)
      .single();

    const { count } = await supabase
      .from('tranches')
      .select('id', { count: 'exact', head: true })
      .eq('projet_id', projectId);

    const trancheNumber = (count || 0) + 1;
    const projectName = project?.projet || '';
    return `${projectName} - T${trancheNumber}`;
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    const suggested = await getSuggestedTrancheName(projectId);
    setSuggestedName(suggested);
    setTrancheName(suggested);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setCsvFile(file);
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedProjectId || !trancheName || !csvFile) {
      setError('Veuillez sélectionner un projet, nommer la tranche et ajouter un fichier CSV');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      // 1️⃣ Créer la tranche
      const { data: trancheData, error: trancheError } = await supabase
        .from('tranches')
        .insert({
          projet_id: selectedProjectId,
          tranche_name: trancheName,
        })
        .select()
        .single();

      if (trancheError || !trancheData) throw trancheError || new Error("Erreur de création de la tranche");

      // 2️⃣ Lancer l’import du registre via Edge Function
      setImporting(true);
      const form = new FormData();
      form.append('projet_id', selectedProjectId);
      form.append('tranche_id', trancheData.id);
      form.append('file', csvFile, csvFile.name);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-registre`;
      const res = await fetch(url, { method: 'POST', body: form });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Import échoué (${res.status})`);
      }

      const result = await res.json();

      const imported = result.createdSouscriptions ?? 0;
      const invCreated = result.createdInvestisseurs ?? result.createdInvestors ?? 0;

      setSuccessMessage(
        `✅ Import réussi : ${imported} souscription${imported > 1 ? 's' : ''} et ${invCreated} investisseur${invCreated > 1 ? 's' : ''} ajoutés.`
      );

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setImporting(false);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-900">Nouvelle Tranche</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Projet</label>
            {loading ? (
              <div className="text-center py-4">
                <Loader className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projet}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Nom de la tranche</label>
            {suggestedName && (
              <p className="text-sm text-slate-600 mb-2">
                Nom suggéré : <span className="font-medium">{suggestedName}</span>
              </p>
            )}
            <input
              type="text"
              value={trancheName}
              onChange={(e) => setTrancheName(e.target.value)}
              placeholder="Ex: T1, Tranche A..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Fichier CSV du registre</label>
            <FileUpload
              accept=".csv"
              onFileSelect={(files) => {
                if (files && files.length > 0) {
                  handleFileSelect({ target: { files } } as any);
                }
              }}
              label="Sélectionner un fichier CSV"
              description="Glissez-déposez votre fichier CSV ici ou cliquez pour sélectionner"
            />
            {csvFile && (
              <div className="mt-4 text-center">
                <div className="text-sm text-slate-600 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {csvFile.name}
                </div>
              </div>
            )}
          </div>

          {/* ÉTATS */}
          {importing && (
            <div className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-100 rounded-lg py-3">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Import du registre en cours...</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={processing || importing}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || importing || !selectedProjectId || !trancheName || !csvFile}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing || importing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {importing ? 'Import du registre...' : 'Création en cours...'}
              </>
            ) : (
              'Créer la tranche'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
