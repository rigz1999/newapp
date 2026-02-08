import { CheckCircle, AlertCircle, AlertTriangle, FileText, Calendar } from 'lucide-react';
import type { PaymentMatch } from './types';

interface PaymentMatchCardProps {
  match: PaymentMatch;
  index: number;
  isSelected: boolean;
  onToggleSelect: (index: number) => void;
  formatCurrency: (amount: number) => string;
}

export function PaymentMatchCard({
  match,
  index,
  isSelected,
  onToggleSelect,
  formatCurrency,
}: PaymentMatchCardProps) {
  const amountDiff = match.matchedSubscription
    ? Math.abs(match.paiement.montant - match.matchedSubscription.coupon_net)
    : 0;

  const amountDiffPercent = match.matchedSubscription
    ? (amountDiff / match.matchedSubscription.coupon_net) * 100
    : 0;

  return (
    <div
      onClick={() => onToggleSelect(index)}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${
        match.statut === 'correspondance'
          ? 'ring-2 ring-green-200'
          : match.statut === 'partielle'
            ? 'ring-2 ring-yellow-200'
            : 'ring-2 ring-red-200'
      }`}
      role="article"
      aria-label={`Résultat de paiement pour ${match.matchedSubscription?.investisseur?.nom_raison_sociale || match.paiement.beneficiaire}`}
    >
      {/* Header: Checkbox + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`payment-match-${index}`}
            checked={isSelected}
            onChange={() => onToggleSelect(index)}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            onClick={e => e.stopPropagation()}
            aria-label={`Sélectionner le paiement de ${match.matchedSubscription?.investisseur?.nom_raison_sociale || 'cet investisseur'}`}
          />
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
              match.statut === 'correspondance'
                ? 'bg-green-100 text-green-800'
                : match.statut === 'partielle'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
            role="status"
            aria-label={`Statut: ${
              match.statut === 'correspondance'
                ? 'Correspondance exacte'
                : match.statut === 'partielle'
                  ? 'Correspondance partielle'
                  : 'Pas de correspondance'
            }`}
          >
            {match.statut === 'correspondance' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                Correspondance {match.confiance}%
              </>
            ) : match.statut === 'partielle' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Partielle {match.confiance}%
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                Pas de correspondance
              </>
            )}
          </div>
        </div>
        {match.paiement.reference && (
          <span className="text-xs text-slate-500">Réf: {match.paiement.reference}</span>
        )}
      </div>

      {/* Inline Diff: Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Extracted Payment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-700 uppercase">
              Détecté dans le PDF
            </span>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-xs text-slate-600">Bénéficiaire</p>
              <p className="text-sm font-semibold text-slate-900">{match.paiement.beneficiaire}</p>
            </div>

            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-xs text-slate-600">Montant</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(match.paiement.montant)}
                </p>
              </div>
              {match.paiement.date && (
                <div>
                  <p className="text-xs text-slate-600">Date</p>
                  <p className="text-sm text-slate-700">{match.paiement.date}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Expected/Matched Subscription */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-700 uppercase">
              Attendu (Échéance)
            </span>
          </div>

          {match.matchedSubscription ? (
            <div
              className={`rounded-lg p-3 space-y-2 ${
                match.statut === 'correspondance'
                  ? 'bg-green-50'
                  : match.statut === 'partielle'
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
              }`}
            >
              <div>
                <p className="text-xs text-slate-600">Investisseur</p>
                <p
                  className={`text-sm font-semibold ${
                    match.statut === 'correspondance'
                      ? 'text-green-900'
                      : match.statut === 'partielle'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                  }`}
                >
                  {match.matchedSubscription.investisseur.nom_raison_sociale}
                </p>
                {match.details?.nameScore && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Correspondance nom: {match.details.nameScore}%
                  </p>
                )}
              </div>

              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-xs text-slate-600">Montant attendu</p>
                  <p
                    className={`text-lg font-bold ${
                      Math.abs(amountDiff) < 0.01
                        ? 'text-green-700'
                        : amountDiffPercent < 5
                          ? 'text-yellow-700'
                          : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(match.matchedSubscription.coupon_net)}
                  </p>
                  {Math.abs(amountDiff) >= 0.01 && (
                    <p className="text-xs text-red-600 mt-1">
                      Écart: {formatCurrency(amountDiff)} ({amountDiffPercent.toFixed(1)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">Aucune correspondance trouvée</p>
              <p className="text-xs text-red-600 mt-1">
                Vérifiez le nom du bénéficiaire et le montant
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
