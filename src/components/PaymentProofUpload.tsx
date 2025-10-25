import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure le worker avec unpkg
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PaymentProofUploadProps {
  payment: {
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
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentProofUpload({ payment, onClose, onSuccess }: PaymentProofUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(f => {
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(f.type)) {
          setError('Seuls les fichiers PDF, PNG, JPG et WEBP sont acceptés');
          return false;
        }
        if (f.size > 10 * 1024 * 1024) {
          setError('Taille maximale: 10MB');
          return false;
        }
        return true;
      });
      setFiles(validFiles);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setError(null);

    try {
      const file = files[0];
      let uploadedUrls: string[] = [];
      let tempFileNames: string[] = [];

      // Si c'est un PDF, convertir TOUTES les pages en images
      if (file.type === 'application/pdf') {
        console.log('Conversion PDF → Images...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        console.log(`PDF de ${numPages} page(s) détecté`);

        // Convertir chaque page
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

          // Convertir canvas en blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
          
          const fileName = `${Date.now()}_page${pageNum}_${file.name.replace('.pdf', '.png')}`;
          
          // Upload vers storage temporaire
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs-temp')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          // Obtenir l'URL publique
          const { data: urlData } = supabase.storage
            .from('payment-proofs-temp')
            .getPublicUrl(fileName);

          uploadedUrls.push(urlData.publicUrl);
          tempFileNames.push(fileName);
          
          console.log(`Page ${pageNum}/${numPages} convertie`);
        }
        
        console.log('Toutes les pages converties!');
      } else {
        // Si c'est déjà une image
        const fileName = `${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs-temp')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-proofs-temp')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
        tempFileNames.push(fileName);
      }

      console.log('Analyse des fichiers:', uploadedUrls);

      // Appeler la fonction Edge pour analyser
      const { data, error: funcError } = await supabase.functions.invoke('analyze-payment', {
        body: {
          fileUrls: uploadedUrls,
          expectedAmount: payment.montant,
          dueDate: new Date(payment.date_paiement).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
          }).split('/').join('-'),
          trancheName: payment.tranche?.tranche_name || '',
          investorName: payment.investisseur?.nom_raison_sociale || ''
        }
      });

      if (funcError) throw funcError;
      if (!data.succes) throw new Error(data.erreur);

      setAnalysisResult({
        ...data,
        tempFileNames: tempFileNames
      });

    } catch (err: any) {
      console.error('Erreur analyse:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async (match: any) => {
    try {
      const tempFileNames = analysisResult.tempFileNames;

      // Télécharger la première image (ou toutes si besoin)
      const firstFileName = tempFileNames[0];
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('payment-proofs-temp')
        .download(firstFileName);

      if (downloadError) throw downloadError;

      // Upload vers storage permanent
      const permanentFileName = `${payment.id}/${Date.now()}_${files[0].name}`;
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
          paiement_id: payment.id,
          file_url: urlData.publicUrl,
          file_name: files[0].name,
          file_size: files[0].size,
          extracted_data: match.paiement,
          confidence: match.confiance
        });

      if (dbError) throw dbError;

      // Mettre à jour le statut du paiement
      const { error: updateError } = await supabase
        .from('paiements')
        .update({ statut: 'Payé' })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Supprimer TOUS les fichiers temp
      await supabase.storage
        .from('payment-proofs-temp')
        .remove(tempFileNames);

      onSuccess();
      onClose();

    } catch (err: any) {
      console.error('Erreur confirmation:', err);
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
                {payment.tranche?.tranche_name} • {payment.investisseur?.nom_raison_sociale}
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
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Montant attendu</p>
                    <p className="font-bold text-slate-900">{formatCurrency(payment.montant)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date d'échéance</p>
                    <p className="font-bold text-slate-900">
                      {new Date(payment.date_paiement).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choisir un PDF ou une image
                </label>
                <p className="text-sm text-slate-500 mt-2">PDF, PNG, JPG ou WEBP (max 10MB)</p>
              </div>

              {files.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-slate-900 mb-2">Fichier sélectionné:</h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
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
                        <p><span className="text-slate-600">Investisseur:</span> <span className="font-medium">{match.attendu.investisseur}</span></p>
                        <p><span className="text-slate-600">Montant:</span> <span className="font-medium">{formatCurrency(match.attendu.montant)}</span></p>
                        <p><span className="text-slate-600">Date échéance:</span> <span className="font-medium">{match.attendu.dateEcheance}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-600">
                      Différence montant: {formatCurrency(parseFloat(match.details.ecartMontant))} ({match.details.ecartMontantPourcent}%) • 
                      Différence date: {match.details.ecartJours} jour{match.details.ecartJours > 1 ? 's' : ''}
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