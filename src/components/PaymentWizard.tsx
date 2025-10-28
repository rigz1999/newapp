import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader, FileText, AlertTriangle, Upload, ArrowLeft, Trash2 } from 'lucide-react';
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

  // 🗑️ NOUVELLE FONCTION: Supprimer un fichier
  const handleDeleteFile = (indexToDelete: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
  };

  // ⚡ HELPER : Compresser une image
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

  // ========================================
  // ⚡ NOUVELLE FONCTION handleAnalyze OPTIMISÉE
  // ========================================
  const handleAnalyze = async () => {
    if (files.length === 0) return;

    console.time('⏱️ TOTAL');
    setAnalyzing(true);
    setError('');

    try {
      const extractedTexts: string[] = [];
      const tmpFileNames: string[] = [];

      // ✅ Phase 1: Upload & Extract (Parallélisé)
      console.time('⏱️ Upload & Extract');
      
      const filePromises = files.map(async (file, index) => {
        const tempFileName = `temp_${Date.now()}_${index}_${file.name}`;
        tmpFileNames.push(tempFileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('factures')
          .upload(tempFileName, file);

        if (uploadError) throw uploadError;

        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }

          return fullText;
        } else {
          const imageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          const base64Image = await compressImage(imageDataUrl, 0.7);
          
          const prompt = `Analyze this bank transfer receipt and extract EXACTLY:
1. Beneficiary name (Bénéficiaire)
2. Amount (Montant) in EUR
3. Date (Date du virement)
4. Reference number

Return ONLY raw data, one per line. No explanation.`;

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 500,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
                  { type: 'text', text: prompt }
                ]
              }]
            })
          });

          if (!response.ok) throw new Error('API Error');
          
          const result = await response.json();
          return result.content[0].text;
        }
      });

      const texts = await Promise.all(filePromises);
      extractedTexts.push(...texts);
      setTempFileNames(tmpFileNames);

      console.timeEnd('⏱️ Upload & Extract');

      // ✅ Phase 2: Matching
      console.time('⏱️ Matching');
      
      const matchPrompt = `You are a payment matching expert. Match each payment to a subscription based on beneficiary name and amount.

SUBSCRIPTIONS DATABASE:
${JSON.stringify(subscriptions.map(s => ({
        id: s.id,
        investor: s.investisseur.nom_raison_sociale,
        amount: s.coupon_net
      })), null, 2)}

PAYMENTS TO MATCH:
${extractedTexts.map((text, i) => `PAYMENT ${i + 1}:\n${text}\n`).join('\n---\n')}

RESPOND WITH VALID JSON ONLY (no markdown, no explanation):
{
  "matches": [
    {
      "paymentIndex": 0,
      "payment": {
        "beneficiaire": "Exact Name",
        "montant": 183.75,
        "date": "2024-01-15",
        "reference": "REF123"
      },
      "subscriptionId": "uuid-or-null",
      "confidence": 95,
      "status": "correspondance"
    }
  ]
}

Rules:
- confidence 85-100 = "correspondance"
- confidence 60-84 = "partielle"  
- confidence <60 = "pas-de-correspondance"
- If no match, subscriptionId = null, confidence = 0`;

      const matchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{ role: 'user', content: matchPrompt }]
        })
      });

      if (!matchResponse.ok) throw new Error('Matching failed');

      const matchResult = await matchResponse.json();
      let rawText = matchResult.content[0].text;

      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(rawText);

      console.timeEnd('⏱️ Matching');

      // ✅ Phase 3: Build Results
      const finalMatches: PaymentMatch[] = parsed.matches.map((m: any) => {
        const sub = m.subscriptionId 
          ? subscriptions.find(s => s.id === m.subscriptionId)
          : undefined;

        const ecartMontant = sub 
          ? Math.abs(m.payment.montant - sub.coupon_net).toFixed(2)
          : '0';
        
        const ecartPourcent = sub && sub.coupon_net > 0
          ? ((Math.abs(m.payment.montant - sub.coupon_net) / sub.coupon_net) * 100).toFixed(1)
          : '0';

        return {
          paiement: m.payment,
          matchedSubscription: sub,
          statut: m.status,
          confiance: m.confidence,
          details: {
            ecartMontant,
            ecartMontantPourcent: ecartPourcent
          }
        };
      });

      setMatches(finalMatches);
      setStep('results');

      console.timeEnd('⏱️ TOTAL');

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
      
      if (tempFileNames.length > 0) {
        await Promise.all(
          tempFileNames.map(fn => 
            supabase.storage.from('factures').remove([fn]).catch(() => {})
          )
        );
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleValidateSelected = async () => {
    if (selectedMatches.size === 0) return;

    setProcessing(true);
    setError('');

    try {
      const selectedMatchesList = Array.from(selectedMatches).map(idx => matches[idx]);

      const paiementsToInsert = selectedMatchesList.map((match) => ({
        tranche_id: selectedTrancheId,
        montant: match.paiement.montant,
        date_paiement: match.paiement.date || new Date().toISOString().split('T')[0],
        beneficiaire: match.paiement.beneficiaire,
        reference_transaction: match.paiement.reference || '',
        investisseur_id: match.matchedSubscription?.investisseur_id || null,
        statut_matching: match.statut,
        confiance_matching: match.confiance,
      }));

      const { data: insertedPayments, error: insertError } = await supabase
        .from('paiements')
        .insert(paiementsToInsert)
        .select('id');

      if (insertError) throw insertError;

      if (insertedPayments && tempFileNames.length > 0) {
        const fileAssociations = insertedPayments.flatMap((payment, idx) => 
          tempFileNames.map(tempName => ({
            paiement_id: payment.id,
            file_url: tempName,
            file_name: files[idx % files.length].name,
            file_type: files[idx % files.length].type,
          }))
        );

        const { error: fileError } = await supabase
          .from('paiement_files')
          .insert(fileAssociations);

        if (fileError) console.error('File association error:', fileError);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Validation error:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateAll = async () => {
    setProcessing(true);
    setError('');

    try {
      const validMatches = matches.filter(m => m.statut === 'correspondance');

      const paiementsToInsert = validMatches.map((match) => ({
        tranche_id: selectedTrancheId,
        montant: match.paiement.montant,
        date_paiement: match.paiement.date || new Date().toISOString().split('T')[0],
        beneficiaire: match.paiement.beneficiaire,
        reference_transaction: match.paiement.reference || '',
        investisseur_id: match.matchedSubscription?.investisseur_id || null,
        statut_matching: match.statut,
        confiance_matching: match.confiance,
      }));

      const { data: insertedPayments, error: insertError } = await supabase
        .from('paiements')
        .insert(paiementsToInsert)
        .select('id');

      if (insertError) throw insertError;

      if (insertedPayments && tempFileNames.length > 0) {
        const fileAssociations = insertedPayments.flatMap((payment, idx) =>
          tempFileNames.map(tempName => ({
            paiement_id: payment.id,
            file_url: tempName,
            file_name: files[idx % files.length].name,
            file_type: files[idx % files.length].type,
          }))
        );

        const { error: fileError } = await supabase
          .from('paiement_files')
          .insert(fileAssociations);

        if (fileError) console.error('File association error:', fileError);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Validation error:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const toggleMatchSelection = (index: number) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const validMatches = matches.filter(m => m.statut === 'correspondance');
  const selectedMatchesList = Array.from(selectedMatches).map(idx => matches[idx]);
  const hasPartialInSelection = selectedMatchesList.some(m => m.statut === 'partielle');
  const hasNoMatchInSelection = selectedMatchesList.some(m => m.statut === 'pas-de-correspondance');
  const noMatchList = selectedMatchesList.filter(m => m.statut === 'pas-de-correspondance');

  const totalAmount = subscriptions.reduce((sum, sub) => sum + sub.coupon_net, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <button
                onClick={handleBackToSelect}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={analyzing || processing}
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Télécharger Justificatif de Paiement</h2>
              <p className="text-sm text-slate-600">
                {step === 'select' && 'Sélectionnez un projet et une tranche'}
                {step === 'upload' && `Paiement de tranche - ${subscriptions.length} investisseur${subscriptions.length > 1 ? 's' : ''}`}
                {step === 'results' && 'Résultats de l\'analyse'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={analyzing || processing}
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Projet
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.projet}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tranche
                  </label>
                  <select
                    value={selectedTrancheId}
                    onChange={(e) => setSelectedTrancheId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Sélectionner une tranche</option>
                    {tranches.map(tranche => (
                      <option key={tranche.id} value={tranche.id}>
                        {tranche.tranche_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Cette tranche contient {subscriptions.length} investisseur{subscriptions.length > 1 ? 's' : ''}. 
                  Le justificatif de paiement doit contenir tous les paiements individuels.
                </p>
                <p className="text-lg font-bold text-blue-900 mt-2">
                  Montant total à payer: {formatCurrency(totalAmount)}
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={analyzing}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    Choisir des fichiers
                  </p>
                  <p className="text-sm text-slate-500">
                    PDF, PNG, JPG ou WEBP (max 10MB par fichier)
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Fichiers sélectionnés ({files.length}):
                  </h3>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(index)}
                          className="ml-2 p-2 hover:bg-red-100 rounded-lg transition-colors group"
                          title="Supprimer ce fichier"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || analyzing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Analyser le justificatif
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    {matches.length} paiement{matches.length > 1 ? 's' : ''} détecté{matches.length > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-sm text-green-700">
                  {validMatches.length} correspondance{validMatches.length > 1 ? 's' : ''} exacte{validMatches.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedMatches.size === matches.length && matches.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMatches(new Set(matches.map((_, i) => i)));
                            } else {
                              setSelectedMatches(new Set());
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Confiance</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Bénéficiaire</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Montant</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Correspondance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matches.map((match, index) => (
                      <tr key={index} className={`hover:bg-slate-50 ${
                        selectedMatches.has(index) ? 'bg-blue-50' : ''
                      }`}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMatches.has(index)}
                            onChange={() => toggleMatchSelection(index)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          {match.statut === 'correspondance' && (
                            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full w-fit">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">{match.confiance}%</span>
                            </div>
                          )}
                          {match.statut === 'partielle' && (
                            <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-full w-fit">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-700">{match.confiance}%</span>
                            </div>
                          )}
                          {match.statut === 'pas-de-correspondance' && (
                            <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded-full w-fit">
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
                
                {/* WARNINGS EN HAUT */}
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
                
                {/* LISTE DES PAIEMENTS */}
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