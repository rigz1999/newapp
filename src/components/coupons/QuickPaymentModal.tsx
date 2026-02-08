import { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Calendar,
  FileText,
  AlertCircle,
  ArrowLeft,
  FolderOpen,
  BarChart3,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import { triggerCacheInvalidation } from '../../utils/cacheManager';
import { logAuditEvent, auditFormatCurrency, auditFormatDate } from '../../utils/auditLogger';

interface QuickPaymentModalProps {
  preselectedProjectId?: string;
  preselectedProjectName?: string;
  preselectedTrancheId?: string;
  preselectedTrancheName?: string;
  preselectedEcheanceDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  id: string;
  projet: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
}

interface EcheanceGroup {
  date: string;
  tranche_id: string;
  projet_id: string;
  org_id: string;
  totalNet: number;
  totalBrut: number;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  statut: 'en_retard' | 'a_venir' | 'partiellement_paye';
  daysOverdue?: number;
}

interface Investor {
  echeance_id: string;
  investisseur_id: string;
  investisseur_nom: string;
  souscription_id: string;
  montant_net: number;
  montant_brut: number;
}

type WizardStep = 'select' | 'echeance' | 'payment';

export function QuickPaymentModal({
  preselectedProjectId,
  preselectedProjectName,
  preselectedTrancheId,
  preselectedTrancheName,
  preselectedEcheanceDate,
  onClose,
  onSuccess,
}: QuickPaymentModalProps) {
  // Determine initial step
  const getInitialStep = (): WizardStep => {
    if (preselectedEcheanceDate) {
      return 'payment';
    }
    if (preselectedTrancheId) {
      return 'echeance';
    }
    return 'select';
  };

  const [step, setStep] = useState<WizardStep>(getInitialStep());
  const [loading, setLoading] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [echeanceGroups, setEcheanceGroups] = useState<EcheanceGroup[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);

  // Selections
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
  const [selectedTrancheId, setSelectedTrancheId] = useState(preselectedTrancheId || '');
  const [selectedEcheanceDate, setSelectedEcheanceDate] = useState(preselectedEcheanceDate || '');
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());

  // Display names
  const [displayProjectName, setDisplayProjectName] = useState(preselectedProjectName || '');
  const [displayTrancheName, setDisplayTrancheName] = useState(preselectedTrancheName || '');

  // Payment form
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // AI-first proof upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<Map<string, string>>(new Map());
  const [_analyzing, setAnalyzing] = useState(false);
  const [aiMatches, setAiMatches] = useState<
    Map<string, { investorId: string; investorName: string; confidence: number; isManual: boolean }>
  >(new Map());
  const [_analyzed, setAnalyzed] = useState(false);

  // Derived state
  const selectedEcheanceData = echeanceGroups.find(g => g.date === selectedEcheanceDate);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  // Load projects on mount
  useEffect(() => {
    if (!preselectedProjectId) {
      loadProjects();
    }
  }, []);

  // Load tranches when project selected
  useEffect(() => {
    if (selectedProjectId) {
      loadTranches(selectedProjectId);
      if (!displayProjectName) {
        fetchProjectName(selectedProjectId);
      }
    }
  }, [selectedProjectId]);

  // Load écheances when tranche selected and auto-advance
  useEffect(() => {
    if (selectedTrancheId) {
      loadEcheances(selectedTrancheId);
      if (!displayTrancheName) {
        fetchTrancheName(selectedTrancheId);
      }
      // Auto-advance to écheance step when tranche is selected
      if (step === 'select') {
        setStep('echeance');
      }
    }
  }, [selectedTrancheId]);

  // Load investors when écheance selected
  useEffect(() => {
    if (selectedEcheanceDate && selectedTrancheId) {
      loadInvestors(selectedEcheanceDate, selectedTrancheId);
    }
  }, [selectedEcheanceDate, selectedTrancheId]);

  // Auto-advance to écheance step if tranche preselected
  useEffect(() => {
    if (preselectedTrancheId && step === 'select' && tranches.length > 0) {
      setStep('echeance');
    }
  }, [preselectedTrancheId, tranches]);

  // Auto-advance to payment step if écheance preselected
  useEffect(() => {
    if (preselectedEcheanceDate && step === 'echeance' && echeanceGroups.length > 0) {
      setStep('payment');
    }
  }, [preselectedEcheanceDate, echeanceGroups]);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projets').select('id, projet').order('projet');

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const fetchProjectName = async (projectId: string) => {
    const { data } = await supabase.from('projets').select('projet').eq('id', projectId).single();
    if (data) {
      setDisplayProjectName(data.projet);
    }
  };

  const loadTranches = async (projectId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tranches')
      .select('id, tranche_name')
      .eq('projet_id', projectId)
      .order('tranche_name');

    if (!error && data) {
      setTranches(data);
    }
    setLoading(false);
  };

  const fetchTrancheName = async (trancheId: string) => {
    const { data } = await supabase
      .from('tranches')
      .select('tranche_name')
      .eq('id', trancheId)
      .single();
    if (data) {
      setDisplayTrancheName(data.tranche_name);
    }
  };

  const loadEcheances = async (trancheId: string) => {
    setLoading(true);

    const { data: souscriptions } = await supabase
      .from('souscriptions')
      .select('id')
      .eq('tranche_id', trancheId);

    if (!souscriptions || souscriptions.length === 0) {
      setEcheanceGroups([]);
      setLoading(false);
      return;
    }

    const souscriptionIds = souscriptions.map(s => s.id);

    const { data, error } = await supabase
      .from('coupons_echeances')
      .select(
        `
        id,
        date_echeance,
        montant_coupon,
        statut,
        souscription_id,
        souscriptions!inner(
          id,
          coupon_net,
          coupon_brut,
          investisseur_id,
          tranche_id,
          investisseurs!inner(nom_raison_sociale),
          tranches!inner(projet_id, projets!inner(org_id))
        )
      `
      )
      .in('souscription_id', souscriptionIds)
      .order('date_echeance');

    if (!error && data) {
      // Group by date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped = new Map<string, any[]>();
      data.forEach(e => {
        const date = e.date_echeance;
        if (!grouped.has(date)) {
          grouped.set(date, []);
        }
        grouped.get(date)!.push(e);
      });

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const groups: EcheanceGroup[] = Array.from(grouped.entries())
        .map(([date, echs]) => {
          const totalCount = echs.length;
          const paidCount = echs.filter(e => e.statut === 'paye').length;
          const unpaidCount = totalCount - paidCount;

          // Only calculate totals for unpaid
          const unpaidEchs = echs.filter(e => e.statut !== 'paye');
          const totalNet = unpaidEchs.reduce(
            (sum, e) => sum + Number(e.souscriptions.coupon_net),
            0
          );
          const totalBrut = unpaidEchs.reduce(
            (sum, e) => sum + Number(e.souscriptions.coupon_brut),
            0
          );

          const echeanceDate = new Date(date);
          echeanceDate.setHours(0, 0, 0, 0);

          let statut: 'en_retard' | 'a_venir' | 'partiellement_paye' = 'a_venir';
          let daysOverdue = 0;

          if (unpaidCount === 0) {
            // All paid, don't include in list
            return null;
          }

          if (echeanceDate < now) {
            statut = 'en_retard';
            daysOverdue = Math.floor(
              (now.getTime() - echeanceDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          } else if (paidCount > 0) {
            statut = 'partiellement_paye';
          }

          return {
            date,
            tranche_id: echs[0].souscriptions.tranche_id,
            projet_id: echs[0].souscriptions.tranches.projet_id,
            org_id: echs[0].souscriptions.tranches.projets.org_id,
            totalNet,
            totalBrut,
            totalCount,
            paidCount,
            unpaidCount,
            statut,
            daysOverdue,
          };
        })
        .filter(Boolean) as EcheanceGroup[];

      setEcheanceGroups(groups);
    }

    setLoading(false);
  };

  const loadInvestors = async (date: string, trancheId: string) => {
    setLoading(true);

    const { data: souscriptions } = await supabase
      .from('souscriptions')
      .select('id')
      .eq('tranche_id', trancheId);

    if (!souscriptions || souscriptions.length === 0) {
      setInvestors([]);
      setLoading(false);
      return;
    }

    const souscriptionIds = souscriptions.map(s => s.id);

    const { data, error } = await supabase
      .from('coupons_echeances')
      .select(
        `
        id,
        souscription_id,
        souscriptions!inner(
          id,
          investisseur_id,
          coupon_net,
          coupon_brut,
          investisseurs!inner(nom_raison_sociale)
        )
      `
      )
      .in('souscription_id', souscriptionIds)
      .eq('date_echeance', date)
      .neq('statut', 'paye');

    if (!error && data) {
      const investorList: Investor[] = data.map(e => ({
        echeance_id: e.id,
        investisseur_id: e.souscriptions.investisseur_id,
        investisseur_nom: e.souscriptions.investisseurs.nom_raison_sociale,
        souscription_id: e.souscription_id,
        montant_net: e.souscriptions.coupon_net,
        montant_brut: e.souscriptions.coupon_brut,
      }));

      setInvestors(investorList);
      // Select all by default
      setSelectedInvestors(new Set(investorList.map(i => i.echeance_id)));
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (step === 'payment') {
      if (preselectedEcheanceDate) {
        // Can't go back if écheance was preselected
        if (preselectedTrancheId) {
          setStep('select');
        } else {
          setStep('echeance');
        }
      } else {
        setStep('echeance');
      }
    } else if (step === 'echeance') {
      setStep('select');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} fichier(s) trop volumineux (max 5MB)`);
      return;
    }

    setError('');
    setProcessing(true);

    try {
      const newFileUrls = new Map(fileUrls);

      // Upload each file to storage
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.warning(`Erreur lors du téléchargement de ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);

        newFileUrls.set(file.name, urlData.publicUrl);
      }

      setUploadedFiles(prev => [...prev, ...files]);
      setFileUrls(newFileUrls);
      setAnalyzed(false); // Reset analyzed state when new files are added
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Erreur lors du téléchargement des fichiers');
    } finally {
      setProcessing(false);
    }
  };

  // @ts-expect-error reserved for future use
  const _handleAnalyzeWithAI = async () => {
    if (uploadedFiles.length === 0) {
      setError("Veuillez d'abord télécharger des fichiers");
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      // Prepare file URLs and expected payments
      const fileUrlsList = Array.from(fileUrls.values());
      const selectedInvestorsList = investors.filter(i => selectedInvestors.has(i.echeance_id));
      const expectedPayments = selectedInvestorsList.map(inv => ({
        investorName: inv.investisseur_nom,
        expectedAmount: inv.montant_net,
        investorId: inv.investisseur_id,
        echeanceId: inv.echeance_id,
      }));

      // Call analyze-payment Edge Function
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            fileUrls: fileUrlsList,
            expectedPayments,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erreur || "Erreur lors de l'analyse");
      }

      const result = await response.json();

      // Process matches
      const newMatches = new Map<
        string,
        { investorId: string; investorName: string; confidence: number; isManual: boolean }
      >();

      if (result.correspondances && Array.isArray(result.correspondances)) {
        result.correspondances.forEach((match: Record<string, unknown>, index: number) => {
          const fileName = uploadedFiles[index]?.name;
          const attendu = match.attendu as Record<string, unknown> | undefined;
          if (fileName && attendu) {
            newMatches.set(fileName, {
              investorId: attendu.investorId as string,
              investorName: attendu.investorName as string,
              confidence: (match.confiance as number) || 0,
              isManual: false,
            });
          }
        });
      }

      setAiMatches(newMatches);
      setAnalyzed(true);
      toast.success('Analyse terminée !');
    } catch (err: unknown) {
      console.error('Error analyzing files:', err);
      setError(
        `Erreur lors de l'analyse IA: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // @ts-expect-error reserved for future use
  const _handleManualAssignment = (fileName: string, investorId: string) => {
    const investor = investors.find(i => i.investisseur_id === investorId);
    if (!investor) {
      return;
    }

    const newMatches = new Map(aiMatches);
    newMatches.set(fileName, {
      investorId: investor.investisseur_id,
      investorName: investor.investisseur_nom,
      confidence: 100,
      isManual: true,
    });
    setAiMatches(newMatches);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    const newFileUrls = new Map(fileUrls);
    newFileUrls.delete(fileName);
    setFileUrls(newFileUrls);
    const newMatches = new Map(aiMatches);
    newMatches.delete(fileName);
    setAiMatches(newMatches);
  };

  const toggleInvestor = (echeanceId: string) => {
    const newSelected = new Set(selectedInvestors);
    if (newSelected.has(echeanceId)) {
      newSelected.delete(echeanceId);
    } else {
      newSelected.add(echeanceId);
    }
    setSelectedInvestors(newSelected);
  };

  const toggleAllInvestors = () => {
    if (selectedInvestors.size === investors.length) {
      setSelectedInvestors(new Set());
    } else {
      setSelectedInvestors(new Set(investors.map(i => i.echeance_id)));
    }
  };

  const handleSubmit = async () => {
    if (!datePaiement) {
      setError('Veuillez sélectionner une date de paiement');
      return;
    }

    if (selectedInvestors.size === 0) {
      setError('Veuillez sélectionner au moins un investisseur');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const selectedInvestorsList = investors.filter(i => selectedInvestors.has(i.echeance_id));

      // Create payment records and link proofs based on AI matches
      for (const investor of selectedInvestorsList) {
        const { data: paiement, error: paiementError } = await supabase
          .from('paiements')
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedEcheanceData!.projet_id,
            tranche_id: selectedEcheanceData!.tranche_id,
            investisseur_id: investor.investisseur_id,
            souscription_id: investor.souscription_id,
            org_id: selectedEcheanceData!.org_id,
            montant: investor.montant_net,
            date_paiement: datePaiement,
            note: note || null,
          })
          .select()
          .single();

        if (paiementError) {
          throw paiementError;
        }

        // Find all files assigned to this investor based on AI matches
        const assignedFiles: string[] = [];
        aiMatches.forEach((match, fileName) => {
          if (match.investorId === investor.investisseur_id) {
            assignedFiles.push(fileName);
          }
        });

        // Link each assigned proof to this payment
        for (const fileName of assignedFiles) {
          const proofUrl = fileUrls.get(fileName);
          const file = uploadedFiles.find(f => f.name === fileName);

          if (proofUrl && file && paiement) {
            const { error: proofError } = await supabase.from('payment_proofs').insert({
              paiement_id: paiement.id,
              file_url: proofUrl,
              file_name: file.name,
              file_size: file.size,
              validated_at: new Date().toISOString(),
            });

            if (proofError) {
              console.error('Error linking proof:', proofError);
            }
          }
        }

        // Update echeance status
        const { error: echeanceError } = await supabase
          .from('coupons_echeances')
          .update({
            paiement_id: paiement.id,
            statut: 'paye',
            date_paiement: datePaiement,
            montant_paye: investor.montant_net,
          } as never)
          .eq('id', investor.echeance_id);

        if (echeanceError) {
          throw echeanceError;
        }
      }

      const totalPaid = selectedInvestorsList.reduce((sum, i) => sum + i.montant_net, 0);
      logAuditEvent({
        action: 'created',
        entityType: 'paiement',
        description: `a enregistré ${selectedInvestorsList.length} paiement(s) coupon pour un total de ${auditFormatCurrency(totalPaid)} (échéance du ${auditFormatDate(selectedEcheanceData!.date_echeance)})`,
        orgId: selectedEcheanceData!.org_id,
        metadata: {
          count: selectedInvestorsList.length,
          totalAmount: totalPaid,
          date_echeance: selectedEcheanceData!.date_echeance,
          projet: selectedEcheanceData!.projet_nom,
        },
      });

      toast.success(
        `${selectedInvestorsList.length} paiement${selectedInvestorsList.length > 1 ? 's' : ''} enregistré${selectedInvestorsList.length > 1 ? 's' : ''} avec succès`
      );

      // Invalidate all dashboard caches to force refresh
      // This ensures the dashboard shows updated coupon status
      triggerCacheInvalidation();

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error recording payment:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du paiement");
    } finally {
      setProcessing(false);
    }
  };

  const canGoBack = step !== 'select' && (!preselectedProjectId || step === 'payment');

  const selectedInvestorsList = investors.filter(i => selectedInvestors.has(i.echeance_id));
  const selectedTotal = selectedInvestorsList.reduce((sum, i) => sum + i.montant_net, 0);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h3 className="text-xl font-bold text-slate-900">Enregistrer un paiement</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Context card - show when projet/tranche locked */}
          {(displayProjectName || displayTrancheName) && step !== 'select' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-1">
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
              </div>
            </div>
          )}

          {/* STEP 1: SELECT PROJECT AND TRANCHE */}
          {step === 'select' && (
            <>
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Projet</label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading || !!preselectedProjectId}
                >
                  <option value="">Sélectionnez un projet</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.projet}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tranche Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tranche</label>
                <select
                  value={selectedTrancheId}
                  onChange={e => setSelectedTrancheId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={!selectedProjectId || loading || !!preselectedTrancheId}
                >
                  <option value="">Sélectionnez une tranche</option>
                  {tranches.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tranche_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* STEP 2: SELECT ÉCHEANCE */}
          {step === 'echeance' && (
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-4">
                Quelle échéance payez-vous?
              </h4>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-600 mt-2">Chargement...</p>
                </div>
              ) : echeanceGroups.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">Aucune échéance impayée trouvée</p>
                </div>
              ) : (
                <>
                  {/* En retard */}
                  {echeanceGroups.filter(g => g.statut === 'en_retard').length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        En retard ({echeanceGroups.filter(g => g.statut === 'en_retard').length})
                      </h5>
                      <div className="space-y-2">
                        {echeanceGroups
                          .filter(g => g.statut === 'en_retard')
                          .map(group => (
                            <button
                              key={group.date}
                              onClick={() => {
                                setSelectedEcheanceDate(group.date);
                                setStep('payment');
                              }}
                              className="w-full text-left p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:border-red-300 transition-all"
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
                                  {group.paidCount > 0 && (
                                    <p className="text-xs text-slate-600 mt-1">
                                      {group.unpaidCount} non payé{group.unpaidCount > 1 ? 's' : ''}{' '}
                                      ({group.paidCount}/{group.totalCount} payés)
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-600">
                                    {group.unpaidCount} investisseur
                                    {group.unpaidCount > 1 ? 's' : ''}
                                  </p>
                                  <p className="font-bold text-slate-900">
                                    {formatCurrency(group.totalNet)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Partiellement payé */}
                  {echeanceGroups.filter(g => g.statut === 'partiellement_paye').length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-orange-700 mb-3">
                        Partiellement payées (
                        {echeanceGroups.filter(g => g.statut === 'partiellement_paye').length})
                      </h5>
                      <div className="space-y-2">
                        {echeanceGroups
                          .filter(g => g.statut === 'partiellement_paye')
                          .map(group => (
                            <button
                              key={group.date}
                              onClick={() => {
                                setSelectedEcheanceDate(group.date);
                                setStep('payment');
                              }}
                              className="w-full text-left p-4 rounded-lg border-2 border-orange-200 bg-orange-50 hover:border-orange-300 transition-all"
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
                                  <p className="text-xs text-slate-600 mt-1">
                                    {group.unpaidCount} non payé{group.unpaidCount > 1 ? 's' : ''} (
                                    {group.paidCount}/{group.totalCount} payés)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-600">
                                    {group.unpaidCount} investisseur
                                    {group.unpaidCount > 1 ? 's' : ''}
                                  </p>
                                  <p className="font-bold text-slate-900">
                                    {formatCurrency(group.totalNet)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* À venir */}
                  {echeanceGroups.filter(g => g.statut === 'a_venir').length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-3">
                        À venir ({echeanceGroups.filter(g => g.statut === 'a_venir').length})
                      </h5>
                      <div className="space-y-2">
                        {echeanceGroups
                          .filter(g => g.statut === 'a_venir')
                          .map(group => (
                            <button
                              key={group.date}
                              onClick={() => {
                                setSelectedEcheanceDate(group.date);
                                setStep('payment');
                              }}
                              className="w-full text-left p-4 rounded-lg border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
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
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-600">
                                    {group.unpaidCount} investisseur
                                    {group.unpaidCount > 1 ? 's' : ''}
                                  </p>
                                  <p className="font-bold text-slate-900">
                                    {formatCurrency(group.totalNet)}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3: PAYMENT DETAILS */}
          {step === 'payment' && (
            <>
              {/* Écheance info */}
              {selectedEcheanceDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-900 font-medium">Échéance</p>
                      <p className="text-lg font-bold text-blue-600">
                        {new Date(selectedEcheanceDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-900">
                        {investors.length} investisseur{investors.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(investors.reduce((sum, i) => sum + i.montant_net, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Investor selection */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-600 mt-2">Chargement des investisseurs...</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Sélectionnez les investisseurs payés
                    </label>
                    <button
                      onClick={toggleAllInvestors}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedInvestors.size === investors.length
                        ? 'Tout désélectionner'
                        : 'Tout sélectionner'}
                    </button>
                  </div>

                  <div className="border border-slate-300 rounded-lg divide-y divide-slate-200 max-h-64 overflow-y-auto">
                    {investors.map(investor => (
                      <label
                        key={investor.echeance_id}
                        className="flex items-center p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedInvestors.has(investor.echeance_id)}
                          onChange={() => toggleInvestor(investor.echeance_id)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">
                            {investor.investisseur_nom}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(investor.montant_net)}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Selected total */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Montant sélectionné ({selectedInvestors.size}/{investors.length}{' '}
                      investisseurs)
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(selectedTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Date Paiement */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Date de paiement</span>
                    <span className="text-red-600">*</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={datePaiement}
                  onChange={e => setDatePaiement(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Note (optionnel)</span>
                  </div>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Informations complémentaires..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* AI-First Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span>Preuves de paiement (optionnel)</span>
                  </div>
                </label>

                {/* File Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                    disabled={processing}
                  />
                  <label
                    htmlFor="proof-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      Cliquez pour ajouter des preuves
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF ou images (max 5MB par fichier)
                    </p>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-700">
                        {uploadedFiles.length} fichier{uploadedFiles.length > 1 ? 's' : ''}{' '}
                        téléchargé{uploadedFiles.length > 1 ? 's' : ''}
                      </p>
                      {/* DISABLED - AI ANALYSIS BUTTON (can be re-enabled later)
                      {!analyzed && (
                        <button
                          onClick={handleAnalyzeWithAI}
                          disabled={analyzing || processing}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {analyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Analyse en cours...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-4 h-4" />
                              Analyser avec IA
                            </>
                          )}
                        </button>
                      )}
                      END DISABLED */}
                    </div>

                    <div className="border border-slate-300 rounded-lg divide-y divide-slate-200 max-h-80 overflow-y-auto">
                      {uploadedFiles.map(file => {
                        const match = aiMatches.get(file.name);
                        // @ts-expect-error reserved for future use
                        const _confidenceColor =
                          match && !match.isManual
                            ? match.confidence > 80
                              ? 'text-green-700 bg-green-100'
                              : match.confidence > 60
                                ? 'text-yellow-700 bg-yellow-100'
                                : 'text-orange-700 bg-orange-100'
                            : '';

                        return (
                          <div key={file.name} className="p-3 bg-slate-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                onClick={() => removeFile(file.name)}
                                disabled={processing}
                                className="text-red-600 hover:text-red-700 text-xs font-medium ml-2"
                              >
                                Retirer
                              </button>
                            </div>

                            {/* DISABLED - AI ANALYSIS RESULTS DISPLAY (can be re-enabled later)
                            {analyzed && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={match?.investorId || ''}
                                    onChange={(e) => handleManualAssignment(file.name, e.target.value)}
                                    className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Non assigné</option>
                                    {investors.filter(i => selectedInvestors.has(i.echeance_id)).map(inv => (
                                      <option key={inv.investisseur_id} value={inv.investisseur_id}>
                                        {inv.investisseur_nom}
                                      </option>
                                    ))}
                                  </select>
                                  {match && !match.isManual && (
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${confidenceColor}`}>
                                      {match.confidence}% IA
                                    </span>
                                  )}
                                  {match && match.isManual && (
                                    <span className="text-xs font-medium px-2 py-1 rounded text-blue-700 bg-blue-100">
                                      Manuel
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            END DISABLED */}
                          </div>
                        );
                      })}
                    </div>

                    {/* DISABLED - AI ANALYSIS INFO MESSAGE (can be re-enabled later)
                    {analyzed && (
                      <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-800">
                          L'IA a analysé les fichiers. Vérifiez les assignments et modifiez-les si nécessaire. Les fichiers non assignés ne seront pas liés à un paiement.
                        </p>
                      </div>
                    )}
                    END DISABLED */}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 'payment' && (
          <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={processing || selectedInvestors.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-finixar-teal hover:bg-finixar-teal-hover rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les paiements'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
