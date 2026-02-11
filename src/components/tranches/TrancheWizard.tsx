import { useState, useEffect, useRef } from 'react';
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
  Edit2,
  Lock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { FileUpload } from '../investors/FileUpload';
import { Tooltip } from '../common/Tooltip';
import { logger } from '../../utils/logger';
import { ImportPreviewModal } from './ImportPreviewModal';
import { TrancheEditPage } from './TrancheEditPage';
import { downloadRegistreTemplate } from '../../utils/excelExport';

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

interface InvestorPreview {
  nom: string;
  type: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface Souscription {
  id: string;
  investisseur_id: string;
  investisseur_nom: string;
  investisseur_type: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface SouscriptionData {
  id: string;
  investisseur_id: string;
  montant_investi: number;
  nombre_obligations: number;
  investisseurs: {
    nom_raison_sociale?: string;
    type?: string;
  };
}

interface InvestorDetails {
  id: string;
  nom_raison_sociale: string;
  type: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  investments: InvestmentSummary[];
  total_investments: number;
}

interface InvestmentSummary {
  tranche_id: string;
  tranche_name: string;
  projet_name: string;
  montant_investi: number;
  nombre_obligations: number;
}

interface PreviewData {
  extracted_date_emission: string | null;
  tranche_name: string;
  taux_nominal: number;
  periodicite_coupons: string;
  duree_mois: number;
  investors_preview: InvestorPreview[];
  total_investors: number;
  total_souscriptions: number;
  total_montant: number;
  has_more: boolean;
}

interface TrancheWizardProps {
  onClose: () => void;
  onSuccess: (message?: string, projectId?: string) => void;
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
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const [tauxNominal, setTauxNominal] = useState<string>('');
  const [dateEmission, setDateEmission] = useState('');
  const [dureeMois, setDureeMois] = useState<string>('');
  const [periodiciteCoupons, setPeriodiciteCoupons] = useState<string>('');

  // For editing subscriptions in edit mode
  const [souscriptions, setSouscriptions] = useState<Souscription[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [loadingSouscriptions, setLoadingSouscriptions] = useState(false);
  const [valeurNominale, setValeurNominale] = useState<number>(100);

  // For investor details modal
  const [selectedInvestorDetails, setSelectedInvestorDetails] = useState<InvestorDetails | null>(
    null
  );

  // For reassigning subscriptions
  const [reassigningSouscriptionId, setReassigningSouscriptionId] = useState<string | null>(null);
  const [availableInvestors, setAvailableInvestors] = useState<
    Array<{ id: string; nom_raison_sociale: string; type: string }>
  >([]);
  const [searchInvestorQuery, setSearchInvestorQuery] = useState('');

  // Refs for auto-scroll
  const fileConfirmRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll helper
  const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current && scrollContainerRef.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (preselectedProjectId) {
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  // Auto-scroll to progress bar when processing starts
  useEffect(() => {
    if (processing && !isEditMode) {
      scrollToElement(progressRef);
    }
  }, [processing, isEditMode]);

  // Auto-scroll to error when it appears
  useEffect(() => {
    if (error) {
      scrollToElement(errorRef);
    }
  }, [error]);

  useEffect(() => {
    if (editingTranche && isEditMode) {
      logger.debug('Mode édition activé avec:', editingTranche);
      setSelectedProjectId(editingTranche.projet_id);
      setTrancheName(editingTranche.tranche_name);
      setDateEmission(editingTranche.date_emission || '');
      fetchSouscriptions(editingTranche.id);

      // Fetch project data to populate inherited fields
      const fetchProjectData = async (): Promise<void> => {
        const { data: project } = await supabase
          .from('projets')
          .select('taux_nominal, periodicite_coupons, duree_mois, valeur_nominale')
          .eq('id', editingTranche.projet_id)
          .single();

        if (project) {
          if (project.taux_nominal) {
            setTauxNominal(project.taux_nominal.toString());
          }
          if (project.periodicite_coupons) {
            setPeriodiciteCoupons(project.periodicite_coupons);
          }
          if (project.duree_mois) {
            setDureeMois(project.duree_mois.toString());
          }
          if (project.valeur_nominale) {
            setValeurNominale(project.valeur_nominale);
          }
        }
      };

      fetchProjectData();
    }
  }, [editingTranche, isEditMode]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !processing) {
        logger.debug('ESC pressed in TrancheWizard');
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose, processing]);

  const fetchProjects = async (): Promise<void> => {
    setLoading(true);
    const { data } = await supabase
      .from('projets')
      .select('id, projet')
      .order('created_at', { ascending: false });
    setProjects(data || []);
    setLoading(false);
  };

  const fetchSouscriptions = async (trancheId: string): Promise<void> => {
    setLoadingSouscriptions(true);
    setError(''); // Clear previous errors
    try {
      logger.info('Fetching souscriptions for tranche', { trancheId });

      const { data, error } = await supabase
        .from('souscriptions')
        .select(
          `
          id,
          investisseur_id,
          montant_investi,
          nombre_obligations,
          investisseurs (
            *
          )
        `
        )
        .eq('tranche_id', trancheId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error(new Error('Erreur lors du chargement des souscriptions'), {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
        setError(`Impossible de charger les souscriptions: ${error.message}`);
        return;
      }

      logger.debug('Souscriptions data received', { data, count: data?.length });

      if (!data || data.length === 0) {
        logger.info('No souscriptions found for this tranche');
        setSouscriptions([]);
        setLoadingSouscriptions(false);
        return;
      }

      const formattedSouscriptions: Souscription[] = (data || [])
        .filter((s: SouscriptionData) => {
          if (!s.investisseurs) {
            logger.warn('Souscription without investisseur data', { souscription: s });
            return false;
          }
          return true;
        })
        .map((s: SouscriptionData) => {
          const inv = s.investisseurs;
          logger.debug('Processing souscription investisseur', { investisseur: inv });

          const nom = inv.nom_raison_sociale || 'Nom manquant';

          return {
            id: s.id,
            investisseur_id: s.investisseur_id,
            investisseur_nom: nom,
            investisseur_type: inv.type || 'physique',
            montant_investi: s.montant_investi,
            nombre_obligations: s.nombre_obligations,
          };
        });

      setSouscriptions(formattedSouscriptions);
      logger.info('Souscriptions chargées', { count: formattedSouscriptions.length });
    } catch (err) {
      logger.error(new Error('Erreur lors du chargement des souscriptions'), { error: err });
      setError(
        `Impossible de charger les souscriptions: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setLoadingSouscriptions(false);
    }
  };

  const fetchInvestorDetails = async (investorId: string): Promise<void> => {
    try {
      // Fetch investor info
      const { data: investor, error: investorError } = await supabase
        .from('investisseurs')
        .select('id, nom_raison_sociale, type, email, telephone, adresse')
        .eq('id', investorId)
        .single();

      if (investorError) {
        throw investorError;
      }

      // Fetch all investments for this investor
      const { data: investments, error: investmentsError } = await supabase
        .from('souscriptions')
        .select(
          `
          montant_investi,
          nombre_obligations,
          tranches!inner (
            id,
            tranche_name,
            projets!inner (
              projet
            )
          )
        `
        )
        .eq('investisseur_id', investorId);

      if (investmentsError) {
        throw investmentsError;
      }

      const investmentsSummary: InvestmentSummary[] = (investments || []).map(
        (inv: {
          montant_investi: number;
          nombre_obligations: number;
          tranches: {
            id: string;
            tranche_name: string;
            projets: { projet: string };
          };
        }) => ({
          tranche_id: inv.tranches.id,
          tranche_name: inv.tranches.tranche_name,
          projet_name: inv.tranches.projets.projet,
          montant_investi: inv.montant_investi,
          nombre_obligations: inv.nombre_obligations,
        })
      );

      setSelectedInvestorDetails({
        id: investor.id,
        nom_raison_sociale: investor.nom_raison_sociale || '',
        type: investor.type || 'physique',
        email: investor.email || '',
        telephone: investor.telephone || '',
        adresse: investor.adresse || '',
        investments: investmentsSummary,
        total_investments: investmentsSummary.length,
      });
    } catch (err) {
      logger.error(new Error("Erreur lors du chargement des détails de l'investisseur"), {
        error: err,
      });
      setError("Impossible de charger les détails de l'investisseur");
    }
  };

  const fetchAvailableInvestors = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('investisseurs')
        .select('id, nom_raison_sociale, type')
        .order('nom_raison_sociale', { ascending: true })
        .limit(100);

      if (error) {
        throw error;
      }
      setAvailableInvestors(data || []);
    } catch (err) {
      logger.error(new Error('Erreur lors du chargement des investisseurs'), { error: err });
    }
  };

  const handleReassignSouscription = async (
    souscriptionId: string,
    newInvestorId: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({ investisseur_id: newInvestorId })
        .eq('id', souscriptionId);

      if (error) {
        throw error;
      }

      logger.info('Souscription réassignée', { souscriptionId, newInvestorId });

      // Refresh subscriptions list
      if (editingTranche) {
        await fetchSouscriptions(editingTranche.id);
      }

      setReassigningSouscriptionId(null);
      setSearchInvestorQuery('');
    } catch (err) {
      logger.error(new Error('Erreur lors de la réassignation de la souscription'), { error: err });
      setError('Impossible de réassigner la souscription');
    }
  };

  const getSuggestedTrancheName = async (projectId: string): Promise<string> => {
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

  const handleProjectSelect = async (projectId: string): Promise<void> => {
    setSelectedProjectId(projectId);
    if (!isEditMode) {
      const suggested = await getSuggestedTrancheName(projectId);
      setSuggestedName(suggested);
      setTrancheName(suggested);

      // Fetch project financial data to auto-populate tranche fields
      const { data: project } = await supabase
        .from('projets')
        .select('taux_nominal, duree_mois, valeur_nominale')
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
        if (project.valeur_nominale) {
          setValeurNominale(project.valeur_nominale);
        }
      }
    }
  };

  const handleRemoveFile = (): void => {
    setCsvFile(null);
    setError('');
  };

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const handleSouscriptionEdit = (
    index: number,
    field: 'montant_investi' | 'nombre_obligations',
    value: number
  ): void => {
    const updated = [...souscriptions];
    const vn = valeurNominale || 100;
    if (field === 'montant_investi') {
      updated[index] = {
        ...updated[index],
        montant_investi: value,
        nombre_obligations: vn > 0 ? Math.round(value / vn) : 0,
      };
    } else {
      updated[index] = {
        ...updated[index],
        nombre_obligations: value,
        montant_investi: value * vn,
      };
    }
    setSouscriptions(updated);
  };

  const saveSouscriptionEdit = async (index: number): Promise<void> => {
    const souscription = souscriptions[index];
    try {
      const { error } = await supabase
        .from('souscriptions')
        .update({
          montant_investi: souscription.montant_investi,
          nombre_obligations: souscription.nombre_obligations,
        })
        .eq('id', souscription.id);

      if (error) {
        throw error;
      }

      logger.info('Souscription mise à jour', { id: souscription.id });
      setEditingRow(null);
    } catch (err) {
      logger.error(new Error('Erreur lors de la mise à jour de la souscription'), { error: err });
      setError('Impossible de mettre à jour la souscription');
    }
  };

  const handleUpdateTranche = async (): Promise<void> => {
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

    try {
      logger.info('Mise à jour tranche', {
        trancheId: editingTranche.id,
        data: {
          tranche_name: trancheName,
          date_emission: dateEmission || null,
        },
      });

      const { error: updateError } = await supabase
        .from('tranches')
        .update({
          tranche_name: trancheName,
          date_emission: dateEmission || null,
          // taux_nominal, duree_mois, periodicite_coupons are inherited from project - not updated
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
          onSuccess(successMsg, editingTranche.projet_id);
        } else {
          logger.warn('Écheancier non régénéré:', regenerateResult.error);
          const successMsg =
            `Tranche mise à jour avec succès!\n` +
            `Note: ${regenerateResult.error || 'Écheancier non généré (paramètres manquants)'}`;

          onClose();
          onSuccess(successMsg, editingTranche.projet_id);
        }
      } catch (regenerateError: unknown) {
        logger.error(new Error('Erreur régénération écheancier'), { error: regenerateError });
        const successMsg =
          `Tranche mise à jour avec succès!\n` +
          `Note: Impossible de régénérer l'écheancier automatiquement.`;

        onClose();
        onSuccess(successMsg, editingTranche.projet_id);
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
    setProgress(0);
    setIsProcessingOnServer(false);

    try {
      logger.info('Demande aperçu import', {
        projectId: selectedProjectId,
        trancheName,
        fileName: csvFile.name,
      });

      const form = new FormData();
      form.append('projet_id', selectedProjectId);
      form.append('tranche_name', trancheName);
      form.append('file', csvFile, csvFile.name);
      form.append('preview_mode', 'true'); // Request preview

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
            logger.info('Aperçu reçu', { result });

            if (result.success && result.preview && result.data) {
              // Show preview modal
              setPreviewData(result.data);
            } else {
              setError(result.error || "Erreur lors de la génération de l'aperçu");
            }
          } else {
            let errorMsg = `Erreur serveur (${xhr.status})`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg = errorResponse.error || errorMsg;
            } catch (_e) {
              errorMsg += `: ${xhr.responseText}`;
            }
            logger.error(new Error(`Erreur HTTP ${xhr.status}`), { response: xhr.responseText });
            setError(errorMsg);
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

  const handleBackToUpload = (): void => {
    setPreviewData(null);
    // Keep the file so user doesn't have to re-upload
    setError('');
  };

  const handleConfirmImport = async (
    finalDateEmission: string | null,
    editedInvestors: Array<{
      nom: string;
      type: string;
      montant_investi: number;
      nombre_obligations: number;
      index: number;
    }>
  ): Promise<void> => {
    if (!selectedProjectId || !trancheName || !csvFile) {
      return;
    }

    setProcessing(true);
    setError('');
    setProgress(0);
    setIsProcessingOnServer(false);

    try {
      logger.info('Confirmation import', {
        projectId: selectedProjectId,
        trancheName,
        fileName: csvFile.name,
        finalDateEmission,
        editedInvestorsCount: editedInvestors.length,
      });

      const form = new FormData();
      form.append('projet_id', selectedProjectId);
      form.append('tranche_name', trancheName);
      form.append('file', csvFile, csvFile.name);
      // preview_mode not set = actual import

      // Add tranche metadata
      if (tauxNominal) {
        form.append('taux_nominal', tauxNominal);
      }
      // Use the edited date from preview modal
      if (finalDateEmission) {
        form.append('date_emission', finalDateEmission);
      } else if (dateEmission) {
        form.append('date_emission', dateEmission);
      }
      if (dureeMois) {
        form.append('duree_mois', dureeMois);
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-registre`;

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
              const successMsg = `${result.createdSouscriptions} souscription${result.createdSouscriptions > 1 ? 's' : ''} importée${result.createdSouscriptions > 1 ? 's' : ''}`;

              setPreviewData(null); // Close preview modal
              onClose();
              onSuccess(successMsg, selectedProjectId);

              if (result.errors && result.errors.length > 0) {
                logger.warn("Erreurs d'import", { errors: result.errors });
              }
            } else if (result.success && result.createdSouscriptions === 0) {
              setError("Aucune souscription n'a été créée. Vérifiez le format du CSV.");
              setPreviewData(null);
              logger.error(new Error('Import terminé mais 0 souscriptions créées'), { result });
            } else {
              setError(result.error || "Erreur lors de l'import");
              setPreviewData(null);
            }
          } else {
            let errorMsg = `Erreur serveur (${xhr.status})`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMsg = errorResponse.error || errorMsg;
            } catch (_e) {
              errorMsg += `: ${xhr.responseText}`;
            }
            logger.error(new Error(`Erreur HTTP ${xhr.status}`), { response: xhr.responseText });
            setError(errorMsg);
            setPreviewData(null);
          }
        } catch (parseErr) {
          logger.error(new Error('Erreur de parsing de la réponse'), { error: parseErr });
          setError('Réponse invalide du serveur');
          setPreviewData(null);
        }
      };

      xhr.onerror = () => {
        setProcessing(false);
        logger.error(new Error('Erreur réseau XHR'));
        setError("Erreur réseau pendant l'upload");
        setPreviewData(null);
      };

      xhr.send(form);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'import";
      logger.error(err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
      setProcessing(false);
      setPreviewData(null);
    }
  };

  // Use full-page edit view for edit mode
  if (isEditMode && editingTranche) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <TrancheEditPage {...({ tranche: editingTranche, onClose, onSuccess } as any)} />;
  }

  // Modal view for create mode
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
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
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
                {/* Date d'émission - EDITABLE */}
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

                {/* Inherited fields from project - READ ONLY */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-2">
                    Paramètres hérités du projet (non modifiables)
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Taux Nominal</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {tauxNominal ? `${tauxNominal}%` : 'Non défini'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Durée</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {dureeMois ? `${dureeMois} mois` : 'Non défini'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Périodicité</p>
                      <p className="text-sm font-semibold text-slate-900 capitalize">
                        {periodiciteCoupons || 'Non défini'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Souscriptions - EDITABLE */}
                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="p-5 border-b border-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-blue-600" />
                      Souscriptions ({souscriptions.length})
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Cliquez sur une ligne pour modifier le <strong>montant</strong> ou le{' '}
                      <strong>nombre d'obligations</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Les informations investisseur (nom, type) sont des données maître -
                      modifiables via la gestion des investisseurs
                    </p>
                  </div>

                  {loadingSouscriptions ? (
                    <div className="p-8 text-center">
                      <Loader className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">Chargement des souscriptions...</p>
                    </div>
                  ) : souscriptions.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Aucune souscription trouvée</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Investisseur
                              </div>
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Type
                              </div>
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-1">
                                <Edit2 className="w-3 h-3" />
                                Montant
                              </div>
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-1">
                                <Edit2 className="w-3 h-3" />
                                Titres
                              </div>
                            </th>
                            <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {souscriptions.map((souscription, index) => (
                            <tr
                              key={souscription.id}
                              className={`hover:bg-slate-50 transition-colors ${editingRow === index ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-5 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <button
                                    onClick={() =>
                                      fetchInvestorDetails(souscription.investisseur_id)
                                    }
                                    className="font-medium text-slate-900 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                    title="Voir les détails de l'investisseur"
                                  >
                                    <span>{souscription.investisseur_nom}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      souscription.investisseur_type === 'physique'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {souscription.investisseur_type === 'physique'
                                      ? 'Physique'
                                      : 'Morale'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-sm text-right">
                                {editingRow === index ? (
                                  <input
                                    type="number"
                                    value={souscription.montant_investi}
                                    onChange={e =>
                                      handleSouscriptionEdit(
                                        index,
                                        'montant_investi',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    disabled={processing}
                                    className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingRow(index)}
                                    disabled={processing}
                                    className="text-left w-full hover:text-blue-600 font-medium text-slate-900"
                                  >
                                    {formatCurrency(souscription.montant_investi)}
                                  </button>
                                )}
                              </td>
                              <td className="px-5 py-3 text-sm text-right">
                                {editingRow === index ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <input
                                      type="number"
                                      value={souscription.nombre_obligations}
                                      onChange={e =>
                                        handleSouscriptionEdit(
                                          index,
                                          'nombre_obligations',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      disabled={processing}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                    />
                                    <button
                                      onClick={() => saveSouscriptionEdit(index)}
                                      disabled={processing}
                                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                    >
                                      ✓
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-600">
                                    {souscription.nombre_obligations}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-sm text-center">
                                <button
                                  onClick={() => {
                                    setReassigningSouscriptionId(souscription.id);
                                    fetchAvailableInvestors();
                                  }}
                                  disabled={processing}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                  title="Réassigner à un autre investisseur"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Réassigner
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                      <button
                        type="button"
                        onClick={() => downloadRegistreTemplate()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger le modèle Excel
                      </button>
                    </div>
                  </div>
                </div>

                <FileUpload
                  accept=".csv,.xlsx,.xls"
                  onFileSelect={files => {
                    if (files && files.length > 0) {
                      setCsvFile(files[0]);
                      setError('');
                      // Auto-scroll to file confirmation
                      setTimeout(() => scrollToElement(fileConfirmRef), 150);
                    }
                  }}
                  label="Sélectionner le fichier (CSV ou Excel)"
                  description="Le fichier sera importé automatiquement"
                />
                {csvFile && (
                  <div
                    ref={fileConfirmRef}
                    className="mt-4 flex items-center justify-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
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
              <div ref={progressRef} className="space-y-2">
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
              <div ref={errorRef} className="p-4 bg-red-50 border border-red-200 rounded-lg">
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

      {/* Preview Modal */}
      {previewData && (
        <ImportPreviewModal
          previewData={previewData}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewData(null)}
          onBack={handleBackToUpload}
          isProcessing={processing}
          valeurNominale={valeurNominale}
        />
      )}

      {/* Investor Details Modal */}
      {selectedInvestorDetails && (
        <div className="fixed inset-0 z-[80] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Détails de l'investisseur</h3>
                    <p className="text-purple-100 text-sm">
                      {selectedInvestorDetails.total_investments} investissement(s)
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvestorDetails(null)}
                    className="text-white hover:text-purple-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                {/* Investor Info */}
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Informations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Nom / Raison sociale</p>
                      <p className="font-semibold text-slate-900">
                        {selectedInvestorDetails.nom_raison_sociale}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Type</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedInvestorDetails.type === 'physique'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {selectedInvestorDetails.type === 'physique' ? 'Physique' : 'Morale'}
                      </span>
                    </div>
                    {selectedInvestorDetails.email && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">E-mail</p>
                        <p className="text-sm text-slate-900">{selectedInvestorDetails.email}</p>
                      </div>
                    )}
                    {selectedInvestorDetails.telephone && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Téléphone</p>
                        <p className="text-sm text-slate-900">
                          {selectedInvestorDetails.telephone}
                        </p>
                      </div>
                    )}
                    {selectedInvestorDetails.adresse && (
                      <div className="col-span-2">
                        <p className="text-sm text-slate-600 mb-1">Adresse</p>
                        <p className="text-sm text-slate-900">{selectedInvestorDetails.adresse}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Investments List */}
                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="p-5 border-b border-slate-200">
                    <h4 className="text-lg font-semibold text-slate-900">
                      Tous les investissements ({selectedInvestorDetails.total_investments})
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Projet
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                            Tranche
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                            Montant
                          </th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                            Titres
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedInvestorDetails.investments.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-sm text-slate-900">{inv.projet_name}</td>
                            <td className="px-5 py-3 text-sm text-slate-900">{inv.tranche_name}</td>
                            <td className="px-5 py-3 text-sm text-right font-medium">
                              {formatCurrency(inv.montant_investi)}
                            </td>
                            <td className="px-5 py-3 text-sm text-right text-slate-600">
                              {inv.nombre_obligations}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-white p-6 border-t border-slate-200">
                <button
                  onClick={() => setSelectedInvestorDetails(null)}
                  className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Subscription Modal */}
      {reassigningSouscriptionId && (
        <div className="fixed inset-0 z-[80] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">Réassigner la souscription</h3>
                    <p className="text-blue-100 text-sm">Sélectionnez un nouvel investisseur</p>
                  </div>
                  <button
                    onClick={() => {
                      setReassigningSouscriptionId(null);
                      setSearchInvestorQuery('');
                    }}
                    className="text-white hover:text-blue-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rechercher un investisseur
                  </label>
                  <input
                    type="text"
                    value={searchInvestorQuery}
                    onChange={e => setSearchInvestorQuery(e.target.value)}
                    placeholder="Nom ou raison sociale..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Investor List */}
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  {availableInvestors
                    .filter(inv =>
                      inv.nom_raison_sociale
                        .toLowerCase()
                        .includes(searchInvestorQuery.toLowerCase())
                    )
                    .map(investor => (
                      <button
                        key={investor.id}
                        onClick={() =>
                          handleReassignSouscription(reassigningSouscriptionId, investor.id)
                        }
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {investor.nom_raison_sociale}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                investor.type === 'physique'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {investor.type === 'physique' ? 'Physique' : 'Morale'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setReassigningSouscriptionId(null);
                    setSearchInvestorQuery('');
                  }}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrancheWizard;
