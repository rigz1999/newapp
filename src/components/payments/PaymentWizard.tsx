import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader, FileText, AlertTriangle, Upload, ArrowLeft, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';
import { isValidAmount } from '../../utils/validators';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

interface Project {
  id: string;
  projet: string;
}

interface Tranche {
  id: string;
  tranche_name: string;
}

interface Subscription {
  id: string;
  investisseur_id: string;
  montant_investi: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
  };
}

interface PaymentMatch {
  paiement: {
    beneficiaire: string;
    montant: number;
    date: string;
    reference: string;
  };
  matchedSubscription?: Subscription;
  statut: 'correspondance' | 'partielle' | 'pas-de-correspondance';
  confiance: number;
  details: {
    ecartMontant: string;
    ecartMontantPourcent: string;
  };
}

interface PaymentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentWizard({ onClose, onSuccess }: PaymentWizardProps) {
  const [_loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTrancheId, setSelectedTrancheId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [matches, setMatches] = useState<PaymentMatch[]>([]);
  const [_uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  const [tempFileNames, setTempFileNames] = useState<string[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [step, setStep] = useState<'select' | 'upload' | 'results'>('select');

  const handleBackToSelect = () => {
    setStep('select');
    setSelectedProjectId('');
    setSelectedTrancheId('');
    setFiles([]);
    setMatches([]);
    setSelectedMatches(new Set());
    setUploadedFileUrls([]);
    setTempFileNames([]);
    setError('');
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTranches(selectedProjectId);
    } else {
      setTranches([]);
      setSelectedTrancheId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedTrancheId) {
      fetchSubscriptions(selectedTrancheId);
      setStep('upload');
    } else {
      setSubscriptions([]);
    }
  }, [selectedTrancheId]);

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

  const fetchSubscriptions = async (trancheId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('souscriptions')
      .select(`
        id,
        investisseur_id,
        montant_investi,
        coupon_net,
        investisseur:investisseurs(nom_raison_sociale)
      `)
      .eq('tranche_id', trancheId);

    setSubscriptions((data || []) as Subscription[]);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setFiles(validFiles);
      setError('');
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
  };

  const compressImage = (imageDataUrl: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        
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
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    console.time('⏱️ TOTAL');
    setAnalyzing(true);
    setError('');

    try {
      const base64Images: string[] = [];
      
      console.time('🖼️ Conversion Base64');

      for (const file of files) {
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport } as any).promise;
            
            const imageDataUrl = canvas.toDataURL('image/png');
            const compressed = await compressImage(imageDataUrl, 0.7);
            base64Images.push(compressed);
          }
        } else {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = async (e) => {
              const dataUrl = e.target?.result as string;
              try {
                const compressed = await compressImage(dataUrl, 0.7);
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

      console.timeEnd('🖼️ Conversion Base64');
      console.log(`📦 ${base64Images.length} image(s) converties`);

      const totalSize = base64Images.reduce((sum, img) => sum + img.length, 0);
      const totalSizeMB = (totalSize * 0.75 / 1024 / 1024).toFixed(2);
      console.log(`📊 Taille totale: ${totalSizeMB} MB`);

      if (totalSize > 5 * 1024 * 1024) {
        throw new Error(`Les images sont trop volumineuses (${totalSizeMB} MB). Limite: 5 MB. Réduisez le nombre de fichiers.`);
      }

      const expectedPayments = subscriptions.map(sub => ({
        investorName: sub.investisseur.nom_raison_sociale,
        expectedAmount: sub.coupon_net,
        subscriptionId: sub.id,
        investisseurId: sub.investisseur_id
      }));

      console.time('🤖 Analyse IA');

      const { data, error: funcError } = await supabase.functions.invoke('analyze-payment-batch', {
        body: {
          base64Images: base64Images,
          expectedPayments: expectedPayments
        }
      });

      console.timeEnd('🤖 Analyse IA');

      if (funcError) {
        // Check if the function doesn't exist
        if (funcError.message?.includes('not found') || funcError.message?.includes('FunctionsRelayError')) {
          throw new Error('La fonction d\'analyse des paiements n\'est pas disponible. Veuillez contacter l\'administrateur pour déployer la fonction Edge "analyze-payment-batch".');
        }
        throw funcError;
      }
      if (!data) throw new Error('Aucune donnée reçue de la fonction d\'analyse');
      if (!data.succes) throw new Error(data.erreur || 'Erreur lors de l\'analyse des paiements');
      if (!data.correspondances) throw new Error('Données de correspondance manquantes');

      const enrichedMatches = data.correspondances.map((match: any) => {
        const subscription = subscriptions.find(
          s => s.investisseur.nom_raison_sociale.toLowerCase() === match.paiement.beneficiaire.toLowerCase()
        );
        return { ...match, matchedSubscription: subscription };
      });

      // Validate extracted payment amounts
      const invalidAmounts = enrichedMatches.filter((match: PaymentMatch) =>
        !isValidAmount(match.paiement.montant)
      );

      if (invalidAmounts.length > 0) {
        console.warn('⚠️ Montants invalides détectés:', invalidAmounts);
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
      
      setUploadedFileUrls([]);
      setTempFileNames([]);
      
      setStep('results');

      console.timeEnd('⏱️ TOTAL');

    } catch (err: any) {
      console.error('Erreur analyse:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
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
        const { data: paymentData, error: paymentError } = await ((supabase
          .from('paiements') as any)
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedProjectId,
            tranche_id: selectedTrancheId,
            investisseur_id: match.matchedSubscription!.investisseur_id,
            souscription_id: match.matchedSubscription!.id,
            montant: match.paiement.montant,
            date_paiement: match.paiement.date || new Date().toISOString().split('T')[0]
          })
          .select()
          .single());

        if (paymentError) throw paymentError;

        if (tempFileNames.length > 0) {
          const firstTempFile = tempFileNames[0];
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('payment-proofs-temp')
            .download(firstTempFile);

          if (downloadError) throw downloadError;

          const permanentFileName = `${paymentData.id}/${Date.now()}_${files[0].name}`;
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, downloadData);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          const { error: proofError } = await ((supabase
            .from('payment_proofs') as any)
            .insert({
              paiement_id: (paymentData as any).id,
              file_url: urlData.publicUrl,
              file_name: files[0].name,
              file_size: files[0].size,
              extracted_data: match.paiement,
              confidence: match.confiance
            }));

          if (proofError) throw proofError;
        }
      }

      if (tempFileNames.length > 0) {
        await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
      }

      setShowConfirmModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateAll = async () => {
    setProcessing(true);
    setError('');

    try {
      const validMatchesList = matches.filter(m => m.statut === 'correspondance' && m.matchedSubscription);

      for (const match of validMatchesList) {
        const { data: paymentData, error: paymentError } = await ((supabase
          .from('paiements') as any)
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedProjectId,
            tranche_id: selectedTrancheId,
            investisseur_id: match.matchedSubscription!.investisseur_id,
            souscription_id: match.matchedSubscription!.id,
            montant: match.paiement.montant,
            date_paiement: match.paiement.date || new Date().toISOString().split('T')[0]
          })
          .select()
          .single());

        if (paymentError) throw paymentError;

        if (tempFileNames.length > 0) {
          const firstTempFile = tempFileNames[0];
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('payment-proofs-temp')
            .download(firstTempFile);

          if (downloadError) throw downloadError;

          const permanentFileName = `${paymentData.id}/${Date.now()}_${files[0].name}`;
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, downloadData);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          const { error: proofError } = await ((supabase
            .from('payment_proofs') as any)
            .insert({
              paiement_id: (paymentData as any).id,
              file_url: urlData.publicUrl,
              file_name: files[0].name,
              file_size: files[0].size,
              extracted_data: match.paiement,
              confidence: match.confiance
            }));

          if (proofError) throw proofError;
        }
      }

      if (tempFileNames.length > 0) {
        await supabase.storage.from('payment-proofs-temp').remove(tempFileNames);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const totalExpected = subscriptions.reduce((sum, sub) => sum + sub.coupon_net, 0);
  const validMatches = matches.filter(m => m.statut === 'correspondance');
  const selectedMatchesList = Array.from(selectedMatches).map(idx => matches[idx]);
  const hasPartialInSelection = selectedMatchesList.some(m => m.statut === 'partielle');
  const hasNoMatchInSelection = selectedMatchesList.some(m => m.statut === 'pas-de-correspondance');
  const noMatchList = selectedMatchesList.filter(m => m.statut === 'pas-de-correspondance');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Centered Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            {(step === 'upload' || step === 'results') && (
              <button
                onClick={handleBackToSelect}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Retour à la sélection"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Retour</span>
              </button>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {step === 'select' && 'Enregistrer un Paiement de Tranche'}
                {step === 'upload' && 'Télécharger Justificatif de Paiement'}
                {step === 'results' && 'Résultats de l\'Analyse'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {step === 'select' && 'Sélectionnez un projet et une tranche à payer'}
                {step === 'upload' && `Paiement de tranche - ${subscriptions.length} investisseur${subscriptions.length > 1 ? 's' : ''}`}
                {step === 'results' && `${selectedMatches.size} paiement${selectedMatches.size > 1 ? 's' : ''} sélectionné${selectedMatches.size > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* STEP 1: SELECT */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Projet</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sélectionnez un projet</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.projet}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Tranche</label>
                <select
                  value={selectedTrancheId}
                  onChange={(e) => setSelectedTrancheId(e.target.value)}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                >
                  <option value="">Sélectionnez une tranche</option>
                  {tranches.map((tranche) => (
                    <option key={tranche.id} value={tranche.id}>{tranche.tranche_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Paiement de Tranche</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Cette tranche contient {subscriptions.length} investisseur{subscriptions.length > 1 ? 's' : ''}. 
                  Le justificatif de paiement doit contenir tous les paiements individuels.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600">Montant total à payer:</span>
                  <span className="text-lg font-bold text-blue-900">{formatCurrency(totalExpected)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Détails des Paiements ({subscriptions.length})</h4>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{sub.investisseur.nom_raison_sociale}</p>
                        <p className="text-xs text-slate-500">{sub.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(sub.coupon_net)}</p>
                        <p className="text-xs text-slate-500">À payer</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={analyzing}
                />
                <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                  Choisir des fichiers
                </label>
                <p className="text-sm text-slate-500 mt-2">PDF, PNG, JPG ou WEBP (max 10MB par fichier)</p>
              </div>

              {files.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Fichiers sélectionnés ({files.length}):</h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg group hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            disabled={analyzing}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer ce fichier"
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || analyzing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  'Analyser le justificatif'
                )}
              </button>
            </div>
          )}

          {/* STEP 3: RESULTS */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{validMatches.length}/{matches.length}</span> correspondance{validMatches.length > 1 ? 's' : ''} valide{validMatches.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600">Total extrait</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(matches.reduce((sum, m) => sum + m.paiement.montant, 0))}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedMatches.size > 0 && selectedMatches.size === matches.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Statut</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Bénéficiaire Détecté</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Montant</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Correspondance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-slate-100 ${
                          match.statut === 'correspondance' ? 'bg-green-50' :
                          match.statut === 'partielle' ? 'bg-yellow-50' :
                          'bg-red-50'
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMatches.has(idx)}
                            onChange={() => toggleSelectMatch(idx)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3">
                          {match.statut === 'correspondance' ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">{match.confiance}%</span>
                            </div>
                          ) : match.statut === 'partielle' ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="text-xs font-medium text-yellow-700">{match.confiance}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-medium text-red-700">{match.confiance}%</span>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{match.paiement.beneficiaire}</p>
                            {match.paiement.date && (
                              <p className="text-xs text-slate-500">{match.paiement.date}</p>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(match.paiement.montant)}</p>
                        </td>

                        <td className="px-3 py-3">
                          {match.matchedSubscription ? (
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {match.matchedSubscription.investisseur.nom_raison_sociale}
                              </p>
                              <p className="text-xs text-slate-600">
                                Attendu: {formatCurrency(match.matchedSubscription.coupon_net)}
                                {match.details?.ecartMontantPourcent && parseFloat(match.details.ecartMontantPourcent) > 0 && (
                                  <span className="text-orange-600 ml-1">
                                    (±{match.details.ecartMontantPourcent}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Aucune correspondance</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Valider la sélection ({selectedMatches.size})
              </button>
              <button
                onClick={handleValidateAll}
                disabled={processing || validMatches.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Confirmer la validation</h3>
              
              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-700">
                  Vous allez valider <span className="font-bold">{selectedMatches.size} paiement{selectedMatches.size > 1 ? 's' : ''}</span>:
                </p>
                
                {hasNoMatchInSelection && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-900 text-sm">ATTENTION CRITIQUE</p>
                        <p className="text-sm text-red-800 mt-1">
                          {noMatchList.length} paiement{noMatchList.length > 1 ? 's' : ''} sans correspondance (0%)
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1 ml-8">
                      {noMatchList.map((match, idx) => (
                        <li key={idx} className="text-sm text-red-700">
                          <span className="font-semibold">{match.paiement.beneficiaire}</span> - {formatCurrency(match.paiement.montant)}
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
                      Certaines correspondances sont partielles. Vérifiez les données avant de continuer.
                    </p>
                  </div>
                )}
                
                <ul className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {selectedMatchesList.map((match, idx) => (
                    <li key={idx} className={`text-sm p-2 rounded ${
                      match.statut === 'pas-de-correspondance' ? 'bg-red-50 border border-red-200' :
                      match.statut === 'partielle' ? 'bg-orange-50' :
                      'bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{match.paiement.beneficiaire}</span>
                        <span className="text-slate-600">{formatCurrency(match.paiement.montant)}</span>
                      </div>
                      {match.statut === 'pas-de-correspondance' && (
                        <span className="text-xs text-red-600 font-semibold">0% - AUCUNE CORRESPONDANCE</span>
                      )}
                      {match.statut === 'partielle' && (
                        <span className="text-xs text-orange-600">Partiel ({match.confiance}%)</span>
                      )}
                      {match.statut === 'correspondance' && (
                        <span className="text-xs text-green-600">Valide ({match.confiance}%)</span>
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
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
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
    </div>
  );
}