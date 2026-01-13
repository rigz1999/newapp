// ============================================
// Short ID Utility (Stripe-style)
// Path: src/utils/shortId.ts
// ============================================

/**
 * Stripe-style prefixed short IDs
 * Format: prefix_randomBase62 (e.g., prj_a1b2c3d4e5)
 */

// Resource type prefixes
export const ID_PREFIXES = {
  projet: 'prj_',
  tranche: 'trn_',
  investisseur: 'inv_',
  souscription: 'sub_',
  paiement: 'pai_',
  echeance: 'ech_',
} as const;

export type ResourceType = keyof typeof ID_PREFIXES;

/**
 * Base62 character set (alphanumeric, case-sensitive)
 * Used by Stripe and other major platforms
 */
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a random Base62 string of specified length
 * @param length - Number of characters (default: 12)
 */
export function generateRandomBase62(length: number = 12): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => BASE62_CHARS[byte % 62])
    .join('');
}

/**
 * Generate a new Stripe-style short ID
 * @param resourceType - Type of resource (projet, tranche, etc.)
 * @returns Prefixed short ID (e.g., prj_a1b2c3d4e5f6)
 */
export function generateShortId(resourceType: ResourceType): string {
  const prefix = ID_PREFIXES[resourceType];
  const randomPart = generateRandomBase62(12);
  return `${prefix}${randomPart}`;
}

/**
 * Extract the resource type from a short ID
 * @param shortId - The short ID to parse
 * @returns Resource type or null if invalid
 */
export function getResourceType(shortId: string): ResourceType | null {
  for (const [type, prefix] of Object.entries(ID_PREFIXES)) {
    if (shortId.startsWith(prefix)) {
      return type as ResourceType;
    }
  }
  return null;
}

/**
 * Validate a short ID format
 * @param shortId - The short ID to validate
 * @param expectedType - Optional expected resource type
 */
export function isValidShortId(shortId: string, expectedType?: ResourceType): boolean {
  if (!shortId || typeof shortId !== 'string') return false;

  const resourceType = getResourceType(shortId);
  if (!resourceType) return false;

  if (expectedType && resourceType !== expectedType) return false;

  // Check that the random part is valid Base62
  const prefix = ID_PREFIXES[resourceType];
  const randomPart = shortId.slice(prefix.length);

  // Should be at least 8 characters for security
  if (randomPart.length < 8) return false;

  // All characters should be Base62
  return /^[0-9A-Za-z]+$/.test(randomPart);
}

/**
 * Check if a string is a UUID (for backwards compatibility detection)
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Determine if an ID is a short ID or UUID
 * Useful for backwards compatibility during migration
 */
export function getIdFormat(id: string): 'short' | 'uuid' | 'unknown' {
  if (isValidShortId(id)) return 'short';
  if (isUUID(id)) return 'uuid';
  return 'unknown';
}
