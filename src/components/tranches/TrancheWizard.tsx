import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  Edit,
  Trash2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { FileUpload } from '../investors/FileUpload';
import { Tooltip } from '../common/Tooltip';
import { logger } from '../../utils/logger';

interface Project {
  id: string;
  projet: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
  taux_nominal: number | null;
  date_emission: string | null;
  duree_mois: number | null;
  periodicite_coupons: string | null;
  projet_id: string;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
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
}: TrancheWizardProps): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessingOnServer, setIsProcessingOnServer] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [trancheName, setTrancheName] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const [tauxNominal, setTauxNominal] = useState<string>('');
  const [dateEmission, setDateEmission] = useState('');
  const [dureeMois, setDureeMois] = useState<string>('');
  const [periodiciteCoupons, setPeriodiciteCoupons] = useState<string>('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  useEffect(() => {
    if (editingTranche && isEditMode) {
      logger.debug('Mode édition activé avec:', editingTranche);
      setSelectedProjectId(editingTranche.projet_id);
      setTrancheName(editingTranche.tranche_name);
      setTauxNominal(editingTranche.taux_nominal?.toString() || '');
      setDateEmission(editingTranche.date_emission || '');
      setDureeMois(editingTranche.duree_mois?.toString() || '');
      setPeriodiciteCoupons(editingTranche.periodicite_coupons || '');
    }
  }, [editingTranche, isEditMode]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        logger.debug('ESC pressed in TrancheWizard');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose, processing]);

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
    if (!isEditMode) {
      const suggested = await getSuggestedTrancheName(projectId);
      setSuggestedName(suggested);
      setTrancheName(suggested);

      // Fetch project financial data to auto-populate tranche fields
      const { data: project } = await supabase
        .from('projets')
        .select('taux_nominal, duree_mois')
        .eq('id', projectId)
        .single();

      if (project) {
        logger.debug('Auto-populating from project:', project);
        if (project.taux_nominal) {
          setTauxNominal(project.taux_nominal.toString());
        }
        if (project.duree_mois) {
          setDureeMois(project.duree_mois.toString());
        }
      }
    }
  };

  const handleRemoveFile = () => {
    setCsvFile(null);
    setError('');
  };

  const handleUpdateTranche = async () => {
    if (!editingTranche || !trancheName) {
      setError('Veuillez remplir le nom de la tranche');
      return;
    }

    // CRITICAL: Check if date_emission is being changed and if there are PAID payments
    if (dateEmission !== editingTranche.date_emission) {
      // Check for existing PAID payments via souscriptions
      const { data: souscriptions } = await supabase
        .from('souscriptions')
        .select('id')
        .eq('tranche_id', editingTranche.id);

      if (souscriptions && souscriptions.length > 0) {
        const subscriptionIds = souscriptions.map(s => s.id);

        const { data: paidEcheances } = await supabase
          .from('coupons_echeances')
          .select('id, statut, date_paiement')
          .in('souscription_id', subscriptionIds)
          .eq('statut', 'payé');

        if (paidEcheances && paidEcheances.length > 0) {
          setError(
            `ATTENTION: Impossible de modifier la date d'émission.\n\n` +
              `Cette tranche a ${paidEcheances.length} paiement(s) réellement effectué(s).\n` +
              `Modifier la date d'émission supprimerait tous les échéanciers existants et les paiements effectués seraient perdus.\n\n` +
              `Pour modifier la date d'émission, veuillez d'abord annuler les paiements effectués depuis l'écran de gestion des paiements.`
          );
          return;
        }
      }
    }

    setProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      logger.info('Mise à jour tranche', {
        trancheId: editingTranche.id,
        data: {
          tranche_name: trancheName,
          taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
          date_emission: dateEmission || null,
          duree_mois: dureeMois ? parseInt(dureeMois) : null,
          periodicite_coupons: periodiciteCoupons || null,
        },
      });

      const { error: updateError } = await supabase
        .from('tranches')
        .update({
          tranche_name: trancheName,
          taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
          date_emission: dateEmission || null,
          duree_mois: dureeMois ? parseInt(dureeMois) : null,
          periodicite_coupons: periodiciteCoupons || null,
        } as never)
        .eq('id', editingTranche.id);

      if (updateError) {
        throw updateError;
      }

      logger.info('Tranche mise à jour avec succès');

      // Call regenerate-echeancier to update payment schedule
      logger.info('Appel de regenerate-echeancier');
      try {
        // Use supabase.functions.invoke() for proper authentication handling
        const { data: regenerateResult, error: invokeError } = await supabase.functions.invoke(
          'regenerate-echeancier',
          {
            body: { tranche_id: editingTranche.id },
          }
        );

        if (invokeError) {
          logger.error(new Error("Erreur lors de l'invocation de regenerate-echeancier"), {
            error: invokeError,
          });
          throw invokeError;
        }

        if (regenerateResult.success) {
          logger.info('Écheancier régénéré avec succès');

          // Mark calendar exports as outdated for this tranche (safe - table might not exist yet)
          try {
            await supabase
              .from('calendar_exports')
              .update({ is_outdated: true })
              .eq('tranche_id', editingTranche.id);
          } catch (err) {
            // Ignore error if table doesn't exist yet
            logger.debug('Calendar exports table not available yet', { error: err });
          }

          const successMsg =
            `Tranche mise à jour avec succès!\n` +
            `Souscriptions recalculées: ${regenerateResult.updated_souscriptions}\n` +
            `Coupons créés: ${regenerateResult.created_coupons}`;

          onClose();
          onSuccess(successMsg);
        } else {
          logger.warn('Écheancier non régénéré:', regenerateResult.error);
          const successMsg =
            `Tranche mise à jour avec succès!\n` +
            `Note: ${regenerateResult.error || 'Écheancier non généré (paramètres manquants)'}`;

          onClose();
          onSuccess(successMsg);
        }
      } catch (regenerateError: unknown) {
        logger.error(new Error('Erreur régénération écheancier'), { error: regenerateError });
        const successMsg =
          `Tranche mise à jour avec succès!\n` +
          `Note: Impossible de régénérer l'écheancier automatiquement.`;

        onClose();
        onSuccess(successMsg);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      logger.error(err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (isEditMode && editingTranche) {
      await handleUpdateTranche();
      return;
    }

    if (!selectedProjectId || !trancheName || !csvFile) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccessMessage('');
    setProgress(0);
    setIsProcessingOnServer(false);

    try {
      logger.info('Début import', {
        projectId: selectedProjectId,
        trancheName,
        fileName: csvFile.name,
      });

      const form = new FormData();
      form.append('projet_id', selectedProjectId);
      form.append('tranche_name', trancheName);
      form.append('file', csvFile, csvFile.name);

      // Add tranche metadata
      if (tauxNominal) {
        form.append('taux_nominal', tauxNominal);
      }
      if (dateEmission) {
        form.append('date_emission', dateEmission);
      }
      if (dureeMois) {
        form.append('duree_mois', dureeMois);
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-registre`;
      logger.debug('URL Edge Function:', url);

      // Get the current session token for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const p = Math.round((event.loaded / event.total) * 100);
          setProgress(p);
          if (p === 100) {
            setIsProcessingOnServer(true);
          }
        }
      };

      xhr.onload = () => {
        setProcessing(false);
        logger.debug('Réponse serveur', { status: xhr.status });

        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            logger.info('Import terminé', { result });

            if (result.success && result.createdSouscriptions > 0) {
              const successMsg =
                `Import terminé!\n` +
                `${result.createdSouscriptions || 0} souscriptions créées\n` +
                `${result.createdInvestisseurs || 0} nouveaux investisseurs\n` +
                `${result.updatedInvestisseurs || 0} investisseurs mis à jour`;

              onClose();
              onSuccess(successMsg);

              if (result.errors && result.errors.length > 0) {
                logger.warn("Erreurs d'import", { errors: result.errors });
              }
            } else if (result.success && result.createdSouscriptions === 0) {
              setError("Aucune souscription n'a été créée. Vérifiez le format du CSV.");
              logger.error(new Error('Import terminé mais 0 souscriptions créées'), { result });
            } else {
              setError(result.error || "Erreur lors de l'import");
            }
          } else {
            logger.error(new Error(`Erreur HTTP ${xhr.status}`), { response: xhr.responseText });
            setError(`Erreur serveur (${xhr.status}): Voir la console pour plus de détails`);
          }
        } catch (parseErr) {
          logger.error(new Error('Erreur de parsing de la réponse'), { error: parseErr });
          setError('Réponse invalide du serveur');
        }
      };

      xhr.onerror = () => {
        setProcessing(false);
        logger.error(new Error('Erreur réseau XHR'));
        setError("Erreur réseau pendant l'upload");
      };

      xhr.send(form);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'import";
      logger.error(err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
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
                {isEditMode ? 'Modifier la tranche' : 'Nouvelle tranche'}
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
                  onChange={e => handleProjectSelect(e.target.value)}
                  disabled={processing || isEditMode}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue bg-white disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">Sélectionnez un projet</option>
                  {projects.map(project => (
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
                onChange={e => setTrancheName(e.target.value)}
                disabled={processing}
                placeholder="Ex: T1, Tranche A..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
              />
            </div>

            {/* Champs supplémentaires pour l'édition */}
            {isEditMode && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Taux Nominal (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tauxNominal}
                    onChange={e => setTauxNominal(e.target.value)}
                    disabled={processing}
                    placeholder="Ex: 5.5"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    value={dateEmission}
                    onChange={e => setDateEmission(e.target.value)}
                    disabled={processing}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Durée (mois)
                  </label>
                  <input
                    type="number"
                    value={dureeMois}
                    onChange={e => setDureeMois(e.target.value)}
                    disabled={processing}
                    placeholder="Ex: 24"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Périodicité des Coupons
                  </label>
                  <select
                    value={periodiciteCoupons}
                    onChange={e => setPeriodiciteCoupons(e.target.value)}
                    disabled={processing}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue disabled:opacity-50"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="mensuelle">Mensuelle</option>
                    <option value="trimestrielle">Trimestrielle</option>
                    <option value="semestrielle">Semestrielle</option>
                    <option value="annuelle">Annuelle</option>
                  </select>
                </div>
              </div>
            )}

            {/* CSV/Excel upload */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Fichier du registre <span className="text-finixar-red">*</span>
                </label>

                {/* Télécharger le modèle */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Format standard disponible
                      </p>
                      <p className="text-sm text-blue-700 mb-3">
                        Téléchargez notre modèle Excel pré-formaté avec validation intégrée pour
                        garantir un import sans erreur.
                      </p>
                      <a
                        href="/templates/Modele_Registre_Titres.xlsx"
                        download="Modele_Registre_Titres.xlsx"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger le modèle Excel
                      </a>
                    </div>
                  </div>
                </div>

                <FileUpload
                  accept=".csv,.xlsx,.xls"
                  onFileSelect={files => {
                    if (files && files.length > 0) {
                      setCsvFile(files[0]);
                      setError('');
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
                  <span>
                    {isProcessingOnServer ? (
                      <span className="flex items-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        Traitement sur le serveur...
                      </span>
                    ) : (
                      `Upload: ${progress}%`
                    )}
                  </span>
                  {!isProcessingOnServer && <span>{progress}%</span>}
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  {isProcessingOnServer ? (
                    <div className="h-2 bg-finixar-action-process animate-pulse w-full" />
                  ) : (
                    <div
                      className="h-2 bg-finixar-action-process transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 mb-2">{error}</p>
                    <button
                      onClick={() => {
                        setError('');
                        handleSubmit();
                      }}
                      className="text-sm font-medium text-red-700 hover:text-red-800 underline"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              disabled={processing}
            >
              Annuler
            </button>
            <Tooltip
              content={
                !trancheName
                  ? 'Le nom de la tranche est requis'
                  : !isEditMode && !selectedProjectId
                    ? 'Veuillez sélectionner un projet'
                    : !isEditMode && !csvFile
                      ? 'Veuillez sélectionner un fichier CSV/Excel'
                      : ''
              }
            >
              <button
                onClick={handleSubmit}
                disabled={
                  processing ||
                  !trancheName ||
                  (isEditMode ? false : !selectedProjectId || !csvFile)
                }
                className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {isEditMode ? 'Mise à jour...' : `Import... ${progress}%`}
                  </>
                ) : isEditMode ? (
                  'Mettre à jour'
                ) : (
                  'Créer et importer'
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrancheWizard;
