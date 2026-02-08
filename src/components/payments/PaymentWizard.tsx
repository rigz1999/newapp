import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  AlertTriangle,
  Upload,
  Trash2,
  Calendar,
  FolderOpen,
  BarChart3,
  Lock,
  Coins,
} from 'lucide-react';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';
import { isValidAmount } from '../../utils/validators';
import { logger } from '../../utils/logger';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { PaymentWizardHeader } from './wizard/PaymentWizardHeader';
import { PaymentProjectSelect } from './wizard/PaymentProjectSelect';
import { PaymentFileUpload as _PaymentFileUpload } from './wizard/PaymentFileUpload';
import { PaymentMatchCard as _PaymentMatchCard } from './wizard/PaymentMatchCard';
import type {
  Project,
  Tranche,
  Subscription,
  Echeance,
  EcheanceGroup,
  PaymentMatch,
  WizardStep,
} from './wizard/types';
import { IMAGE_PROCESSING, FILE_LIMITS } from '../../constants';

interface PaymentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
  preselectedTrancheId?: string;
  preselectedEcheanceDate?: string;
  showProjectName?: string;
  showTrancheName?: string;
}

export function PaymentWizard({
  onClose,
  onSuccess,
  preselectedProjectId,
  preselectedTrancheId,
  preselectedEcheanceDate,
  showProjectName,
  showTrancheName,
}: PaymentWizardProps) {
  const [_loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [echeanceGroups, setEcheanceGroups] = useState<EcheanceGroup[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTrancheId, setSelectedTrancheId] = useState('');
  const [selectedEcheanceDate, setSelectedEcheanceDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [matches, setMatches] = useState<PaymentMatch[]>([]);
  const [tempFileNames, setTempFileNames] = useState<string[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [displayProjectName, setDisplayProjectName] = useState(showProjectName || '');
  const [displayTrancheName, setDisplayTrancheName] = useState(showTrancheName || '');

  // Determine initial step based on preselected values
  const getInitialStep = (): WizardStep => {
    // Never start at 'upload' even if all values are preselected
    // Let the useEffect transition to 'upload' after data is loaded
    if (preselectedTrancheId && preselectedProjectId) {
      // Start at echeance step (will either show selection UI or loading state)
      return 'echeance';
    }
    return 'select';
  };

  const [step, setStep] = useState<WizardStep>(getInitialStep());

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If confirmation modal is open, close it first
        if (showConfirmModal) {
          setShowConfirmModal(false);
        } else {
          // Otherwise close the main modal
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showConfirmModal]);

  const handleBackToSelect = () => {
    // Go back one step at a time
    if (step === 'results') {
      setStep('upload');
      setMatches([]);
      setSelectedMatches(new Set());
    } else if (step === 'upload') {
      // Go back to écheance selection (unless it was preselected)
      if (preselectedEcheanceDate) {
        // Echeance was preselected, can't go back to it
        // Go back to select if tranche was also preselected
        if (preselectedTrancheId) {
          setStep('select');
        } else {
          setStep('echeance');
        }
      } else {
        setStep('echeance');
      }
      setFiles([]);
      setError('');
    } else if (step === 'echeance') {
      // Always go back to select when on echeance step
      setStep('select');
      setSelectedEcheanceDate('');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch project name if preselected but name not provided
  useEffect(() => {
    if (preselectedProjectId && !showProjectName) {
      const fetchProjectName = async () => {
        const { data } = await supabase
          .from('projets')
          .select('projet')
          .eq('id', preselectedProjectId)
          .single();
        if (data) {
          setDisplayProjectName(data.projet);
        }
      };
      fetchProjectName();
    }
  }, [preselectedProjectId, showProjectName]);

  // Fetch tranche name if preselected but name not provided
  useEffect(() => {
    if (preselectedTrancheId && !showTrancheName) {
      const fetchTrancheName = async () => {
        const { data } = await supabase
          .from('tranches')
          .select('tranche_name')
          .eq('id', preselectedTrancheId)
          .single();
        if (data) {
          setDisplayTrancheName(data.tranche_name);
        }
      };
      fetchTrancheName();
    }
  }, [preselectedTrancheId, showTrancheName]);

  // Pre-select values if provided (set immediately, don't wait for arrays to load)
  useEffect(() => {
    if (preselectedProjectId) {
      setSelectedProjectId(preselectedProjectId);
    }
  }, [preselectedProjectId]);

  useEffect(() => {
    if (preselectedTrancheId) {
      setSelectedTrancheId(preselectedTrancheId);
    }
  }, [preselectedTrancheId]);

  useEffect(() => {
    if (preselectedEcheanceDate) {
      setSelectedEcheanceDate(preselectedEcheanceDate);
    }
  }, [preselectedEcheanceDate]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTranches(selectedProjectId);
    } else {
      setTranches([]);
      // Don't clear selectedTrancheId if we have a preselected value
      if (!preselectedTrancheId) {
        setSelectedTrancheId('');
      }
    }
  }, [selectedProjectId, preselectedTrancheId]);

  useEffect(() => {
    if (selectedTrancheId) {
      fetchEcheances(selectedTrancheId);
      if (!preselectedEcheanceDate) {
        setStep('echeance');
      }
    } else {
      setEcheanceGroups([]);
      // Don't clear selectedEcheanceDate if we have a preselected value
      if (!preselectedEcheanceDate) {
        setSelectedEcheanceDate('');
      }
    }
  }, [selectedTrancheId, preselectedEcheanceDate]);

  useEffect(() => {
    if (selectedEcheanceDate && selectedTrancheId) {
      // Fetch subscriptions and then transition to upload step
      const loadAndTransition = async () => {
        await fetchSubscriptionsForEcheance(selectedTrancheId, selectedEcheanceDate);
        setStep('upload');
      };
      loadAndTransition();
    } else {
      setSubscriptions([]);
    }
  }, [selectedEcheanceDate, selectedTrancheId]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projets')
      .select('id, projet')
      .order('created_at', { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const fetchTranches = async (projectId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('tranches')
      .select('id, tranche_name')
      .eq('projet_id', projectId)
      .order('created_at', { ascending: false });

    setTranches(data || []);
    setLoading(false);
  };

  const fetchEcheances = async (trancheId: string) => {
    setLoading(true);
    try {
      // Get all subscriptions for this tranche
      const { data: subs } = await supabase
        .from('souscriptions')
        .select('id')
        .eq('tranche_id', trancheId);

      if (!subs || subs.length === 0) {
        setEcheanceGroups([]);
        setLoading(false);
        return;
      }

      const subscriptionIds = subs.map(s => s.id);

      // Get all échéances for these subscriptions
      const { data: echeances } = await supabase
        .from('coupons_echeances')
        .select('*')
        .in('souscription_id', subscriptionIds)
        .order('date_echeance', { ascending: true });

      if (!echeances || echeances.length === 0) {
        setEcheanceGroups([]);
        setLoading(false);
        return;
      }

      // Group by date
      const grouped = new Map<string, Echeance[]>();
      echeances.forEach((ech: Echeance) => {
        const existing = grouped.get(ech.date_echeance) || [];
        grouped.set(ech.date_echeance, [...existing, ech]);
      });

      // Create groups with status
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const groups: EcheanceGroup[] = Array.from(grouped.entries()).map(([date, echs]) => {
        const totalAmount = echs.reduce((sum, e) => sum + Number(e.montant_coupon), 0);
        const echeanceDate = new Date(date);
        echeanceDate.setHours(0, 0, 0, 0);

        const allPaid = echs.every(e => e.statut === 'paye');
        const isOverdue = echeanceDate < now;

        let statut: 'paye' | 'en_retard' | 'a_venir';
        let daysOverdue: number | undefined;

        if (allPaid) {
          statut = 'paye';
        } else if (isOverdue) {
          statut = 'en_retard';
          daysOverdue = Math.floor(
            (now.getTime() - echeanceDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        } else {
          statut = 'a_venir';
        }

        return {
          date,
          totalAmount,
          count: echs.length,
          statut,
          daysOverdue,
          echeances: echs,
        };
      });

      setEcheanceGroups(groups);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Error fetching écheances'), {
        error: err,
      });
      setEcheanceGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionsForEcheance = async (trancheId: string, echeanceDate: string) => {
    setLoading(true);
    try {
      // Get all subscriptions for this tranche
      const { data: subs } = await supabase
        .from('souscriptions')
        .select('id')
        .eq('tranche_id', trancheId);

      if (!subs || subs.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const subscriptionIds = subs.map(s => s.id);

      // Get échéances for this specific date
      const { data: echeances } = await supabase
        .from('coupons_echeances')
        .select(
          `
          id,
          souscription_id,
          montant_coupon,
          statut
        `
        )
        .in('souscription_id', subscriptionIds)
        .eq('date_echeance', echeanceDate);

      if (!echeances || echeances.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      // Get full subscription details
      const { data: fullSubs } = await supabase
        .from('souscriptions')
        .select(
          `
          id,
          investisseur_id,
          montant_investi,
          coupon_net,
          investisseur:investisseurs(nom_raison_sociale)
        `
        )
        .in(
          'id',
          echeances.map(e => e.souscription_id)
        );

      // Map échéance amounts to subscriptions
      const subsWithEcheanceAmounts = (fullSubs || []).map(sub => ({
        ...sub,
        coupon_net:
          echeances.find(e => e.souscription_id === sub.id)?.montant_coupon || sub.coupon_net,
      })) as Subscription[];

      setSubscriptions(subsWithEcheanceAmounts);
    } catch (err) {
      logger.error(
        err instanceof Error ? err : new Error('Error fetching subscriptions for échéance'),
        { error: err, trancheId, echeanceDate }
      );
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of selectedFiles) {
        const validation = validateFile(file, FILE_VALIDATION_PRESETS.documents);
        if (!validation.valid) {
          setError(validation.error || 'Fichier invalide');
          return;
        }
        validFiles.push(file);
      }

      // Upload files to temp storage
      const uploadedNames: string[] = [];
      try {
        for (const file of validFiles) {
          const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs-temp')
            .upload(tempFileName, file);

          if (uploadError) {
            logger.error(new Error('Error uploading to temp storage'), { error: uploadError });
            setError(
              `Erreur lors du téléchargement: ${uploadError.message || String(uploadError)}`
            );
            return;
          }

          uploadedNames.push(tempFileName);
        }

        setTempFileNames(uploadedNames);
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error('Error in file upload'), {
          error: err,
        });
        setError(
          `Erreur lors du téléchargement: ${err instanceof Error ? err.message : String(err)}`
        );
        return;
      }

      setFiles(validFiles);
      setError('');
    }
  };

  const handleRemoveFile = async (indexToRemove: number) => {
    // Remove from temp storage if it exists
    if (tempFileNames[indexToRemove]) {
      try {
        await supabase.storage.from('payment-proofs-temp').remove([tempFileNames[indexToRemove]]);
      } catch (err) {
        logger.error(err instanceof Error ? err : new Error('Error removing from temp storage'), {
          error: err,
          fileName: tempFileNames[indexToRemove],
        });
      }
    }

    setFiles(files.filter((_, idx) => idx !== indexToRemove));
    setTempFileNames(tempFileNames.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (analyzing) {
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];

    for (const file of droppedFiles) {
      const validation = validateFile(file, FILE_VALIDATION_PRESETS.documents);
      if (!validation.valid) {
        setError(validation.error || 'Fichier invalide');
        return;
      }
      validFiles.push(file);
    }

    // Upload files to temp storage
    const uploadedNames: string[] = [];
    try {
      for (const file of validFiles) {
        const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs-temp')
          .upload(tempFileName, file);

        if (uploadError) {
          logger.error(new Error('Error uploading to temp storage'), { error: uploadError });
          setError(`Erreur lors du téléchargement: ${uploadError.message || String(uploadError)}`);
          return;
        }

        uploadedNames.push(tempFileName);
      }

      setTempFileNames(uploadedNames);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Error in file upload'), { error: err });
      setError(
        `Erreur lors du téléchargement: ${err instanceof Error ? err.message : String(err)}`
      );
      return;
    }

    setFiles(validFiles);
    setError('');
  };

  const compressImage = (
    imageDataUrl: string,
    quality: number = IMAGE_PROCESSING.COMPRESSION_QUALITY
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = IMAGE_PROCESSING.MAX_SIZE;

        let width = img.width;
        let height = img.height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
          } else {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.split(',')[1]);
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });

  const handleAnalyze = async () => {
    if (files.length === 0) {
      return;
    }

    const startTime = Date.now();
    setAnalyzing(true);
    setError('');

    try {
      const base64Images: string[] = [];

      const conversionStart = Date.now();

      for (const file of files) {
        if (file.type === 'application/pdf') {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await page.render({ canvasContext: context, viewport } as any).promise;

            const imageDataUrl = canvas.toDataURL('image/png');
            const compressed = await compressImage(
              imageDataUrl,
              IMAGE_PROCESSING.COMPRESSION_QUALITY
            );
            base64Images.push(compressed);
          }
        } else {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = async e => {
              const dataUrl = e.target?.result as string;
              try {
                const compressed = await compressImage(
                  dataUrl,
                  IMAGE_PROCESSING.COMPRESSION_QUALITY
                );
                resolve(compressed);
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          base64Images.push(base64);
        }
      }

      const conversionTime = Date.now() - conversionStart;
      logger.debug('Images converties', { count: base64Images.length, timeMs: conversionTime });

      const totalSize = base64Images.reduce((sum, img) => sum + img.length, 0);
      const totalSizeMB = ((totalSize * 0.75) / 1024 / 1024).toFixed(2);
      logger.debug('Taille totale des images', { sizeMB: totalSizeMB });

      const maxSizeBytes = FILE_LIMITS.ANALYSIS_TOTAL * 1024 * 1024;
      if (totalSize > maxSizeBytes) {
        throw new Error(
          `Les images sont trop volumineuses (${totalSizeMB} MB). Limite: ${FILE_LIMITS.ANALYSIS_TOTAL} MB. Réduisez le nombre de fichiers.`
        );
      }

      const expectedPayments = subscriptions.map(sub => ({
        investorName: sub.investisseur.nom_raison_sociale,
        expectedAmount: sub.coupon_net,
        subscriptionId: sub.id,
        investisseurId: sub.investisseur_id,
      }));

      const analysisStart = Date.now();

      const { data, error: funcError } = await supabase.functions.invoke('analyze-payment-batch', {
        body: {
          base64Images: base64Images,
          expectedPayments: expectedPayments,
        },
      });

      const analysisTime = Date.now() - analysisStart;
      logger.info('Analyse IA terminée', { timeMs: analysisTime });

      if (funcError) {
        // Check if the function doesn't exist
        if (
          funcError.message?.includes('not found') ||
          funcError.message?.includes('FunctionsRelayError')
        ) {
          throw new Error(
            "La fonction d'analyse des paiements n'est pas disponible. Veuillez contacter l'administrateur pour déployer la fonction Edge \"analyze-payment-batch\"."
          );
        }
        throw funcError;
      }
      if (!data) {
        throw new Error("Aucune donnée reçue de la fonction d'analyse");
      }
      if (!data.succes) {
        throw new Error(data.erreur || "Erreur lors de l'analyse des paiements");
      }
      if (!data.correspondances) {
        throw new Error('Données de correspondance manquantes');
      }

      const enrichedMatches = data.correspondances.map(
        (
          match: Omit<PaymentMatch, 'matchedSubscription'> & {
            attendu?: { subscriptionId?: string };
          }
        ) => {
          // Use the subscriptionId from backend's fuzzy matching result
          const subscription = match.attendu?.subscriptionId
            ? subscriptions.find(s => s.id === match.attendu!.subscriptionId)
            : undefined;
          return { ...match, matchedSubscription: subscription };
        }
      );

      // Validate extracted payment amounts
      const invalidAmounts = enrichedMatches.filter(
        (match: PaymentMatch) => !isValidAmount(match.paiement.montant)
      );

      if (invalidAmounts.length > 0) {
        logger.warn('Montants invalides détectés', { count: invalidAmounts.length });
        // Continue but user will see validation error when trying to save
      }

      setMatches(enrichedMatches);

      const autoSelected = new Set<number>();
      enrichedMatches.forEach((match: PaymentMatch, idx: number) => {
        if (match.statut === 'correspondance') {
          autoSelected.add(idx);
        }
      });
      setSelectedMatches(autoSelected);

      // Don't clear tempFileNames here - we need them for validation!
      // They'll be cleared after successful payment creation

      setStep('results');

      const totalTime = Date.now() - startTime;
      logger.info('Analyse complète', { totalTimeMs: totalTime });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)));
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'analyse";
      setError(errorMessage);

      // Clean up temp files on error
      if (tempFileNames.length > 0) {
        try {
          await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
          setTempFileNames([]);
        } catch (cleanupErr) {
          logger.error(new Error('Failed to cleanup temp files after analysis error'), {
            error: cleanupErr,
          });
        }
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelectMatch = (idx: number) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedMatches(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMatches.size === matches.length) {
      setSelectedMatches(new Set());
    } else {
      const allIndexes = new Set<number>();
      matches.forEach((_match, idx) => {
        allIndexes.add(idx);
      });
      setSelectedMatches(allIndexes);
    }
  };

  const handleValidateSelected = async () => {
    setProcessing(true);
    setError('');

    try {
      // Early validation: Get org_id from projet before processing
      const { data: projet, error: projetError } = await supabase
        .from('projets')
        .select('org_id')
        .eq('id', selectedProjectId)
        .single();

      if (projetError) {
        throw projetError;
      }
      if (!projet?.org_id) {
        throw new Error("Impossible de récupérer l'organisation du projet");
      }

      const selectedMatchesList = Array.from(selectedMatches).map(idx => matches[idx]);
      const validMatches = selectedMatchesList.filter(m => m.matchedSubscription);

      // Validate payment amounts
      for (const match of validMatches) {
        const amount = match.paiement.montant;
        if (!isValidAmount(amount)) {
          throw new Error(
            `Montant invalide pour ${match.paiement.beneficiaire}: ${amount}. ` +
              'Le montant doit être un nombre positif.'
          );
        }
      }

      for (const match of validMatches) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('paiements')
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedProjectId,
            tranche_id: selectedTrancheId,
            investisseur_id: match.matchedSubscription!.investisseur_id,
            souscription_id: match.matchedSubscription!.id,
            org_id: projet.org_id,
            montant: match.paiement.montant,
            date_paiement: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (paymentError) {
          throw paymentError;
        }

        // Update coupons_echeances to link this payment
        if (selectedEcheanceDate) {
          const { error: echeanceError } = await supabase
            .from('coupons_echeances')
            .update({
              statut: 'paye',
              date_paiement: new Date().toISOString(),
              montant_paye: match.paiement.montant,
              paiement_id: paymentData.id,
            })
            .eq('souscription_id', match.matchedSubscription!.id)
            .eq('date_echeance', selectedEcheanceDate);

          if (echeanceError) {
            logger.error(new Error('Error updating échéance'), { error: echeanceError });
          }
        }

        if (tempFileNames.length > 0) {
          const firstTempFile = tempFileNames[0];

          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('payment-proofs-temp')
            .download(firstTempFile);

          if (downloadError) {
            throw downloadError;
          }

          const permanentFileName = `${paymentData.id}/${Date.now()}_${files[0].name}`;

          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, downloadData);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          const { error: proofError } = await supabase.from('payment_proofs').insert({
            paiement_id: paymentData.id,
            file_url: urlData.publicUrl,
            file_name: files[0].name,
            file_size: files[0].size,
            extracted_data: match.paiement,
            confidence: match.confiance,
          });

          if (proofError) {
            throw proofError;
          }
        }
      }

      if (tempFileNames.length > 0) {
        await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
      }

      setShowConfirmModal(false);
      setSuccessMessage(
        `Paiement validé avec succès${tempFileNames.length > 0 ? ' avec justificatif' : ''} !`
      );
      setShowSuccessModal(true);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Payment validation failed'), {
        error: err,
      });
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation';
      setError(errorMessage);

      // Clean up temp files on error
      if (tempFileNames.length > 0) {
        try {
          await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
          setTempFileNames([]);
        } catch (cleanupErr) {
          logger.error(new Error('Failed to cleanup temp files after validation error'), {
            error: cleanupErr,
          });
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateAll = async () => {
    setProcessing(true);
    setError('');

    try {
      // Early validation: Get org_id from projet before processing
      const { data: projet, error: projetError } = await supabase
        .from('projets')
        .select('org_id')
        .eq('id', selectedProjectId)
        .single();

      if (projetError) {
        throw projetError;
      }
      if (!projet?.org_id) {
        throw new Error("Impossible de récupérer l'organisation du projet");
      }

      const validMatchesList = matches.filter(
        m => m.statut === 'correspondance' && m.matchedSubscription
      );

      if (validMatchesList.length === 0) {
        throw new Error('Aucune correspondance valide à valider');
      }

      for (const match of validMatchesList) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('paiements')
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedProjectId,
            tranche_id: selectedTrancheId,
            investisseur_id: match.matchedSubscription!.investisseur_id,
            souscription_id: match.matchedSubscription!.id,
            org_id: projet.org_id,
            montant: match.paiement.montant,
            date_paiement: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (paymentError) {
          throw paymentError;
        }

        // Update coupons_echeances to link this payment
        if (selectedEcheanceDate) {
          const { error: echeanceError } = await supabase
            .from('coupons_echeances')
            .update({
              statut: 'paye',
              date_paiement: new Date().toISOString(),
              montant_paye: match.paiement.montant,
              paiement_id: paymentData.id,
            })
            .eq('souscription_id', match.matchedSubscription!.id)
            .eq('date_echeance', selectedEcheanceDate);

          if (echeanceError) {
            logger.error(new Error('Error updating échéance'), { error: echeanceError });
          }
        }

        if (tempFileNames.length > 0) {
          const firstTempFile = tempFileNames[0];

          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('payment-proofs-temp')
            .download(firstTempFile);

          if (downloadError) {
            throw downloadError;
          }

          const permanentFileName = `${paymentData.id}/${Date.now()}_${files[0].name}`;

          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, downloadData);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          const { error: proofError } = await supabase.from('payment_proofs').insert({
            paiement_id: paymentData.id,
            file_url: urlData.publicUrl,
            file_name: files[0].name,
            file_size: files[0].size,
            extracted_data: match.paiement,
            confidence: match.confiance,
          });

          if (proofError) {
            throw proofError;
          }
        }
      }

      if (tempFileNames.length > 0) {
        await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
      }

      setSuccessMessage(
        `${validMatchesList.length} paiement${validMatchesList.length > 1 ? 's validés' : ' validé'} avec succès !`
      );
      setShowSuccessModal(true);
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error('Bulk payment validation failed'), {
        error: err,
      });
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation';
      setError(errorMessage);

      // Clean up temp files on error
      if (tempFileNames.length > 0) {
        try {
          await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
          setTempFileNames([]);
        } catch (cleanupErr) {
          logger.error(new Error('Failed to cleanup temp files after bulk validation error'), {
            error: cleanupErr,
          });
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);

  const totalExpected = subscriptions.reduce((sum, sub) => sum + sub.coupon_net, 0);
  const validMatches = matches.filter(m => m.statut === 'correspondance');
  const selectedMatchesList = Array.from(selectedMatches).map(idx => matches[idx]);
  const hasPartialInSelection = selectedMatchesList.some(m => m.statut === 'partielle');
  const hasNoMatchInSelection = selectedMatchesList.some(m => m.statut === 'pas-de-correspondance');
  const noMatchList = selectedMatchesList.filter(m => m.statut === 'pas-de-correspondance');

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-wizard-title"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

        {/* Centered Container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            role="document"
          >
            <PaymentWizardHeader
              step={step}
              subscriptionCount={subscriptions.length}
              selectedMatchCount={selectedMatches.size}
              onBack={handleBackToSelect}
              onClose={onClose}
              showBackButton={step !== 'select'}
            />

            <div className="p-6">
              {/* STEP 1: SELECT PROJECT AND TRANCHE */}
              {step === 'select' && (
                <>
                  <PaymentProjectSelect
                    projects={projects}
                    tranches={tranches}
                    selectedProjectId={selectedProjectId}
                    selectedTrancheId={selectedTrancheId}
                    preselectedProjectId={preselectedProjectId}
                    preselectedTrancheId={preselectedTrancheId}
                    displayProjectName={displayProjectName}
                    displayTrancheName={displayTrancheName}
                    onProjectChange={setSelectedProjectId}
                    onTrancheChange={setSelectedTrancheId}
                  />

                  {selectedTrancheId && (
                    <button
                      onClick={() => setStep('echeance')}
                      className="w-full bg-finixar-brand-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4"
                    >
                      Continuer
                    </button>
                  )}
                </>
              )}

              {/* STEP 2: SELECT ÉCHÉANCE */}
              {step === 'echeance' && (
                <div className="space-y-4">
                  {/* Context card */}
                  {(displayProjectName || displayTrancheName) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="space-y-1">
                        {displayProjectName && (
                          <p className="text-sm text-blue-900 flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span className="font-semibold">Projet:</span> {displayProjectName}
                            {preselectedProjectId && (
                              <Lock className="w-3 h-3 ml-1 text-blue-600" />
                            )}
                          </p>
                        )}
                        {displayTrancheName && (
                          <p className="text-sm text-blue-900 flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span className="font-semibold">Tranche:</span> {displayTrancheName}
                            {preselectedTrancheId && (
                              <Lock className="w-3 h-3 ml-1 text-blue-600" />
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* If écheance date is preselected, show loading state instead of selection UI */}
                  {preselectedEcheanceDate ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-lg font-semibold text-slate-900 mb-2">
                        Chargement des paiements...
                      </p>
                      <p className="text-sm text-slate-600">
                        Échéance:{' '}
                        {new Date(preselectedEcheanceDate).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-4">
                        Quelle échéance payez-vous?
                      </h4>

                      {/* Group by status */}
                      {echeanceGroups.filter(g => g.statut === 'en_retard').length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4" />
                            En retard ({echeanceGroups.filter(g => g.statut === 'en_retard').length}
                            )
                          </h5>
                          <div className="space-y-2">
                            {echeanceGroups
                              .filter(g => g.statut === 'en_retard')
                              .map(group => (
                                <button
                                  key={group.date}
                                  onClick={() => setSelectedEcheanceDate(group.date)}
                                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    selectedEcheanceDate === group.date
                                      ? 'border-red-500 bg-red-50'
                                      : 'border-red-200 bg-red-50 hover:border-red-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {new Date(group.date).toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </p>
                                      <p className="text-xs text-red-700 mt-1">
                                        🔴 En retard - {group.daysOverdue} jour
                                        {group.daysOverdue! > 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-slate-600">
                                        {group.count} investisseur{group.count > 1 ? 's' : ''}
                                      </p>
                                      <p className="font-bold text-slate-900">
                                        {formatCurrency(group.totalAmount)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {echeanceGroups.filter(g => g.statut === 'a_venir').length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-semibold text-slate-700 mb-3">
                            À venir ({echeanceGroups.filter(g => g.statut === 'a_venir').length})
                          </h5>
                          <div className="space-y-2">
                            {echeanceGroups
                              .filter(g => g.statut === 'a_venir')
                              .map(group => (
                                <button
                                  key={group.date}
                                  onClick={() => setSelectedEcheanceDate(group.date)}
                                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    selectedEcheanceDate === group.date
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {new Date(group.date).toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">À venir</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-slate-600">
                                        {group.count} investisseur{group.count > 1 ? 's' : ''}
                                      </p>
                                      <p className="font-bold text-slate-900">
                                        {formatCurrency(group.totalAmount)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {echeanceGroups.filter(g => g.statut === 'paye').length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-green-700 mb-3">
                            Payées ({echeanceGroups.filter(g => g.statut === 'paye').length})
                          </h5>
                          <div className="space-y-2">
                            {echeanceGroups
                              .filter(g => g.statut === 'paye')
                              .slice(0, 3)
                              .map(group => (
                                <div
                                  key={group.date}
                                  className="p-4 rounded-lg border border-green-200 bg-green-50 opacity-60"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {new Date(group.date).toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </p>
                                      <p className="text-xs text-green-700 mt-1">✅ Payée</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-slate-600">
                                        {group.count} investisseur{group.count > 1 ? 's' : ''}
                                      </p>
                                      <p className="font-bold text-slate-900">
                                        {formatCurrency(group.totalAmount)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {echeanceGroups.length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500">
                            Aucune échéance trouvée pour cette tranche
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: UPLOAD */}
              {step === 'upload' && (
                <div className="space-y-6">
                  {/* Context Header */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-2">
                      {displayProjectName && (
                        <p className="text-sm text-blue-900 flex items-center gap-1.5">
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span className="font-semibold">Projet:</span> {displayProjectName}
                          {preselectedProjectId && <Lock className="w-3 h-3 ml-1 text-blue-600" />}
                        </p>
                      )}
                      {displayTrancheName && (
                        <p className="text-sm text-blue-900 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span className="font-semibold">Tranche:</span> {displayTrancheName}
                          {preselectedTrancheId && <Lock className="w-3 h-3 ml-1 text-blue-600" />}
                        </p>
                      )}
                      {selectedEcheanceDate && (
                        <p className="text-sm text-blue-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-semibold">Échéance:</span>{' '}
                          {new Date(selectedEcheanceDate).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                          {preselectedEcheanceDate && (
                            <Lock className="w-3 h-3 ml-1 text-blue-600" />
                          )}
                        </p>
                      )}
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-sm text-blue-700 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" />
                          <span className="font-semibold">Total attendu:</span>{' '}
                          {formatCurrency(totalExpected)} pour {subscriptions.length} investisseur
                          {subscriptions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">
                      Détails des paiements ({subscriptions.length})
                    </h4>
                    <div className="space-y-2">
                      {subscriptions.map(sub => (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {sub.investisseur.nom_raison_sociale}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {formatCurrency(sub.coupon_net)}
                            </p>
                            <p className="text-xs text-slate-500">À payer</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 scale-105'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                    }`}
                    role="button"
                    aria-label="Zone de téléchargement de fichiers"
                  >
                    <Upload
                      className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      disabled={analyzing}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      aria-label="Sélectionner des fichiers de justificatif"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {isDragging ? 'Déposez vos fichiers ici' : 'Choisir des fichiers'}
                    </label>
                    <p className="text-sm text-slate-500 mt-2">
                      {isDragging ? 'Relâchez pour téléverser' : 'ou glissez-déposez vos fichiers'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, PNG, JPG ou WEBP (max 10MB par fichier)
                    </p>
                  </div>

                  {files.length > 0 && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">
                        Fichiers sélectionnés ({files.length}):
                      </h4>
                      <ul className="space-y-2">
                        {files.map((file, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between bg-slate-50 p-3 rounded-lg group hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-700">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                              <button
                                onClick={() => handleRemoveFile(idx)}
                                disabled={analyzing}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Supprimer ce fichier"
                                aria-label={`Supprimer le fichier ${file.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {error && (
                    <div
                      className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2"
                      role="alert"
                      aria-live="assertive"
                    >
                      <AlertCircle
                        className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={files.length === 0 || analyzing}
                    className="w-full bg-finixar-teal text-white py-3 rounded-lg font-medium hover:bg-finixar-teal-hover disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    aria-busy={analyzing}
                    aria-label={
                      analyzing
                        ? 'Analyse du justificatif en cours'
                        : 'Analyser le justificatif de paiement'
                    }
                  >
                    {analyzing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
                        Analyse en cours...
                      </>
                    ) : (
                      'Analyser le justificatif'
                    )}
                  </button>
                </div>
              )}

              {/* STEP 4: RESULTS */}
              {step === 'results' && (
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-blue-600">Correspondances</p>
                          <p className="text-lg font-bold text-blue-900">
                            {validMatches.length}/{matches.length}
                          </p>
                        </div>
                        <div className="h-8 w-px bg-blue-300" />
                        <div>
                          <p className="text-xs text-blue-600">Total extrait</p>
                          <p className="text-lg font-bold text-blue-900">
                            {formatCurrency(
                              matches.reduce((sum, m) => sum + m.paiement.montant, 0)
                            )}
                          </p>
                        </div>
                        {selectedEcheanceDate && (
                          <>
                            <div className="h-8 w-px bg-blue-300" />
                            <div>
                              <p className="text-xs text-blue-600">Échéance</p>
                              <p className="text-sm font-semibold text-blue-900">
                                {new Date(selectedEcheanceDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={toggleSelectAll}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedMatches.size === matches.length
                          ? 'Tout désélectionner'
                          : 'Tout sélectionner'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Diff Cards */}
                  <div className="space-y-3">
                    {matches.map((match, idx) => {
                      const isSelected = selectedMatches.has(idx);
                      const amountDiff = match.matchedSubscription
                        ? match.paiement.montant - match.matchedSubscription.coupon_net
                        : 0;
                      const amountDiffPercent = match.details?.ecartMontantPourcent
                        ? parseFloat(match.details.ecartMontantPourcent)
                        : 0;

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleSelectMatch(idx)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          } ${
                            match.statut === 'correspondance'
                              ? 'ring-2 ring-green-200'
                              : match.statut === 'partielle'
                                ? 'ring-2 ring-yellow-200'
                                : 'ring-2 ring-red-200'
                          }`}
                        >
                          {/* Header: Checkbox + Status Badge */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id={`payment-match-${idx}`}
                                checked={isSelected}
                                onChange={() => toggleSelectMatch(idx)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                onClick={e => e.stopPropagation()}
                                aria-label={`Sélectionner le paiement de ${match.matchedSubscription?.investisseur?.nom_raison_sociale || 'cet investisseur'}`}
                              />
                              <div
                                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                                  match.statut === 'correspondance'
                                    ? 'bg-green-100 text-green-800'
                                    : match.statut === 'partielle'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {match.statut === 'correspondance' ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Correspondance {match.confiance}%
                                  </>
                                ) : match.statut === 'partielle' ? (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Partielle {match.confiance}%
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Pas de correspondance
                                  </>
                                )}
                              </div>
                            </div>
                            {match.paiement.reference && (
                              <span className="text-xs text-slate-500">
                                Réf: {match.paiement.reference}
                              </span>
                            )}
                          </div>

                          {/* Inline Diff: Side-by-side comparison */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left: Extracted Payment */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-xs font-semibold text-slate-700 uppercase">
                                  Détecté dans le PDF
                                </span>
                              </div>

                              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                                <div>
                                  <p className="text-xs text-slate-600">Bénéficiaire</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {match.paiement.beneficiaire}
                                  </p>
                                </div>

                                <div className="flex items-baseline gap-4">
                                  <div>
                                    <p className="text-xs text-slate-600">Montant</p>
                                    <p className="text-lg font-bold text-slate-900">
                                      {formatCurrency(match.paiement.montant)}
                                    </p>
                                  </div>
                                  {match.paiement.date && (
                                    <div>
                                      <p className="text-xs text-slate-600">Date</p>
                                      <p className="text-sm text-slate-700">
                                        {match.paiement.date}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Expected/Matched Subscription */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-semibold text-slate-700 uppercase">
                                  Attendu (Échéance)
                                </span>
                              </div>

                              {match.matchedSubscription ? (
                                <div
                                  className={`rounded-lg p-3 space-y-2 ${
                                    match.statut === 'correspondance'
                                      ? 'bg-green-50'
                                      : match.statut === 'partielle'
                                        ? 'bg-yellow-50'
                                        : 'bg-red-50'
                                  }`}
                                >
                                  <div>
                                    <p className="text-xs text-slate-600">Investisseur</p>
                                    <p
                                      className={`text-sm font-semibold ${
                                        match.statut === 'correspondance'
                                          ? 'text-green-900'
                                          : match.statut === 'partielle'
                                            ? 'text-yellow-900'
                                            : 'text-red-900'
                                      }`}
                                    >
                                      {match.matchedSubscription.investisseur.nom_raison_sociale}
                                    </p>
                                    {match.details?.nameScore && (
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        Correspondance nom: {match.details.nameScore}%
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-baseline gap-4">
                                    <div>
                                      <p className="text-xs text-slate-600">Montant attendu</p>
                                      <p
                                        className={`text-lg font-bold ${
                                          Math.abs(amountDiff) < 0.01
                                            ? 'text-green-700'
                                            : amountDiffPercent < 5
                                              ? 'text-yellow-700'
                                              : 'text-red-700'
                                        }`}
                                      >
                                        {formatCurrency(match.matchedSubscription.coupon_net)}
                                      </p>
                                      {Math.abs(amountDiff) > 0.01 && (
                                        <p
                                          className={`text-xs mt-1 font-medium ${
                                            amountDiffPercent < 5
                                              ? 'text-yellow-700'
                                              : 'text-red-700'
                                          }`}
                                        >
                                          {amountDiff > 0 ? '+' : ''}
                                          {formatCurrency(amountDiff)} ({amountDiff > 0 ? '+' : ''}
                                          {amountDiffPercent.toFixed(1)}%)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-center justify-center h-full">
                                  <div className="text-center">
                                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-red-700">
                                      Aucune correspondance trouvée
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                      Vérifiez les données manuellement
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {error && (
                    <div
                      className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                      role="alert"
                      aria-live="assertive"
                    >
                      <AlertCircle
                        className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            {step === 'results' && (
              <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 rounded-b-2xl">
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    disabled={processing}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={processing || selectedMatches.size === 0}
                    className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Valider la sélection ({selectedMatches.size})
                  </button>
                  <button
                    onClick={handleValidateAll}
                    disabled={processing || validMatches.length === 0}
                    className="flex-1 px-4 py-2 bg-finixar-action-process text-white rounded-lg hover:bg-finixar-action-process-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Tout valider ({validMatches.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Confirmer la validation</h3>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-700">
                  Vous allez valider{' '}
                  <span className="font-bold">
                    {selectedMatches.size} paiement{selectedMatches.size > 1 ? 's' : ''}
                  </span>
                  :
                </p>

                {hasNoMatchInSelection && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="w-6 h-6 text-finixar-red flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-900 text-sm">ATTENTION CRITIQUE</p>
                        <p className="text-sm text-red-800 mt-1">
                          {noMatchList.length} paiement{noMatchList.length > 1 ? 's' : ''} sans
                          correspondance (0%)
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1 ml-8">
                      {noMatchList.map((match, idx) => (
                        <li key={idx} className="text-sm text-red-700">
                          <span className="font-semibold">{match.paiement.beneficiaire}</span> -{' '}
                          {formatCurrency(match.paiement.montant)}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700 mt-3 ml-8">
                      Ces paiements seront enregistrés SANS correspondance vérifiée!
                    </p>
                  </div>
                )}

                {hasPartialInSelection && !hasNoMatchInSelection && (
                  <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">
                      Certaines correspondances sont partielles. Vérifiez les données avant de
                      continuer.
                    </p>
                  </div>
                )}

                <ul className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {selectedMatchesList.map((match, idx) => (
                    <li
                      key={idx}
                      className={`text-sm p-2 rounded ${
                        match.statut === 'pas-de-correspondance'
                          ? 'bg-red-50 border border-red-200'
                          : match.statut === 'partielle'
                            ? 'bg-orange-50'
                            : 'bg-green-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{match.paiement.beneficiaire}</span>
                        <span className="text-slate-600">
                          {formatCurrency(match.paiement.montant)}
                        </span>
                      </div>
                      {match.statut === 'pas-de-correspondance' && (
                        <span className="text-xs text-finixar-red font-semibold">
                          0% - AUCUNE CORRESPONDANCE
                        </span>
                      )}
                      {match.statut === 'partielle' && (
                        <span className="text-xs text-orange-600">
                          Partiel ({match.confiance}%)
                        </span>
                      )}
                      {match.statut === 'correspondance' && (
                        <span className="text-xs text-finixar-green">
                          Valide ({match.confiance}%)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={processing}
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidateSelected}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    hasNoMatchInSelection
                      ? 'bg-finixar-red hover:bg-red-700'
                      : 'bg-finixar-green hover:bg-green-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    <>
                      {hasNoMatchInSelection ? (
                        <>
                          <AlertCircle className="w-5 h-5" />
                          Forcer quand même
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Confirmer
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Succès !</h3>
            <p className="text-slate-600 mb-6">{successMessage}</p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                // Invalidate dashboard cache to refresh upcoming coupons
                triggerCacheInvalidation();
                onSuccess();
                onClose();
              }}
              className="w-full px-6 py-3 bg-finixar-green text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
