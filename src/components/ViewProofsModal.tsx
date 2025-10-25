import { X, Download, Eye } from 'lucide-react';

interface ViewProofsModalProps {
  payment: any;
  proofs: any[];
  onClose: () => void;
}

export function ViewProofsModal({ payment, proofs, onClose }: ViewProofsModalProps) {
  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const downloadAllAsZip = async () => {
    // Téléchargement simple: un par un
    // Pour un vrai ZIP, il faudrait installer jszip
    proofs.forEach(proof => {
      setTimeout(() => {
        downloadFile(proof.file_url, proof.file_name);
      }, 100);
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Justificatifs de Paiement</h3>
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
          {proofs.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucun justificatif</p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {proofs.map((proof) => (
                  <div key={proof.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">📄 {proof.file_name}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Téléchargé: {new Date(proof.validated_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {proof.extracted_data && (
                          <p className="text-xs text-slate-600 mt-1">
                            Montant: {formatCurrency(proof.extracted_data.montant)} • Confiance: {proof.confidence}%
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(proof.file_url, '_blank')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => downloadFile(proof.file_url, proof.file_name)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {proofs.length > 1 && (
                <button
                  onClick={downloadAllAsZip}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Télécharger Tous
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}