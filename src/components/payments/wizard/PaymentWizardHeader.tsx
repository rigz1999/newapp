import { X, ArrowLeft } from 'lucide-react';
import type { WizardStep } from './types';

interface PaymentWizardHeaderProps {
  step: WizardStep;
  subscriptionCount: number;
  selectedMatchCount: number;
  onBack: () => void;
  onClose: () => void;
  showBackButton: boolean;
}

export function PaymentWizardHeader({
  step,
  subscriptionCount,
  selectedMatchCount,
  onBack,
  onClose,
  showBackButton,
}: PaymentWizardHeaderProps) {
  const getTitle = () => {
    switch (step) {
      case 'select':
        return 'Enregistrer un paiement de tranche';
      case 'echeance':
        return "Sélection de l'échéance";
      case 'upload':
        return 'Télécharger justificatif de paiement';
      case 'results':
        return "Résultats de l'analyse";
      default:
        return '';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'select':
        return 'Sélectionnez un projet et une tranche';
      case 'echeance':
        return 'Quelle échéance payez-vous?';
      case 'upload':
        return `${subscriptionCount} paiement${subscriptionCount > 1 ? 's' : ''} attendu${subscriptionCount > 1 ? 's' : ''}`;
      case 'results':
        return `${selectedMatchCount} paiement${selectedMatchCount > 1 ? 's' : ''} sélectionné${selectedMatchCount > 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  return (
    <div className="sticky top-0 bg-white p-6 border-b border-slate-200 flex justify-between items-center rounded-t-2xl z-10">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Retour"
            aria-label="Retour à la sélection"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        )}
        <div>
          <h3 id="payment-wizard-title" className="text-xl font-bold text-slate-900">
            {getTitle()}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {getSubtitle()}
          </p>
        </div>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fermer la fenêtre">
        <X className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
  );
}
