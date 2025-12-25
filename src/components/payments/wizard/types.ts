export interface Project {
  id: string;
  projet: string;
}

export interface Tranche {
  id: string;
  tranche_name: string;
}

export interface Subscription {
  id: string;
  investisseur_id: string;
  montant_investi: number;
  coupon_net: number;
  investisseur: {
    nom_raison_sociale: string;
  };
}

export interface Echeance {
  id: string;
  date_echeance: string;
  montant_coupon: number;
  statut: string;
  souscription_id: string;
}

export interface EcheanceGroup {
  date: string;
  totalAmount: number;
  count: number;
  statut: 'paye' | 'en_retard' | 'a_venir';
  daysOverdue?: number;
  echeances: Echeance[];
}

export interface PaymentMatch {
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
    nameScore?: number;
  };
}

export type WizardStep = 'select' | 'echeance' | 'upload' | 'results';
