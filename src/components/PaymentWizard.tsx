import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, CheckCircle, AlertCircle, Loader, FileText, AlertTriangle } from 'lucide-react';

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

interface PDFExtraction {
  file: File;
  fileName: string;
  extractedText: string;
  detectedInvestor: string;
  detectedAmount: number;
  matchedSubscription?: Subscription;
  matchStatus: 'ok' | 'mismatch' | 'no_match';
  matchReason?: string;
  manualOverride?: {
    subscriptionId: string;
    amount: number;
  };
}

interface PaymentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentWizard({ onClose, onSuccess }: PaymentWizardProps) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTrancheId, setSelectedTrancheId] = useState('');
  const [pdfExtractions, setPdfExtractions] = useState<PDFExtraction[]>([]);

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

  const normalizeAmount = (text: string): number => {
    const cleanText = text.replace(/\s/g, '');

    const patterns = [
      /(\d+[,\s]?\d*[,\s]?\d+[.,]\d{2})/,
      /(\d+[.,]\d{2})/,
      /(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let numberStr = match[1]
          .replace(/\s/g, '')
          .replace(',', '.');

        if (numberStr.split('.').length > 2) {
          const parts = numberStr.split('.');
          numberStr = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        }

        const parsed = parseFloat(numberStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
  };

  const fuzzyMatch = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matches = 0;
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(words1.length, words2.length);
  };

  const extractPDFText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.readAsText(file);
    });
  };

  const findMatchingSubscription = (investorName: string, amount: number):
    { subscription?: Subscription; status: 'ok' | 'mismatch' | 'no_match'; reason?: string } => {

    const matches: Array<{ sub: Subscription; score: number; amountMatch: boolean }> = [];

    for (const sub of subscriptions) {
      const nameScore = fuzzyMatch(investorName, sub.investisseur.nom_raison_sociale);
      const amountMatch = Math.abs(sub.coupon_net - amount) < 0.01 ||
                          Math.abs(sub.montant_investi - amount) < 0.01;

      if (nameScore > 0.5) {
        matches.push({ sub, score: nameScore, amountMatch });
      }
    }

    if (matches.length === 0) {
      return { status: 'no_match', reason: 'Aucun investisseur correspondant trouvé' };
    }

    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];

    if (best.score > 0.8 && best.amountMatch) {
      return { subscription: best.sub, status: 'ok' };
    }

    if (best.score > 0.6) {
      const reason = best.amountMatch
        ? 'Nom partiellement correspondant'
        : 'Montant ne correspond pas';
      return { subscription: best.sub, status: 'mismatch', reason };
    }

    return { status: 'no_match', reason: 'Correspondance incertaine' };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!selectedTrancheId) {
      setError('Veuillez d\'abord sélectionner un projet et une tranche');
      return;
    }

    setProcessing(true);
    setError('');

    const extractions: PDFExtraction[] = [];

    for (const file of files) {
      if (!file.name.endsWith('.pdf') && !file.type.includes('pdf')) {
        continue;
      }

      try {
        const text = await extractPDFText(file);

        const lines = text.split('\n').filter(l => l.trim());
        const detectedInvestor = lines.find(l => l.length > 3 && l.length < 100) || 'Inconnu';
        const amountLine = lines.find(l => /\d+[,.\s]\d+/.test(l)) || '0';
        const detectedAmount = normalizeAmount(amountLine);

        const match = findMatchingSubscription(detectedInvestor, detectedAmount);

        extractions.push({
          file,
          fileName: file.name,
          extractedText: text,
          detectedInvestor,
          detectedAmount,
          matchedSubscription: match.subscription,
          matchStatus: match.status,
          matchReason: match.reason,
        });
      } catch (err) {
        console.error('Error processing PDF:', err);
      }
    }

    setPdfExtractions(extractions);
    setProcessing(false);
  };

  const handleManualCorrection = (index: number, subscriptionId: string, amount: number) => {
    const updated = [...pdfExtractions];
    const sub = subscriptions.find(s => s.id === subscriptionId);

    updated[index] = {
      ...updated[index],
      manualOverride: { subscriptionId, amount },
      matchedSubscription: sub,
      matchStatus: 'ok',
    };

    setPdfExtractions(updated);
  };

  const handleValidate = async () => {
    setProcessing(true);
    setError('');

    try {
      for (const extraction of pdfExtractions) {
        if (extraction.matchStatus !== 'ok') continue;

        const subscriptionId = extraction.manualOverride?.subscriptionId ||
                              extraction.matchedSubscription?.id;
        const amount = extraction.manualOverride?.amount ||
                      extraction.detectedAmount;

        if (!subscriptionId) continue;

        await supabase.from('paiements').insert({
          id_paiement: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'coupon',
          projet_id: selectedProjectId,
          tranche_id: selectedTrancheId,
          investisseur_id: extraction.matchedSubscription?.investisseur_id,
          souscription_id: subscriptionId,
          montant: amount,
          date_paiement: new Date().toISOString().split('T')[0],
          statut: 'Payé',
          proof_url: extraction.fileName,
          ocr_raw_text: extraction.extractedText,
          matched: !extraction.manualOverride,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setProcessing(false);
    }
  };

  const allOk = pdfExtractions.length > 0 &&
                pdfExtractions.every(e => e.matchStatus === 'ok');
  const hasErrors = pdfExtractions.some(e => e.matchStatus !== 'ok');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Enregistrer Paiement</h3>
            <p className="text-sm text-slate-600 mt-1">Upload PDF proofs and match payments</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Projet
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projet}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Tranche
              </label>
              <select
                value={selectedTrancheId}
                onChange={(e) => setSelectedTrancheId(e.target.value)}
                disabled={!selectedProjectId}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="">Sélectionnez une tranche</option>
                {tranches.map((tranche) => (
                  <option key={tranche.id} value={tranche.id}>
                    {tranche.tranche_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Preuves de paiement (PDF)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
                disabled={!selectedTrancheId || processing}
              />
              <label
                htmlFor="pdf-upload"
                className={`inline-block px-6 py-2 rounded-lg transition-colors ${
                  !selectedTrancheId || processing
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {processing ? 'Traitement en cours...' : 'Sélectionner des fichiers PDF'}
              </label>
              <p className="text-sm text-slate-600 mt-2">
                Vous pouvez sélectionner plusieurs fichiers
              </p>
            </div>
          </div>

          {pdfExtractions.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-4">
                Révision ({pdfExtractions.length} fichier{pdfExtractions.length > 1 ? 's' : ''})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">PDF</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Investisseur détecté</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Montant détecté</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Correspondance</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfExtractions.map((extraction, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-700">{extraction.fileName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {extraction.detectedInvestor.substring(0, 40)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {extraction.detectedAmount.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          {extraction.matchedSubscription ? (
                            <div className="text-sm">
                              <p className="font-medium text-slate-900">
                                {extraction.matchedSubscription.investisseur.nom_raison_sociale}
                              </p>
                              <p className="text-slate-600">
                                {extraction.matchedSubscription.coupon_net.toFixed(2)} €
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Aucune correspondance</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {extraction.matchStatus === 'ok' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </span>
                          ) : extraction.matchStatus === 'mismatch' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              {extraction.matchReason}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              Pas de match
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasErrors && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium">
                    Certains paiements nécessitent une correction manuelle
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={processing}
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            disabled={processing || pdfExtractions.length === 0 || !allOk}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Valider {pdfExtractions.length > 0 && `(${pdfExtractions.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
