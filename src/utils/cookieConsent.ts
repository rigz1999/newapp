// Cookie consent management utility
// CNIL-compliant: no non-essential cookies before explicit consent
// Consent expires after 13 months per CNIL guidelines

const CONSENT_KEY = 'finixar_cookie_consent';
const CONSENT_EXPIRY_MONTHS = 13;

export type ConsentCategory = 'error_tracking';

export interface ConsentState {
  error_tracking: boolean;
  recorded_at: string;
}

function isExpired(recordedAt: string): boolean {
  const date = new Date(recordedAt);
  const expiry = new Date(date);
  expiry.setMonth(expiry.getMonth() + CONSENT_EXPIRY_MONTHS);
  return new Date() > expiry;
}

export function getConsentState(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) {
      return null;
    }

    const state: ConsentState = JSON.parse(raw);

    // Re-prompt if consent is older than 13 months
    if (isExpired(state.recorded_at)) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function setConsentState(state: Omit<ConsentState, 'recorded_at'>): ConsentState {
  const full: ConsentState = {
    ...state,
    recorded_at: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
  return full;
}

export function hasConsentBeenGiven(): boolean {
  return getConsentState() !== null;
}

export function hasConsentFor(category: ConsentCategory): boolean {
  const state = getConsentState();
  if (!state) {
    return false;
  }
  return state[category] === true;
}

export function acceptAll(): ConsentState {
  return setConsentState({ error_tracking: true });
}

export function rejectAll(): ConsentState {
  return setConsentState({ error_tracking: false });
}

export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}
