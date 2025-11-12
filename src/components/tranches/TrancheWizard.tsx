import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { X, CheckCircle, AlertCircle, Loader, Edit, Trash2 } from "lucide-react";
import { FileUpload } from "../investors/FileUpload";

interface Project {
  id: string;
  projet: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
  taux_nominal: number | null;
  periodicite_coupons: string | null;
  date_emission: string | null;
  date_echeance_finale: string | null;
  duree_mois: number | null;
  projet_id: string;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
  editingTranche?: Tranche | null;
  isEditMode?: boolean;
}

export function TrancheWizard({
  onClose,
  onSuccess,
  preselectedProjectId,
  editingTranche,
  isEditMode = false,
}: TrancheWizardProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [trancheName, setTrancheName] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [tauxNominal, setTauxNominal] = useState<string>("");
  const [periodiciteCoupons, setPeriodiciteCoupons] = useState("");
  const [dateEmission, setDateEmission] = useState("");
  const [dateEcheanceFinale, setDateEcheanceFinale] = useState("");
  const [dureeMois, setDureeMois] = useState<string>("");

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) setSelectedProjectId(preselectedProjectId);
  }, [preselectedProjectId]);

  useEffect(() => {
    if (editingTranche && isEditMode) {
      console.log("🎯 Mode édition activé avec:", editingTranche);
      setSelectedProjectId(editingTranche.projet_id);
      setTrancheName(editingTranche.tranche_name);
      setTauxNominal(editingTranche.taux_nominal?.toString() || "");
      setPeriodiciteCoupons(editingTranche.periodicite_coupons || "");
      setDateEmission(editingTranche.date_emission || "");
      setDateEcheanceFinale(editingTranche.date_echeance_finale || "");
      setDureeMois(editingTranche.duree_mois?.toString() || "");
    }
  }, [editingTranche, isEditMode]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        console.log('ESC pressed in TrancheWizard');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose, processing]);

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
    if (!isEditMode) {
      const suggested = await getSuggestedTrancheName(projectId);
      setSuggestedName(suggested);
      setTrancheName(suggested);

      // Fetch project financial data to auto-populate tranche fields
      const { data: project } = await supabase
        .from("projets")
        .select("taux_interet, periodicite_coupons, maturite_mois")
        .eq("id", projectId)
        .single();

      if (project) {
        console.log("Auto-populating from project:", project);
        if (project.taux_interet) setTauxNominal(project.taux_interet.toString());
        if (project.periodicite_coupons) setPeriodiciteCoupons(project.periodicite_coupons);
        if (project.maturite_mois) setDureeMois(project.maturite_mois.toString());
      }
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    setError("");
  };

  const handleUpdateTranche = async () => {
    if (!editingTranche || !trancheName) {
      setError("Veuillez remplir le nom de la tranche");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log("=== MISE À JOUR TRANCHE ===");
      console.log("Tranche ID:", editingTranche.id);
      console.log("Nouvelles données:", {
        tranche_name: trancheName,
        taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
        periodicite_coupons: periodiciteCoupons || null,
        date_emission: dateEmission || null,
        date_echeance_finale: dateEcheanceFinale || null,
        duree_mois: dureeMois ? parseInt(dureeMois) : null,
      });

      const { error: updateError } = await supabase
        .from("tranches")
        .update({
          tranche_name: trancheName,
          taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
          periodicite_coupons: periodiciteCoupons || null,
          date_emission: dateEmission || null,
          date_echeance_finale: dateEcheanceFinale || null,
          duree_mois: dureeMois ? parseInt(dureeMois) : null,
        } as never)
        .eq("id", editingTranche.id);

      if (updateError) throw updateError;

      setSuccessMessage("Tranche mise à jour avec succès");
      console.log("✅ Tranche mise à jour");

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error("=== ERREUR MISE À JOUR ===", err);
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (isEditMode && editingTranche) {
      await handleUpdateTranche();
      return;
    }

    if (!selectedProjectId || !trancheName || !csvFile) {
      setError("Veuillez remplir tous les champs requis");
      return;
    }

    setProcessing(true);
    setError("");
    setSuccessMessage("");
    setProgress(0);

    try {
      console.log("=== DÉBUT IMPORT ===");
      console.log("Projet ID:", selectedProjectId);
      console.log("Nom tranche:", trancheName);
      console.log("Fichier:", csvFile.name);

      const form = new FormData();
      form.append("projet_id", selectedProjectId);
      form.append("tranche_name", trancheName);
      form.append("file", csvFile, csvFile.name);

      // Add tranche metadata
      if (tauxNominal) form.append("taux_nominal", tauxNominal);
      if (periodiciteCoupons) form.append("periodicite_coupons", periodiciteCoupons);
      if (dateEmission) form.append("date_emission", dateEmission);
      if (dateEcheanceFinale) form.append("date_echeance_finale", dateEcheanceFinale);
      if (dureeMois) form.append("duree_mois", dureeMois);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-registre`;
      console.log("URL Edge Function:", url);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const p = Math.round((event.loaded / event.total) * 100);
          setProgress(p);
        }
      };

      xhr.onload = () => {
        setProcessing(false);
        console.log("=== RÉPONSE SERVEUR ===");
        console.log("Status:", xhr.status);
        console.log("Response:", xhr.responseText);

        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            console.log("Résultat parsé:", result);
            
            if (result.success && result.createdSouscriptions > 0) {
              setSuccessMessage(
                `Import terminé!\n` +
                `${result.createdSouscriptions || 0} souscriptions créées\n` +
                `${result.createdInvestisseurs || 0} nouveaux investisseurs\n` +
                `${result.updatedInvestisseurs || 0} investisseurs mis à jour`
              );

              if (result.errors && result.errors.length > 0) {
                console.warn("Erreurs d'import:", result.errors);
                setError(`${result.errors.length} ligne(s) en erreur (voir console)`);
              }
            } else if (result.success && result.createdSouscriptions === 0) {
              setError("Aucune souscription n'a été créée. Vérifiez le format du CSV.");
              console.error("Import terminé mais 0 souscriptions créées:", result);
            } else {
              setError(result.error || "Erreur lors de l'import");
            }
          } else {
            console.error("Erreur HTTP:", xhr.status, xhr.responseText);
            setError(`Erreur serveur (${xhr.status}): Voir la console pour plus de détails`);
          }
        } catch (parseErr) {
          console.error("Erreur de parsing de la réponse:", parseErr);
          setError("Réponse invalide du serveur");
        }
      };

      xhr.onerror = () => {
        setProcessing(false);
        console.error("Erreur réseau XHR");
        setError("Erreur réseau pendant l'upload");
      };

      xhr.send(form);

    } catch (err: any) {
      console.error("=== ERREUR GLOBALE ===", err);
      setError(err.message || "Erreur lors de l'import");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => !processing && onClose()}
      />
      
      {/* Conteneur centré */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal content */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isEditMode && <Edit className="w-5 h-5 text-blue-600" />}
              <h3 className="text-xl font-bold text-slate-900">
                {isEditMode ? "Modifier la Tranche" : "Nouvelle Tranche"}
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600" 
              disabled={processing}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
            {/* Project selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Projet <span className="text-finixar-red">*</span>
              </label>
              {loading ? (
                <div className="text-center py-4">
                  <Loader className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  disabled={processing || isEditMode}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue bg-white disabled:opacity-50 disabled:bg-slate-50"
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

            {/* Tranche name */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Nom de la tranche <span className="text-finixar-red">*</span>
              </label>
              {suggestedName && !isEditMode && (
                <p className="text-sm text-slate-600 mb-2">
                  Nom suggéré: <span className="font-medium">{suggestedName}</span>
                </p>
              )}
              <input
                type="text"
                value={trancheName}
                onChange={(e) => setTrancheName(e.target.value)}
                disabled={processing}
                placeholder="Ex: T1, Tranche A..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
              />
            </div>

            {/* Champs supplémentaires pour l'édition */}
            {isEditMode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Taux Nominal (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tauxNominal}
                      onChange={(e) => setTauxNominal(e.target.value)}
                      disabled={processing}
                      placeholder="Ex: 5.5"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Périodicité des Coupons
                    </label>
                    <select
                      value={periodiciteCoupons}
                      onChange={(e) => setPeriodiciteCoupons(e.target.value)}
                      disabled={processing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue bg-white disabled:opacity-50"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="mensuelle">Mensuelle</option>
                      <option value="trimestrielle">Trimestrielle</option>
                      <option value="semestrielle">Semestrielle</option>
                      <option value="annuelle">Annuelle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Date d'émission
                    </label>
                    <input
                      type="date"
                      value={dateEmission}
                      onChange={(e) => setDateEmission(e.target.value)}
                      disabled={processing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Date d'échéance finale
                    </label>
                    <input
                      type="date"
                      value={dateEcheanceFinale}
                      onChange={(e) => setDateEcheanceFinale(e.target.value)}
                      disabled={processing}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Durée (mois)
                  </label>
                  <input
                    type="number"
                    value={dureeMois}
                    onChange={(e) => setDureeMois(e.target.value)}
                    disabled={processing}
                    placeholder="Ex: 24"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                  />
                </div>
              </>
            )}

            {/* CSV/Excel upload */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Fichier du registre <span className="text-finixar-red">*</span>
                </label>
                <FileUpload
                  accept=".csv,.xlsx,.xls"
                  onFileSelect={(files) => {
                    if (files && files.length > 0) {
                      setCsvFile(files[0]);
                      setError("");
                    }
                  }}
                  label="Sélectionner le fichier (CSV ou Excel)"
                  description="Le fichier sera importé automatiquement"
                />
                {csvFile && (
                  <div className="mt-4 flex items-center justify-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium flex-1 text-left">
                      {csvFile.name}
                    </span>
                    <button
                      onClick={handleRemoveFile}
                      disabled={processing}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Supprimer le fichier"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            {processing && !isEditMode && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Upload en cours...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-finixar-action-process transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700 whitespace-pre-line">
                    {successMessage}
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200 flex gap-3">
            {successMessage ? (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                  navigate(`/projets/${selectedProjectId}`);
                }}
                className="w-full px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors"
              >
                Voir le projet
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  disabled={processing}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    processing ||
                    !trancheName ||
                    (isEditMode ? false : (!selectedProjectId || !csvFile))
                  }
                  className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {isEditMode ? "Mise à jour..." : `Import... ${progress}%`}
                    </>
                  ) : (
                    isEditMode ? "Mettre à jour" : "Créer et importer"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrancheWizard;