import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, CheckCircle, AlertTriangle, XCircle, Trash2, Loader2 } from 'lucide-react';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';
import { sanitizeFileName } from '../../utils/sanitizer';

let pdfjsLoaded: typeof import('pdfjs-dist') | null = null;
async function getPdfjs() {
  if (!pdfjsLoaded) {
    pdfjsLoaded = await import('pdfjs-dist');
    pdfjsLoaded.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
  }
  return pdfjsLoaded;
}

interface Subscription {
  id: string;
  id_souscription: string;
  montant_investi: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
  };
}

interface PaymentProofUploadProps {
  payment?: {
    id: string;
    montant: number;
    date_paiement: string;
    tranche: {
      tranche_name: string;
    };
    investisseur: {
      nom_raison_sociale: string;
    } | null;
  };
  trancheId?: string;
  subscriptions?: Subscription[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentProofUpload({
  payment,
  trancheId,
  subscriptions,
  onClose,
  onSuccess,
}: PaymentProofUploadProps) {
  const isTrancheMode = Boolean(trancheId && subscriptions);
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add listener with capture phase to ensure it runs first
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose]);

  const processFiles = (selectedFiles: File[]) => {
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      const validation = validateFile(file, FILE_VALIDATION_PRESETS.documents);
      if (!validation.valid) {
        setError(validation.error || 'Fichier invalide');
        return;
      }
      validFiles.push(file);
    }

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  // @ts-expect-error TS6133 - reserved for future AI analysis feature
  const _handleAnalyze = async () => {
    if (files.length === 0) {
      return;
    }

    if (isTrancheMode && (!trancheId || !subscriptions || subscriptions.length === 0)) {
      setError('Données de tranche manquantes');
      return;
    }

    if (!isTrancheMode && !payment) {
      setError('Données de paiement manquantes');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const base64Images: string[] = [];
      const tempFileNames: string[] = [];
      const uploadedBlobs: Blob[] = [];

      // Process all files (convert PDFs to images, process images directly)
      for (const file of files) {
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = await getPdfjs();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;

          // Convert each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              viewport: viewport,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any).promise;

            // Convert canvas to blob and base64
            const blob = await new Promise<Blob>(resolve => {
              canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.95);
            });

            // Convert to base64
            const base64 = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove data:image/jpeg;base64, prefix
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
              };
              reader.readAsDataURL(blob);
            });

            const fileName = `${Date.now()}_${file.name.replace('.pdf', '')}_page${pageNum}.jpg`;

            base64Images.push(base64);
            tempFileNames.push(fileName);
            uploadedBlobs.push(blob);
          }
        } else {
          // Convert image to base64
          const base64 = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              const base64Data = base64String.split(',')[1];
              resolve(base64Data);
            };
            reader.readAsDataURL(file);
          });

          const fileName = `${Date.now()}_${file.name}`;

          base64Images.push(base64);
          tempFileNames.push(fileName);
          uploadedBlobs.push(file);
        }
      }

      // Vérifier que les images ne sont pas vides
      if (base64Images.length === 0) {
        throw new Error('Aucune image générée - problème de conversion');
      }

      // Use batch function for everything (has better fuzzy matching)
      const expectedPayments = isTrancheMode
        ? subscriptions!.map(sub => ({
            investorName: sub.investisseur.nom_raison_sociale,
            expectedAmount: Number(sub.coupon_net) || 0,
            subscriptionId: sub.id,
          }))
        : [
            {
              investorName: payment!.investisseur?.nom_raison_sociale || '',
              expectedAmount: payment!.montant,
              paymentId: payment!.id,
            },
          ];

      const requestBody = {
        base64Images,
        expectedPayments,
      };

      const response = await supabase.functions.invoke('analyze-payment-batch', {
        body: requestBody,
      });

      const data = response.data;
      const funcError = response.error;

      if (funcError) {
        // Check if the function doesn't exist
        if (
          funcError.message?.includes('not found') ||
          funcError.message?.includes('FunctionsRelayError')
        ) {
          throw new Error(
            `La fonction d'analyse des paiements n'est pas disponible. Veuillez contacter l'administrateur pour déployer la fonction Edge "analyze-payment-batch".`
          );
        }
        throw funcError;
      }
      if (!data?.succes) {
        throw new Error(data?.erreur || "Erreur lors de l'analyse du paiement");
      }

      setAnalysisResult({
        ...data,
        tempFileNames: tempFileNames,
        uploadedBlobs: uploadedBlobs,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // @ts-expect-error TS6133 - reserved for future AI analysis feature
  const _handleConfirm = async (match: {
    attendu?: Record<string, unknown>;
    paiement: Record<string, unknown>;
    confiance: number;
  }) => {
    try {
      const uploadedBlobs = analysisResult?.uploadedBlobs as Blob[] | undefined;

      if (!uploadedBlobs || uploadedBlobs.length === 0) {
        throw new Error('Aucune image à sauvegarder');
      }

      // Use the first blob for upload
      const firstBlob = uploadedBlobs[0];

      if (isTrancheMode) {
        // Batch payment confirmation - create payment records for each matched payment
        const subscriptionId = match.attendu?.subscriptionId;
        if (!subscriptionId) {
          throw new Error('ID de souscription manquant');
        }

        // Get subscription details to create payment
        const { data: subscription, error: subError } = await supabase
          .from('souscriptions')
          .select('*, investisseur:investisseurs(*)')
          .eq('id', subscriptionId as string)
          .single();

        if (subError) {
          throw subError;
        }

        // Get tranche with projet to get org_id
        const { data: tranche, error: trancheError } = await supabase
          .from('tranches')
          .select('*, projet:projets(org_id)')
          .eq('id', trancheId!)
          .single();

        if (trancheError) {
          throw trancheError;
        }
        if (!tranche?.projet?.org_id) {
          throw new Error("Impossible de récupérer l'organisation de la tranche");
        }

        // Create payment record
        const { data: paymentData, error: paymentError } = await supabase
          .from('paiements')
          .insert({
            tranche_id: trancheId,
            investisseur_id: (subscription as Record<string, unknown>).investisseur_id,
            org_id: ((tranche as Record<string, unknown>).projet as Record<string, unknown>).org_id,
            type: 'Coupon',
            montant: match.paiement.montant,
            date_paiement: match.paiement.date,
          } as never)
          .select()
          .single();

        if (paymentError) {
          throw paymentError;
        }

        // Upload file to permanent storage
        const safeName = sanitizeFileName(files[0].name);
        const permanentFileName = `${paymentData.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(permanentFileName, firstBlob);

        if (uploadError) {
          throw uploadError;
        }

        // Save proof to database with relative path (no Supabase URL exposed)
        const { error: dbError } = await supabase.from('payment_proofs').insert({
          paiement_id: (paymentData as Record<string, unknown>).id,
          file_url: permanentFileName,
          file_name: files[0].name,
          file_size: files[0].size,
          extracted_data: match.paiement,
          confidence: match.confiance,
        } as never);

        if (dbError) {
          throw dbError;
        }
      } else {
        // Single payment confirmation
        const safeName = sanitizeFileName(files[0].name);
        const permanentFileName = `${payment!.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(permanentFileName, firstBlob);

        if (uploadError) {
          throw uploadError;
        }

        // Sauvegarder dans la base de données avec chemin relatif
        const { error: dbError } = await supabase.from('payment_proofs').insert({
          paiement_id: payment!.id,
          file_url: permanentFileName,
          file_name: files[0].name,
          file_size: files[0].size,
          extracted_data: match.paiement,
          confidence: match.confiance,
        } as never);

        if (dbError) {
          throw dbError;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la confirmation');
    }
  };

  // @ts-expect-error TS6133 - reserved for future AI analysis feature
  const _handleReject = async () => {
    setAnalysisResult(null);
    setError(null);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  // @ts-expect-error TS6133 - reserved for future AI analysis feature
  const _getMatchIcon = (status: string) => {
    if (status === 'correspondance') {
      return <CheckCircle className="w-6 h-6 text-finixar-green" />;
    }
    if (status === 'partielle') {
      return <AlertTriangle className="w-6 h-6 text-finixar-amber" />;
    }
    return <XCircle className="w-6 h-6 text-finixar-red" />;
  };

  // @ts-expect-error TS6133 - reserved for future AI analysis feature
  const _getMatchColor = (status: string) => {
    if (status === 'correspondance') {
      return 'bg-green-50 border-green-200';
    }
    if (status === 'partielle') {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-red-50 border-red-200';
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      onDragOver={e => e.preventDefault()}
      onDrop={e => e.preventDefault()}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Télécharger Justificatif de Paiement
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {isTrancheMode
                  ? `Paiement de tranche - ${subscriptions?.length || 0} investisseurs`
                  : `${payment?.tranche?.tranche_name} • ${payment?.investisseur?.nom_raison_sociale}`}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!analysisResult ? (
            <>
              {isTrancheMode ? (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Paiements Attendus</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {subscriptions?.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-sm bg-white p-2 rounded"
                      >
                        <span className="text-slate-700">
                          {sub.investisseur.nom_raison_sociale}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(Number(sub.coupon_net) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                    <span className="font-semibold text-blue-900">Total:</span>
                    <span className="font-bold text-blue-900 text-lg">
                      {formatCurrency(
                        subscriptions?.reduce(
                          (sum, sub) => sum + (Number(sub.coupon_net) || 0),
                          0
                        ) || 0
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Montant attendu</p>
                      <p className="font-bold text-slate-900">
                        {formatCurrency(payment?.montant || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Date d'échéance</p>
                      <p className="font-bold text-slate-900">
                        {payment?.date_paiement
                          ? new Date(payment.date_paiement).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors ${
                  isDragging
                    ? 'border-finixar-teal bg-finixar-teal bg-opacity-5'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload
                  className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-finixar-teal' : 'text-slate-400'}`}
                />
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  multiple
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  {files.length > 0 ? "Ajouter d'autres fichiers" : 'Choisir des fichiers'}
                </label>
                <p className="text-sm text-slate-500 mt-2">
                  {isDragging ? 'Déposez vos fichiers ici' : 'ou glissez-déposez vos fichiers'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF, PNG, JPG ou WEBP (max 10MB par fichier)
                </p>
              </div>

              {files.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-2">
                    Fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}:
                  </h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
                      >
                        <div className="flex-1">
                          <span className="text-sm text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-finixar-red hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer ce fichier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Simple upload button (AI analysis disabled) */}
              <button
                onClick={async () => {
                  if (!payment) {
                    return;
                  }
                  setAnalyzing(true);
                  setError(null);

                  try {
                    // Upload each file directly
                    for (const file of files) {
                      const safeName = sanitizeFileName(file.name);
                      const fileName = `${payment.id}/${Date.now()}_${safeName}`;

                      const { error: uploadError } = await supabase.storage
                        .from('payment-proofs')
                        .upload(fileName, file);

                      if (uploadError) {
                        throw uploadError;
                      }

                      await supabase.from('payment_proofs').insert({
                        paiement_id: payment.id,
                        file_url: fileName,
                        file_name: file.name,
                        file_size: file.size,
                      });
                    }

                    onSuccess();
                    onClose();
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
                  } finally {
                    setAnalyzing(false);
                  }
                }}
                disabled={files.length === 0 || analyzing}
                className="w-full bg-finixar-teal text-white py-3 rounded-lg font-medium hover:bg-finixar-teal-hover disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {analyzing && <Loader2 className="w-5 h-5 animate-spin" />}
                {analyzing ? 'Upload en cours...' : 'Télécharger les justificatifs'}
              </button>

              {/* DISABLED - AI ANALYSIS BUTTON (can be re-enabled later)
              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || analyzing}
                className="w-full bg-finixar-teal text-white py-3 rounded-lg font-medium hover:bg-finixar-teal-hover disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {analyzing && <Loader2 className="w-5 h-5 animate-spin" />}
                {analyzing ? 'Analyse en cours...' : 'Analyser le justificatif'}
              </button>
              END DISABLED */}
            </>
          ) : (
            <div className="space-y-4">
              {/* DISABLED - AI ANALYSIS RESULTS DISPLAY (can be re-enabled later)
              {analysisResult.correspondances?.map((match: any, idx: number) => (
                <div key={idx} className={`border-2 rounded-lg p-6 ${getMatchColor(match.statut)}`}>
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      {match.statut === 'correspondance' && (
                        <>
                          <CheckCircle className="w-5 h-5 text-finixar-green" />
                          <h4 className="font-bold text-slate-900">Correspondance ({match.confiance}%)</h4>
                        </>
                      )}
                      {match.statut === 'partielle' && (
                        <>
                          <AlertTriangle className="w-5 h-5 text-finixar-amber" />
                          <h4 className="font-bold text-slate-900">Correspondance partielle ({match.confiance}%)</h4>
                        </>
                      )}
                      {match.statut === 'pas-de-correspondance' && (
                        <>
                          <XCircle className="w-5 h-5 text-finixar-red" />
                          <h4 className="font-bold text-slate-900">Pas de correspondance ({match.confiance}%)</h4>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">EXTRAIT DU JUSTIFICATIF</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-600">Bénéficiaire:</span> <span className="font-medium">{match.paiement.beneficiaire}</span></p>
                        <p><span className="text-slate-600">Montant:</span> <span className="font-medium">{formatCurrency(match.paiement.montant)}</span></p>
                        <p><span className="text-slate-600">Date:</span> <span className="font-medium">{match.paiement.date}</span></p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">ATTENDU</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-600">Investisseur:</span> <span className="font-medium">{match.attendu?.investorName || match.attendu?.investisseur || '-'}</span></p>
                        <p><span className="text-slate-600">Montant:</span> <span className="font-medium">{formatCurrency(match.attendu?.expectedAmount || match.attendu?.montant || 0)}</span></p>
                        {!isTrancheMode && match.attendu?.dateEcheance && (
                          <p><span className="text-slate-600">Date échéance:</span> <span className="font-medium">{match.attendu.dateEcheance}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      Différence montant: {formatCurrency(parseFloat(match.details?.ecartMontant || 0))} ({match.details?.ecartMontantPourcent || 0}%)
                      {match.details?.ecartJours !== undefined && (
                        <> • Différence date: {match.details.ecartJours} jour{match.details.ecartJours > 1 ? 's' : ''}</>
                      )}
                      {match.details?.nameScore && (
                        <> • Score nom: {match.details.nameScore}%</>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-3">
                    {match.confiance > 50 && (
                      <button
                        onClick={() => handleConfirm(match)}
                        className="flex-1 bg-finixar-teal text-white py-2 rounded-lg font-medium hover:bg-finixar-teal-hover transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirmer & Marquer Payé
                      </button>
                    )}
                    {match.confiance <= 50 && (
                      <button
                        onClick={() => handleConfirm(match)}
                        className="flex-1 bg-finixar-red text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Forcer la Confirmation
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={handleReject}
                className="w-full bg-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-300 transition-colors mt-4 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              END DISABLED */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
