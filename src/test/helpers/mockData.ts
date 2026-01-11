export const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  role: 'admin',
};

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2025-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User',
  },
  aud: 'authenticated',
  role: 'authenticated',
};

export const mockProject = {
  id: 'project-123',
  projet: 'Test Project',
  emetteur: 'Test Emetteur',
  siren_emetteur: '732829320',
  montant_total: 1000000,
  taux_nominal: 5.0,
  date_emission: '2025-01-01',
  date_remboursement_initial: '2030-01-01',
  periodicite: 'annuelle' as const,
  representant_masse: 'Test Rep',
  email_representant_masse: 'rep@example.com',
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockInvestor = {
  id: 'investor-123',
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean.dupont@example.com',
  telephone: '0123456789',
  adresse: '123 Rue Test',
  ville: 'Paris',
  code_postal: '75001',
  pays: 'France',
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockTranche = {
  id: 'tranche-123',
  projet_id: 'project-123',
  nom_tranche: 'Tranche A',
  taux_nominal: 5.0,
  montant: 500000,
  date_emission: '2025-01-01',
  date_echeance_initiale: '2030-01-01',
  periodicite: 'annuelle' as const,
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockSubscription = {
  id: 'subscription-123',
  tranche_id: 'tranche-123',
  investisseur_id: 'investor-123',
  montant_investi: 10000,
  date_souscription: '2025-01-01',
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockCoupon = {
  id: 'coupon-123',
  souscription_id: 'subscription-123',
  montant_brut: 500,
  montant_prelevement: 150,
  montant_net: 350,
  date_echeance: '2025-06-01',
  statut_paiement: 'en_attente' as const,
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockPayment = {
  id: 'payment-123',
  echeance_id: 'coupon-123',
  montant: 350,
  date_paiement: '2025-06-01',
  projet_id: 'project-123',
  org_id: 'org-123',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockInvitation = {
  id: 'invitation-123',
  email: 'invited@example.com',
  organization_id: 'org-123',
  role: 'member' as const,
  status: 'pending' as const,
  token: 'test-token-123',
  expires_at: '2025-12-31T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockStats = {
  totalInvested: 1000000,
  totalInvestedMoM: 5.2,
  totalInvestedYoY: 15.8,
  couponsPaidThisMonth: 50000,
  couponsPaidMoM: 3.1,
  couponsPaidYoY: 12.4,
  activeProjects: 5,
  activeProjectsMoM: 0,
  activeProjectsYoY: 25,
  upcomingCoupons: 12,
  upcomingCouponsMoM: 0,
  upcomingCouponsYoY: 20,
  nextCouponDays: 7,
};

export const mockMonthlyData = [
  { month: 'Jan', amount: 10000 },
  { month: 'Fév', amount: 15000 },
  { month: 'Mar', amount: 12000 },
  { month: 'Avr', amount: 18000 },
  { month: 'Mai', amount: 20000 },
  { month: 'Jui', amount: 16000 },
];

export function createMockProjects(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockProject,
    id: `project-${i + 1}`,
    projet: `Project ${i + 1}`,
    montant_total: 1000000 + i * 100000,
  }));
}

export function createMockInvestors(count: number = 10) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockInvestor,
    id: `investor-${i + 1}`,
    nom: `Nom${i + 1}`,
    prenom: `Prenom${i + 1}`,
    email: `investor${i + 1}@example.com`,
  }));
}

export function createMockCoupons(count: number = 20) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockCoupon,
    id: `coupon-${i + 1}`,
    montant_brut: 500 + i * 50,
    montant_net: 350 + i * 35,
    date_echeance: new Date(2025, 0, i + 1).toISOString(),
  }));
}
