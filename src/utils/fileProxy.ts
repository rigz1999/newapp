import { supabase } from '../lib/supabase';

/**
 * File proxy utility — hides Supabase Storage URLs by serving files through blob URLs.
 * Supports both legacy full URLs and new relative path format.
 */

const blobUrlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Extracts the relative storage path from a full Supabase URL or returns the path as-is.
 * Handles: public URLs, signed URLs, and relative paths.
 */
export function extractStoragePath(fileUrl: string): string {
  if (!fileUrl) return '';

  // Already a relative path (no protocol)
  if (!fileUrl.startsWith('http')) return fileUrl;

  // Public URL format: .../object/public/payment-proofs/{path}
  const publicMatch = fileUrl.match(/\/object\/public\/payment-proofs\/(.+?)(?:\?|$)/);
  if (publicMatch) return decodeURIComponent(publicMatch[1]);

  // Signed URL format: .../object/sign/payment-proofs/{path}?token=...
  const signedMatch = fileUrl.match(/\/object\/sign\/payment-proofs\/(.+?)(?:\?|$)/);
  if (signedMatch) return decodeURIComponent(signedMatch[1]);

  // Fallback: try to find payment-proofs/ anywhere in the URL
  const fallbackMatch = fileUrl.match(/payment-proofs\/(.+?)(?:\?|$)/);
  if (fallbackMatch) return decodeURIComponent(fallbackMatch[1]);

  return fileUrl;
}

/**
 * Downloads a file from Supabase Storage and returns a blob URL.
 * Caches results for 30 minutes to avoid redundant downloads.
 */
export async function getProxiedFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return '';

  // Already a blob URL
  if (fileUrl.startsWith('blob:')) return fileUrl;

  // Check cache
  const cached = blobUrlCache.get(fileUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.url;
  }

  const path = extractStoragePath(fileUrl);
  if (!path) return fileUrl;

  try {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .download(path);

    if (error || !data) {
      console.warn('File proxy download failed:', error?.message);
      return fileUrl;
    }

    // Revoke old cached URL if exists
    if (cached) {
      URL.revokeObjectURL(cached.url);
    }

    const blobUrl = URL.createObjectURL(data);
    blobUrlCache.set(fileUrl, { url: blobUrl, timestamp: Date.now() });
    return blobUrl;
  } catch {
    return fileUrl;
  }
}

/**
 * Opens a file in a new browser tab using a blob URL (hides Supabase URL).
 */
export async function openFileInNewTab(fileUrl: string): Promise<void> {
  const blobUrl = await getProxiedFileUrl(fileUrl);
  window.open(blobUrl, '_blank');
}

/**
 * Revokes a cached blob URL to free memory.
 */
export function revokeProxiedUrl(fileUrl: string): void {
  const cached = blobUrlCache.get(fileUrl);
  if (cached) {
    URL.revokeObjectURL(cached.url);
    blobUrlCache.delete(fileUrl);
  }
}

/**
 * Revokes all cached blob URLs. Call on component unmount or cleanup.
 */
export function revokeAllProxiedUrls(): void {
  for (const [, { url }] of blobUrlCache) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
}
