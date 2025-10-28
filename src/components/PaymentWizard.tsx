import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader, FileText, AlertTriangle, Upload, ArrowLeft } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

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
  const [loading, setLoading] = useState(false);
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
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
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

    setSubscriptions(data as any || []);
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(f => {
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(f.type)) {
          setError('Seuls les fichiers PDF, PNG, JPG et WEBP sont acceptés');
          return false;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError('Taille maximale: 10MB par fichier');
          return false;
        }
        return true;
      });
      setFiles(validFiles);
      setError('');
    }
  };

  // ========================================
  // ⚡ HELPER : Compresser une image
  // ========================================
  const compressImage = (imageDataUrl: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200; // Max 1200px
        
        let width = img.width;
        let height = img.height;
        
        // Redimensionner si trop grand
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
        
        // Convertir en JPEG avec compression
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.split(',')[1]); // Retourner juste le base64
      };
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  };

  // ========================================
  // ⚡ NOUVELLE FONCTION OPTIMISÉE
  // ========================================
  const handleAnalyze = async () => {
    if (files.length === 0) return;

    console.time('⏱️ TOTAL');
    setAnalyzing(true);
    setError('');

    try {
      const base64Images: string[] = [];
      
      console.time('🖼️ Conversion Base64');

      // Convertir tous les fichiers en Base64 compressé
      for (const file of files) {
        if (file.type === 'application/pdf') {
          // PDF → PNG → Base64
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 }); // ⚡ 1.5 au lieu de 2.0
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            // Compresser avant d'envoyer
            const imageDataUrl = canvas.toDataURL('image/png');
            const compressed = await compressImage(imageDataUrl, 0.7);
            base64Images.push(compressed);
          }
        } else {
          // Image directe → Base64 compressé
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

      // ========================================
      // ⚡ Vérifier la taille totale (limite Supabase: 6MB)
      // ========================================
      const totalSize = base64Images.reduce((sum, img) => sum + img.length, 0);
      const totalSizeMB = (totalSize * 0.75 / 1024 / 1024).toFixed(2); // *0.75 car base64 = 33% plus gros
      console.log(`📊 Taille totale: ${totalSizeMB} MB`);

      if (totalSize > 5 * 1024 * 1024) { // 5MB en base64
        throw new Error(`Les images sont trop volumineuses (${totalSizeMB} MB). Limite: 5 MB. Réduisez le nombre de fichiers ou leur taille.`);
      }

      const expectedPayments = subscriptions.map(sub => ({
        investorName: sub.investisseur.nom_raison_sociale,
        expectedAmount: sub.coupon_net,
        subscriptionId: sub.id,
        investisseurId: sub.investisseur_id
      }));

      console.time('🤖 Analyse IA');

      // ========================================
      // ⚡ APPEL OPTIMISÉ avec Base64
      // ========================================
      const { data, error: funcError } = await supabase.functions.invoke('analyze-payment-batch', {
        body: { 
          base64Images: base64Images, // ⚡ Base64 au lieu d'URLs
          expectedPayments: expectedPayments 
        }
      });

      console.timeEnd('🤖 Analyse IA');

      if (funcError) throw funcError;
      if (!data.succes) throw new Error(data.erreur);

      console.time('📊 Traitement résultats');

      const enrichedMatches = data.correspondances.map((match: any) => {
        const subscription = subscriptions.find(
          s => s.investisseur.nom_raison_sociale.toLowerCase() === match.paiement.beneficiaire.toLowerCase()
        );
        return { ...match, matchedSubscription: subscription };
      });

      setMatches(enrichedMatches);
      
      // Auto-select valid matches
      const autoSelected = new Set<number>();
      enrichedMatches.forEach((match: PaymentMatch, idx: number) => {
        if (match.statut === 'correspondance') {
          autoSelected.add(idx);
        }
      });
      setSelectedMatches(autoSelected);
      
      // ⚡ Plus besoin de stocker les fichiers temporaires
      setUploadedFileUrls([]);
      setTempFileNames([]);
      
      setStep('results');

      console.timeEnd('📊 Traitement résultats');
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
      matches.forEach((match, idx) => {
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

      // Create payment records
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
            montant: match.paiement.montant,
            date_paiement: match.paiement.date || new Date().toISOString().split('T')[0],
            statut: 'payé'
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // ⚡ Upload first file as proof (si besoin)
        if (files.length > 0) {
          const firstFile = files[0];
          const permanentFileName = `${paymentData.id}/${Date.now()}_${firstFile.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, firstFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          await supabase
            .from('payment_proofs')
            .insert({
              paiement_id: paymentData.id,
              file_url: urlData.publicUrl,
              file_name: firstFile.name,
              file_size: firstFile.size,
              extracted_data: match.paiement,
              confidence: match.confiance
            });
        }
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
        const { data: paymentData, error: paymentError } = await supabase
          .from('paiements')
          .insert({
            id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'Coupon',
            projet_id: selectedProjectId,
            tranche_id: selectedTrancheId,
            investisseur_id: match.matchedSubscription!.investisseur_id,
            souscription_id: match.matchedSubscription!.id,
            montant: match.paiement.montant,
            date_paiement: match.paiement.date || new Date().toISOString().split('T')[0],
            statut: 'payé'
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        if (files.length > 0) {
          const firstFile = files[0];
          const permanentFileName = `${paymentData.id}/${Date.now()}_${firstFile.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(permanentFileName, firstFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(permanentFileName);

          await supabase
            .from('payment_proofs')
            .insert({
              paiement_id: paymentData.id,
              file_url: urlData.publicUrl,
              file_name: firstFile.name,
              file_size: firstFile.size,
              extracted_data: match.paiement,
              confidence: match.confiance
            });
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button
                onClick={handleBackToSelect}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                disabled={analyzing || processing}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Enregistrer des paiements</h2>
              <p className="text-sm text-blue-100">
                {step === 'select' && 'Sélectionnez un projet et une tranche'}
                {step === 'upload' && 'Téléversez les justificatifs'}
                {step === 'results' && `${matches.length} paiement${matches.length > 1 ? 's' : ''} détecté${matches.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={analyzing || processing}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: SELECT PROJECT & TRANCHE */}
          {step === 'select' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Projet <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projet}</option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Tranche <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={selectedTrancheId}
                    onChange={(e) => setSelectedTrancheId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Sélectionner une tranche</option>
                    {tranches.map(t => (
                      <option key={t.id} value={t.id}>{t.tranche_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: UPLOAD & ANALYZE */}
          {step === 'upload' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{subscriptions.length} investisseur{subscriptions.length > 1 ? 's' : ''}</strong> dans cette tranche
                  <br />Total attendu: <strong>{formatCurrency(totalExpected)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Justificatifs de paiement
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={analyzing}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Cliquez pour sélectionner
                  </label>
                  <p className="text-sm text-slate-500 mt-2">
                    PDF, PNG, JPG, WEBP • Limite: 10 fichiers max, 10MB par fichier
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || analyzing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Analyser les documents
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULTS */}
          {step === 'results' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedMatches.size === matches.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  <span className="text-sm text-slate-600">
                    {selectedMatches.size} / {matches.length} sélectionné{selectedMatches.size > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600 font-medium">
                    ✓ {validMatches.length} correspondance{validMatches.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 uppercase">
                        <input
                          type="checkbox"
                          checked={selectedMatches.size === matches.length && matches.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 uppercase">Statut</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 uppercase">Bénéficiaire</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 uppercase">Montant</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 uppercase">Correspondance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matches.map((match, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${selectedMatches.has(idx) ? 'bg-blue-50' : ''}`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMatches.has(idx)}
                            onChange={() => toggleSelectMatch(idx)}
                            className="rounded"
                          />
                        </td>

                        <td className="px-3 py-3">
                          {match.statut === 'correspondance' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {match.confiance}%
                            </span>
                          )}
                          {match.statut === 'partielle' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {match.confiance}%
                            </span>
                          )}
                          {match.statut === 'pas-de-correspondance' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              0%
                            </span>
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
                  </div>
                )}

                {hasPartialInSelection && !hasNoMatchInSelection && (
                  <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800">
                      Certaines correspondances sont partielles.
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