import type {
  ClaimedOrgType,
  ImpersonationIndicator,
  PaymentMechanism,
  RequestedAction,
  ScamCategory,
  UrgencyPattern,
} from './scamDnaSchema';

const URL_TOKEN_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)(?:[/:?#][^\s]*)?/gi;

const IGNORED_PSEUDO_DOMAINS = new Set([
  'e.g',
  'i.e',
  'etc.com',
  'redacted.local',
]);

const VALID_TLD_REGEX = /^[a-z]{2,24}$/;

/**
 * Normalizes a URL or host string into a lowercase canonical domain name.
 * Returns null for invalid tokens or redaction placeholders.
 */
export function normalizeDomain(rawToken: string): string | null {
  const trimmed = rawToken.trim().toLowerCase();
  if (!trimmed || trimmed.includes('[redacted') || trimmed.includes('*')) {
    return null;
  }

  let host = trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#]/)[0]
    .split(':')[0]
    .replace(/\.+$/, '');

  if (!host || host.length < 4 || !host.includes('.')) {
    return null;
  }

  if (IGNORED_PSEUDO_DOMAINS.has(host)) {
    return null;
  }

  const parts = host.split('.');
  const tld = parts[parts.length - 1];
  if (!VALID_TLD_REGEX.test(tld)) {
    return null;
  }

  return host;
}

/**
 * Extracts, normalizes, deduplicates, and sorts domain names from sanitized text.
 */
export function extractNormalizedDomains(text: string): string[] {
  const domains = new Set<string>();
  const matches = text.matchAll(URL_TOKEN_REGEX);

  for (const match of matches) {
    const candidate = match[1] ?? match[0];
    const normalized = normalizeDomain(candidate);
    if (normalized) {
      domains.add(normalized);
    }
  }

  return Array.from(domains).sort();
}

/**
 * Normalizes free-text phrases into a consistent lowercase, single-spaced form
 * for campaign comparison.
 */
export function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\w\s[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicates and lexicographically sorts string arrays for deterministic comparison.
 */
export function dedupeSorted<T extends string>(items: readonly T[]): T[] {
  return Array.from(new Set(items)).sort() as T[];
}

export interface CanonicalSignatureParts {
  scamCategory: ScamCategory;
  claimedOrganizationType: ClaimedOrgType;
  requestedAction: RequestedAction;
  paymentMechanism: PaymentMechanism;
  urgencyPatterns: readonly UrgencyPattern[];
  impersonationIndicators: readonly ImpersonationIndicator[];
  suspiciousDomains: readonly string[];
  recurringPhrases: readonly string[];
}

/**
 * Builds a deterministic canonical string representation of normalized Scam DNA
 * fields so slightly different messages from the same campaign produce identical hashes.
 */
export function buildCanonicalDnaSignature(parts: CanonicalSignatureParts): string {
  const segments = [
    `cat=${parts.scamCategory}`,
    `org=${parts.claimedOrganizationType}`,
    `act=${parts.requestedAction}`,
    `pay=${parts.paymentMechanism}`,
    `urg=${dedupeSorted(parts.urgencyPatterns).join(',') || 'none'}`,
    `imp=${dedupeSorted(parts.impersonationIndicators).join(',') || 'none'}`,
    `dom=${dedupeSorted(parts.suspiciousDomains).join(',') || 'none'}`,
    `phr=${dedupeSorted(parts.recurringPhrases).join(',') || 'none'}`,
  ];
  return segments.join('|');
}

/**
 * Computes a deterministic 64-char lowercase SHA-256 hex digest using Web Crypto.
 */
export async function computeSha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
