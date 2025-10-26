import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { X, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { FileUpload } from "./FileUpload";

interface Project {
  id: string;
  projet: string;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
}

export function TrancheWizard({
  onClose,
  onSuccess,
  preselectedProjectId,
}: TrancheWizardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [trancheName, setTrancheName] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) setSelectedProjectId(preselectedProjectId);
  }, [preselectedProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projets")
      .select("id, projet")
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const getSuggestedTrancheName = async (projectId: string) => {
    const { data: project } = await supabase
      .from("projets")
      .select("projet")
      .eq("id", projectId)
      .single();

    const { count } = await supabase
      .from("tranches")
      .select("id", { count: "exact", head: true })
      .eq("projet_id", projectId);

    const trancheNumber = (count || 0) + 1;
    const projectName = project?.projet || "";
    return `${projectName} - T${trancheNumber}`;
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    const suggested = await getSuggestedTrancheName(projectId);
    setSuggestedName(suggested);
    setTrancheName(suggested);
  };

  const handleSubmit = async () => {
    if (!selectedProjectId || !trancheName || !csvFile) {
      setError("Veuillez remplir tous les champs requis");
      return;
    }

    setProcessing(true);
    setError("");
    setProgress(0);

    try {
      // Étape 1 : créer la tranche
      const { data: trancheData, error: trancheError } = await supabase
        .from("tranches")
        .insert({
          projet_id: selectedProjectId,
          tranche_name: trancheName,
        })
        .select()
        .single();

      if (trancheError) throw trancheError;
      if (!trancheData) throw new Error("Erreur lors de la création de la tranche");

      // Étape 2 : envoyer le fichier CSV à la fonction Edge
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-registre`;
      const form = new FormData();
      form.append("projet_id", trancheData.projet_id);
      form.append("tranche_id", trancheData.id);
      form.append("file", csvFile, csvFile.name);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = async () => {
        setProcessing(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log("✅ Import terminé :", result);
            alert(
              `✅ Import terminé : ${
                result.createdSouscriptions || 0
              } souscriptions créées`
            );
            onSuccess();
            onClose();
          } catch {
            alert("✅ Import terminé avec succès !");
            onSuccess();
            onClose();
          }
        } else {
          console.error("Erreur import registre:", xhr.responseText);
          alert("Erreur lors de l'import du registre CSV");
        }
      };

      xhr.onerror = () => {
        setProcessing(false);
        alert("Erreur réseau pendant l'import du CSV");
      };

      xhr.send(form);
    } catch (err: any) {
      console.error("Erreur création tranche ou import:", err);
      setError(err.message || "Erreur lors de la création");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-900">Nouvelle Tranche</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sélecteur projet */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Projet
            </label>
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

          {/* Nom tranche */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Nom de la tranche
            </label>
            {suggestedName && (
              <p className="text-sm text-slate-600 mb-2">
                Nom suggéré:{" "}
                <span className="font-medium">{suggestedName}</span>
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

          {/* Fichier CSV */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Fichier CSV des souscriptions
            </label>
            <FileUpload
              accept=".csv"
              onFileSelect={(files) => {
                if (files && files.length > 0) setCsvFile(files[0]);
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

          {/* Barre de progression */}
          {processing && (
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="h-3 bg-blue-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={processing}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing || !selectedProjectId || !trancheName || !csvFile}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Import en cours... {progress}%
              </>
            ) : (
              "Créer la tranche"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrancheWizard;
