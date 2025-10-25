import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, AlertCircle, Loader, FileText, AlertTriangle, Upload } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure le worker avec la version 5.4
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

  const [step, setStep] = useState<'select' | 'upload' | 'results'>('select');

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

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setAnalyzing(true);
    setError('');

    try {
      let uploadedUrls: string[] = [];
      let tempFileNames: string[] = [];

      for (const file of files) {
        if (file.type === 'application/pdf') {
          console.log('Conversion PDF → Images:', file.name);
          
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          
          console.log(`PDF de ${numPages} page(s)`);

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

            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((b) => resolve(b!), 'image/png');
            });
            
            const fileName = `${Date.now()}_${file.name.replace('.pdf', '')}_page${pageNum}.png`;
            
            const { error: uploadError } = await supabase.storage
              .from('payment-proofs-temp')
              .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from('payment-proofs-temp')
              .getPublicUrl(fileName);

            uploadedUrls.push(urlData.publicUrl);
            tempFileNames.push(fileName);
          }
        } else {
          const fileName = `${Date.now()}_${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs-temp')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('payment-proofs-temp')
            .getPublicUrl(fileName);

          uploadedUrls.push(urlData.publicUrl);
          tempFileNames.push(fileName);
        }
      }

      console.log('Fichiers uploadés:', uploadedUrls);

      const expectedPayments = subscriptions.map(sub => ({
        investorName: sub.investisseur.nom_raison_sociale,
        expectedAmount: sub.coupon_net,
        subscriptionId: sub.id,
        investisseurId: sub.investisseur_id
      }));

      console.log('Paiements attendus:', expectedPayments);

      const { data, error: funcError } = await supabase.functions.invoke('analyze-payment-batch', {
        body: {
          fileUrls: uploadedUrls,
          expectedPayments: expectedPayments
        }
      });

      console.log('Réponse Edge Function:', data);

      if (funcError) throw funcError;
      if (!data.succes) throw new Error(data.erreur);

      await supabase.storage
        .from('payment-proofs-temp')
        .remove(tempFileNames);

      const enrichedMatches = data.correspondances.map((match: any) => {
        const subscription = subscriptions.find(
          s => s.investisseur.nom_raison_sociale.toLowerCase() === match.paiement.beneficiaire.toLowerCase()
        );
        return {
          ...match,
          matchedSubscription: subscription
        };
      });

      setMatches(enrichedMatches);
      setStep('results');

    } catch (err: any) {
      console.error('Erreur analyse:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleValidateAll = async () => {
    setProcessing(true);
    setError('');

    try {
      const validMatches = matches.filter(m => m.statut === 'correspondance' && m.matchedSubscription);

      const payments = validMatches.map(match => ({
        id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'Coupon',
        projet_id: selectedProjectId,
        tranche_id: selectedTrancheId,
        investisseur_id: match.matchedSubscription!.investisseur_id,
        souscription_id: match.matchedSubscription!.id,
        montant: match.paiement.montant,
        date_paiement: new Date().toISOString().split('T')[0],
        statut: 'Payé'
      }));

      const { error: insertError } = await supabase
        .from('paiements')
        .insert(payments);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateOne = async (match: PaymentMatch) => {
    if (!match.matchedSubscription) return;

    try {
      const { error: insertError } = await supabase
        .from('paiements')
        .insert({
          id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'Coupon',
          projet_id: selectedProjectId,
          tranche_id: selectedTrancheId,
          investisseur_id: match.matchedSubscription.investisseur_id,
          souscription_id: match.matchedSubscription.id,
          montant: match.paiement.montant,
          date_paiement: new Date().toISOString().split('T')[0],
          statut: 'Payé'
        });

      if (insertError) throw insertError;

      setMatches(matches.filter(m => m !== match));

      if (matches.length === 1) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {step === 'select' && 'Enregistrer un Paiement de Tranche'}
              {step === 'upload' && 'Télécharger Justificatif de Paiement'}
              {step === 'results' && 'Résultats de l\'Analyse'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {step === 'select' && 'Sélectionnez un projet et une tranche à payer'}
              {step === 'upload' && `Paiement de tranche - ${subscriptions.length} investisseur${subscriptions.length > 1 ? 's' : ''}`}
              {step === 'results' && `${validMatches.length}/${matches.length} paiement${matches.length > 1 ? 's' : ''} validé${validMatches.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* STEP 1: SELECT PROJECT & TRANCHE */}
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

          {/* STEP 2: UPLOAD FILES */}
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
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={analyzing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choisir des fichiers
                </label>
                <p className="text-sm text-slate-500 mt-2">PDF, PNG, JPG ou WEBP (max 10MB par fichier)</p>
              </div>

              {files.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Fichiers sélectionnés ({files.length}):</h4>
                  <ul className="space-y-2">
                    {files.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</span>
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

          {/* STEP 3: RESULTS - COMPACT TABLE VIEW */}
          {true && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{validMatches.length}/{matches.length}</span> paiement{matches.length > 1 ? 's' : ''} validé{validMatches.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600">Total extrait</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(matches.reduce((sum, m) => sum + m.paiement.montant, 0))}
                  </p>
                </div>
              </div>

              {/* Compact Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Statut</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Bénéficiaire Détecté</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Montant</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Correspondance</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">Action</th>
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

                        <td className="px-3 py-3 text-center">
                          {match.statut === 'correspondance' ? (
                            <button
                              onClick={() => handleValidateOne(match)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Valider
                            </button>
                          ) : match.statut === 'partielle' ? (
                            <button
                              onClick={() => handleValidateOne(match)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Forcer
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
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

        {/* Footer */}
        {step === 'results' && (
          <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 flex gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={processing}
            >
              Annuler
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
                  Valider tous ({validMatches.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}