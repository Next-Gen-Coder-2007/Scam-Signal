/**
 * Sanitizes Firestore / Firebase SDK errors for safe UI display.
 * Prevents leaking internal Firebase project IDs or console URLs to end users.
 */
export function formatFirestoreError(
  err: unknown,
  fallbackMessage = 'Unable to load data from Cloud Firestore. Please try again.'
): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('currently building') || lower.includes('index is currently building')) {
    return 'Database index is still building in Firebase. Please wait a minute and click Retry.';
  }

  if (lower.includes('requires an index')) {
    return 'A required database index is not ready yet. Please deploy firestore.indexes.json or retry shortly.';
  }

  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'Permission denied. Sign in with an authorized account to access this resource.';
  }

  if (lower.includes('unavailable') || lower.includes('offline') || lower.includes('failed to fetch')) {
    return 'Network unavailable. Check your internet connection and click Retry.';
  }

  // Strip any internal Firebase Console URLs or project-specific links
  const sanitized = raw
    .replace(/https:\/\/console\.firebase\.google\.com\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || fallbackMessage;
}
