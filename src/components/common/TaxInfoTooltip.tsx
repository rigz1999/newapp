import { Info } from 'lucide-react';
import type { TaxRegime } from '../../lib/database.types';

interface TaxInfoTooltipProps {
  couponBrut: number;
  couponNet: number;
  investorType: 'physique' | 'morale' | string;
  taxRegime?: TaxRegime | null;
  customTaxRate?: number | null;
  className?: string;
}

export function TaxInfoTooltip({
  couponBrut,
  couponNet,
  investorType,
  taxRegime = 'default',
  customTaxRate,
  className = '',
}: TaxInfoTooltipProps) {
  const taxAmount = couponBrut - couponNet;
  const taxRate = couponBrut > 0 ? (taxAmount / couponBrut) * 100 : 0;
  const isPhysique = investorType?.toLowerCase().includes('physique');

  // Determine tax description based on regime
  const getTaxDescription = () => {
    if (!isPhysique) {
      return 'Personne morale : pas de prélèvement forfaitaire';
    }

    if (taxRegime === 'exempt') {
      return 'Prélèvement désactivé : aucune retenue';
    }

    return 'PFU (Prélèvement Forfaitaire Unique) : 30%';
  };

  return (
    <div className={`relative inline-flex items-center group ${className}`}>
      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-72">
        <div className="bg-gray-900 text-white text-sm rounded-lg p-4 shadow-lg">
          <div className="font-semibold mb-2">Détail du coupon</div>

          <div className="space-y-2">
            {/* Coupon brut */}
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Coupon brut :</span>
              <span className="font-medium">{couponBrut.toFixed(2)} €</span>
            </div>

            {/* Tax breakdown - only show if there's tax */}
            {taxAmount > 0 && (
              <>
                <div className="flex justify-between items-center text-orange-300">
                  <span>Prélèvement ({taxRate.toFixed(1)}%) :</span>
                  <span>- {taxAmount.toFixed(2)} €</span>
                </div>
                <div className="border-t border-gray-700 my-2"></div>
              </>
            )}

            {/* Coupon net */}
            <div className="flex justify-between items-center font-semibold text-green-400">
              <span>Coupon net :</span>
              <span>{couponNet.toFixed(2)} €</span>
            </div>
          </div>

          {/* Tax regime info */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400">{getTaxDescription()}</div>
            {isPhysique && taxRegime === 'default' && (
              <div className="text-xs text-gray-500 mt-1">
                12,8% IR + 17,2% prélèvements sociaux
              </div>
            )}
          </div>

          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
