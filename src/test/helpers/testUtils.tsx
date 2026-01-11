import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <BrowserRouter>
      <ThemeProvider>{children}</ThemeProvider>
    </BrowserRouter>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

export function createMockOrganization(overrides?: Partial<Organization>) {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    role: 'admin',
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<any>) {
  return {
    id: 'test-project-id',
    projet: 'Test Project',
    emetteur: 'Test Emetteur',
    montant_total: 1000000,
    date_emission: '2025-01-01',
    org_id: 'test-org-id',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockInvestor(overrides?: Partial<any>) {
  return {
    id: 'test-investor-id',
    nom: 'Doe',
    prenom: 'John',
    email: 'john.doe@example.com',
    org_id: 'test-org-id',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTranche(overrides?: Partial<any>) {
  return {
    id: 'test-tranche-id',
    projet_id: 'test-project-id',
    nom_tranche: 'Tranche 1',
    taux_nominal: 5.0,
    montant: 500000,
    date_emission: '2025-01-01',
    org_id: 'test-org-id',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockPayment(overrides?: Partial<any>) {
  return {
    id: 'test-payment-id',
    echeance_id: 'test-echeance-id',
    montant: 5000,
    date_paiement: '2025-01-15',
    org_id: 'test-org-id',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function waitForLoadingToFinish() {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

export function mockSupabaseResponse<T>(data: T, error: any = null) {
  return {
    data,
    error,
    count: Array.isArray(data) ? data.length : null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  };
}

export function mockSupabaseQuery<T>(data: T) {
  return {
    select: () => mockSupabaseQuery(data),
    insert: () => mockSupabaseQuery(data),
    update: () => mockSupabaseQuery(data),
    delete: () => mockSupabaseQuery(data),
    eq: () => mockSupabaseQuery(data),
    in: () => mockSupabaseQuery(data),
    gte: () => mockSupabaseQuery(data),
    lte: () => mockSupabaseQuery(data),
    order: () => mockSupabaseQuery(data),
    limit: () => mockSupabaseQuery(data),
    single: () => Promise.resolve(mockSupabaseResponse(data)),
    maybeSingle: () => Promise.resolve(mockSupabaseResponse(data)),
    then: (callback: (result: any) => void) => callback(mockSupabaseResponse(data)),
  };
}

type Organization = {
  id: string;
  name: string;
  role: string;
};
