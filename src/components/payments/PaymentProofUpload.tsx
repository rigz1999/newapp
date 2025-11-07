import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, CheckCircle, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { validateFile, FILE_VALIDATION_PRESETS } from '../../utils/fileValidation';

// Configure le worker avec la version 5.4 (correspond au package installé)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

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

export function PaymentProofUpload({ payment, trancheId, subscriptions, onClose, onSuccess }: PaymentProofUploadProps) {
  const isTrancheMode = Boolean(trancheId && subscriptions);
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setFiles(prev => [...prev, ...validFiles]);
      setError(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

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
      let uploadedUrls: string[] = [];
      let tempFileNames: string[] = [];

      // Process all files (convert PDFs to images, upload images directly)
      for (const file of files) {
        if (file.type === 'application/pdf') {

          const arrayBuffer = await file.arrayBuffer();
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
              viewport: viewport
            }).promise;

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), 'image/png');
            });

            const fileName = `${Date.now()}_${file.name.replace('.pdf', '')}_page${pageNum}.png`;


            // Upload to temp storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('payment-proofs-temp')
              .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) {
              throw uploadError;
            }


            // Get public URL
            const { data: urlData } = supabase.storage
              .from('payment-proofs-temp')
              .getPublicUrl(fileName);


            uploadedUrls.push(urlData.publicUrl);
            tempFileNames.push(fileName);

          }
        } else {
          // Upload image directly
          const fileName = `${Date.now()}_${file.name}`;


          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment-proofs-temp')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }


          const { data: urlData } = supabase.storage
            .from('payment-proofs-temp')
            .getPublicUrl(fileName);


          uploadedUrls.push(urlData.publicUrl);
          tempFileNames.push(fileName);
        }
      }

      // Vérifier que les URLs ne sont pas vides
      if (uploadedUrls.length === 0 || !uploadedUrls[0]) {
        throw new Error('Aucune URL de fichier générée - problème d\'upload');
      }


      let data, funcError;

      if (isTrancheMode) {
        // Batch analysis for tranche payments
        const expectedPayments = subscriptions!.map(sub => ({
          investorName: sub.investisseur.nom_raison_sociale,
          expectedAmount: Number(sub.coupon_net) || 0,
          subscriptionId: sub.id
        }));

        const requestBody = {
          fileUrls: uploadedUrls,
          expectedPayments
        };


        const response = await supabase.functions.invoke('analyze-payment-batch', {
          body: requestBody
        });

        data = response.data;
        funcError = response.error;
      } else {
        // Single payment analysis
        const requestBody = {
          fileUrls: uploadedUrls,
          expectedAmount: payment!.montant,
          dueDate: new Date(payment!.date_paiement).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).split('/').join('-'),
          trancheName: payment!.tranche?.tranche_name || '',
          investorName: payment!.investisseur?.nom_raison_sociale || ''
        };


        const response = await supabase.functions.invoke('analyze-payment', {
          body: requestBody
        });

        data = response.data;
        funcError = response.error;
      }


      if (funcError) {
        // Check if the function doesn't exist
        if (funcError.message?.includes('not found') || funcError.message?.includes('FunctionsRelayError')) {
          const functionName = payments && payments.length > 1 ? 'analyze-payment-batch' : 'analyze-payment';
          throw new Error(`La fonction d'analyse des paiements n'est pas disponible. Veuillez contacter l'administrateur pour déployer la fonction Edge "${functionName}".`);
        }
        throw funcError;
      }
      if (!data?.succes) throw new Error(data?.erreur || 'Erreur lors de l\'analyse du paiement');

      setAnalysisResult({
        ...data,
        tempFileNames: tempFileNames
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async (match: any) => {
    try {
      const tempFileNames = analysisResult.tempFileNames;

      // Télécharger la première image
      const firstFileName = tempFileNames[0];
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('payment-proofs-temp')
        .download(firstFileName);

      if (downloadError) throw downloadError;

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
          .eq('id', subscriptionId)
          .single();

        if (subError) throw subError;

        // Create payment record
        const { data: paymentData, error: paymentError } = await supabase
          .from('paiements')
          .insert({
            tranche_id: trancheId,
            investisseur_id: subscription.investisseur_id,
            type: 'Coupon',
            montant: match.paiement.montant,
            date_paiement: match.paiement.date
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Upload file to permanent storage
        const permanentFileName = `${paymentData.id}/${Date.now()}_${files[0].name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(permanentFileName, downloadData);

        if (uploadError) throw uploadError;

        // Get permanent URL
        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(permanentFileName);

        // Save proof to database
        const { error: dbError } = await supabase
          .from('payment_proofs')
          .insert({
            paiement_id: paymentData.id,
            file_url: urlData.publicUrl,
            file_name: files[0].name,
            file_size: files[0].size,
            extracted_data: match.paiement,
            confidence: match.confiance
          });

        if (dbError) throw dbError;

      } else {
        // Single payment confirmation
        const permanentFileName = `${payment!.id}/${Date.now()}_${files[0].name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(permanentFileName, downloadData);

        if (uploadError) throw uploadError;

        // Obtenir URL permanente
        const { data: urlData } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(permanentFileName);

        // Sauvegarder dans la base de données
        const { error: dbError } = await supabase
          .from('payment_proofs')
          .insert({
            paiement_id: payment!.id,
            file_url: urlData.publicUrl,
            file_name: files[0].name,
            file_size: files[0].size,
            extracted_data: match.paiement,
            confidence: match.confiance
          });

        if (dbError) throw dbError;
      }

      // Supprimer TOUS les fichiers temp
      await supabase.storage
        .from('payment-proofs-temp')
        .remove(tempFileNames);

      onSuccess();
      onClose();

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la confirmation');
    }
  };

  const handleReject = async () => {
    if (analysisResult?.tempFileNames) {
      await supabase.storage
        .from('payment-proofs-temp')
        .remove(analysisResult.tempFileNames);
    }
    setFiles([]);
    setAnalysisResult(null);
    setError(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getMatchIcon = (status: string) => {
    if (status === 'correspondance') return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (status === 'partielle') return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-600" />;
  };

  const getMatchColor = (status: string) => {
    if (status === 'correspondance') return 'bg-green-50 border-green-200';
    if (status === 'partielle') return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Télécharger Justificatif de Paiement</h3>
              <p className="text-sm text-slate-600 mt-1">
                {isTrancheMode
                  ? `Paiement de tranche - ${subscriptions?.length || 0} investisseurs`
                  : `${payment?.tranche?.tranche_name} • ${payment?.investisseur?.nom_raison_sociale}`
                }
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
                    {subscriptions?.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                        <span className="text-slate-700">{sub.investisseur.nom_raison_sociale}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(Number(sub.coupon_net) || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
                    <span className="font-semibold text-blue-900">Total:</span>
                    <span className="font-bold text-blue-900 text-lg">
                      {formatCurrency(subscriptions?.reduce((sum, sub) => sum + (Number(sub.coupon_net) || 0), 0) || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Montant attendu</p>
                      <p className="font-bold text-slate-900">{formatCurrency(payment?.montant || 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Date d'échéance</p>
                      <p className="font-bold text-slate-900">
                        {payment?.date_paiement ? new Date(payment.date_paiement).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
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
                  {files.length > 0 ? 'Ajouter d\'autres fichiers' : 'Choisir des fichiers'}
                </label>
                <p className="text-sm text-slate-500 mt-2">PDF, PNG, JPG ou WEBP (max 10MB par fichier) - v3.0</p>
              </div>

              {files.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-2">Fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}:</h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-500 ml-2">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
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

              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || analyzing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? 'Analyse en cours...' : 'Analyser le justificatif'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {analysisResult.correspondances?.map((match: any, idx: number) => (
                <div key={idx} className={`border-2 rounded-lg p-6 ${getMatchColor(match.statut)}`}>
                  <div className="flex items-start gap-4 mb-4">
                    {getMatchIcon(match.statut)}
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">
                        {match.statut === 'correspondance' && `✅ Correspondance (${match.confiance}%)`}
                        {match.statut === 'partielle' && `⚠️ Correspondance partielle (${match.confiance}%)`}
                        {match.statut === 'pas-de-correspondance' && `❌ Pas de correspondance (${match.confiance}%)`}
                      </h4>
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
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        ✓ Confirmer & Marquer Payé
                      </button>
                    )}
                    {match.confiance <= 50 && (
                      <button
                        onClick={() => handleConfirm(match)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        ⚠️ Forcer la Confirmation
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={handleReject}
                className="w-full bg-slate-200 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-300 transition-colors mt-4"
              >
                ✗ Rejeter & Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}