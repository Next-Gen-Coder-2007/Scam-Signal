import {
  ScamDnaInput,
  ScamDnaInputSchema,
  ScamDnaObserved,
  ScamDnaObservedSchema,
  type ClaimedOrgType,
  type ImpersonationIndicator,
  type PaymentMechanism,
  type RequestedAction,
  type ScamCategory,
  type UrgencyPattern,
} from './scamDnaSchema';
import {
  dedupeSorted,
  extractNormalizedDomains,
  normalizePhrase,
} from './scamDnaNormalizer';

interface PatternRule<T extends string> {
  label: T;
  patterns: RegExp[];
}

interface PhraseRule {
  canonical: string;
  patterns: RegExp[];
}

const CLAIMED_ORG_RULES: PatternRule<Exclude<ClaimedOrgType, 'unknown_unspecified'>>[] = [
  {
    label: 'bank_financial',
    patterns: [/\b(bank|banking|credit union|hdfc|sbi|icici|chase|wells fargo|citibank|kyc|debit card|credit card)\b/i],
  },
  {
    label: 'government_tax',
    patterns: [/\b(irs|hmrc|income tax|tax refund|tax department|tax authority|revenue service|customs|government|ministry|social security|police|federal|court notice)\b/i],
  },
  {
    label: 'postal_delivery',
    patterns: [/\b(fedex|ups|usps|dhl|india post|royal mail|parcel|package|courier|delivery|shipment|customs clearance)\b/i],
  },
  {
    label: 'tech_support',
    patterns: [/\b(microsoft|apple support|geek squad|antivirus|mcafee|norton|tech support|helpdesk|it support|security alert)\b/i],
  },
  {
    label: 'employer_recruiter',
    patterns: [/\b(hr|hiring|recruiter|recruitment|job offer|part[- ]time|work from home|salary|onboarding|interview)\b/i],
  },
  {
    label: 'telecom_utility',
    patterns: [/\b(sim|mobile carrier|telecom|electricity bill|power bill|water bill|broadband|fiber|recharge)\b/i],
  },
  {
    label: 'ecommerce_marketplace',
    patterns: [/\b(amazon|flipkart|ebay|walmart|shopify|order #|marketplace|refund order)\b/i],
  },
  {
    label: 'crypto_exchange',
    patterns: [/\b(binance|coinbase|kraken|metamask|blockchain|crypto|bitcoin|usdt|ethereum|trading platform|airdrop)\b/i],
  },
  {
    label: 'payment_wallet',
    patterns: [/\b(paypal|venmo|zelle|cash app|paytm|phonepe|gpay|google pay|upi)\b/i],
  },
];

const REQUESTED_ACTION_RULES: PatternRule<Exclude<RequestedAction, 'none_detected'>>[] = [
  {
    label: 'share_otp_or_credentials',
    patterns: [/\b(otp|one[- ]time password|pin|cvv|password|passcode|login credentials|seed phrase|recovery phrase|verify your identity|verify your account|update kyc)\b/i],
  },
  {
    label: 'scan_qr_or_upi',
    patterns: [/\b(scan (?:the )?qr|qr code|collect request|upi id|approve (?:the )?upi)\b/i],
  },
  {
    label: 'send_money_or_fee',
    patterns: [/\b(pay|transfer|send money|deposit|processing fee|registration fee|customs fee|handling fee|upfront fee|remit)\b/i],
  },
  {
    label: 'click_external_link',
    patterns: [/\b(click (?:the |this )?link|tap (?:the )?link|visit|open url|http:\/\/|https:\/\/|\[redacted_url\])\b/i],
  },
  {
    label: 'call_phone_number',
    patterns: [/\b(call (?:us|now|this number|immediately)|helpline|dial|\[redacted_phone\])\b/i],
  },
  {
    label: 'install_software_or_app',
    patterns: [/\b(download|install|anydesk|teamviewer|apk|remote access)\b/i],
  },
  {
    label: 'reply_with_personal_info',
    patterns: [/\b(reply with|send your|provide your (?:details|address|pan|aadhaar|ssn|bank details))\b/i],
  },
];

const PAYMENT_MECHANISM_RULES: PatternRule<Exclude<PaymentMechanism, 'none_detected'>>[] = [
  {
    label: 'upi',
    patterns: [/\b(upi|paytm|phonepe|gpay|google pay|bhim|\[redacted_upi\])\b/i],
  },
  {
    label: 'crypto',
    patterns: [/\b(bitcoin|btc|eth|ethereum|usdt|tether|crypto|wallet address|binance)\b/i],
  },
  {
    label: 'gift_card',
    patterns: [/\b(gift card|itunes card|google play card|amazon voucher|steam card)\b/i],
  },
  {
    label: 'wire_transfer',
    patterns: [/\b(wire transfer|western union|moneygram|swift)\b/i],
  },
  {
    label: 'bank_transfer',
    patterns: [/\b(bank transfer|neft|rtgs|imps|ach|iban|routing number|account number|\[redacted_account\])\b/i],
  },
  {
    label: 'credit_debit_card',
    patterns: [/\b(credit card|debit card|cvv|card number|visa|mastercard)\b/i],
  },
  {
    label: 'ewallet',
    patterns: [/\b(paypal|venmo|zelle|cash app|skrill)\b/i],
  },
];

const URGENCY_PATTERN_RULES: PatternRule<UrgencyPattern>[] = [
  {
    label: 'account_suspension_threat',
    patterns: [/\b(account (?:will be |has been |is )?(?:suspended|blocked|frozen|closed|terminated|deactivated)|kyc expired)\b/i],
  },
  {
    label: 'countdown_deadline',
    patterns: [/\b(within \d+\s*(?:hours?|hrs?|minutes?|mins?|days?)|expires? (?:today|tonight|soon)|last chance|final notice)\b/i],
  },
  {
    label: 'immediate_action_required',
    patterns: [/\b(urgent|immediately|act now|right away|asap|action required|respond immediately)\b/i],
  },
  {
    label: 'legal_or_arrest_threat',
    patterns: [/\b(arrest|warrant|legal action|lawsuit|prosecution|court|penalty|fine)\b/i],
  },
  {
    label: 'limited_time_offer',
    patterns: [/\b(limited time|offer ends|only \d+ spots?|claim now|today only)\b/i],
  },
  {
    label: 'missed_delivery_hold',
    patterns: [/\b(delivery failed|(?:parcel|package|delivery)\s+(?:is\s+)?on hold|package held|unable to deliver|reschedule delivery)\b/i],
  },
];

const IMPERSONATION_RULES: PatternRule<ImpersonationIndicator>[] = [
  {
    label: 'authority_title',
    patterns: [/\b(officer|inspector|director|fraud department|security team|compliance team|legal department)\b/i],
  },
  {
    label: 'official_brand_claim',
    patterns: [/\b(official|customer care|authorized|verified support|headquarters)\b/i],
  },
  {
    label: 'generic_greeting',
    patterns: [/\b(dear customer|dear user|dear valued|dear beneficiary|hello sir\/madam)\b/i],
  },
  {
    label: 'support_desk_claim',
    patterns: [/\b(support desk|helpdesk|customer support|billing department|refund department)\b/i],
  },
  {
    label: 'masked_sender_placeholder',
    patterns: [/\[REDACTED_(?:PHONE|EMAIL|NAME|URL)\]/i],
  },
];

const RECURRING_PHRASE_PATTERNS: PhraseRule[] = [
  { canonical: 'verify your account', patterns: [/\bverify your account\b/i] },
  { canonical: 'account will be suspended', patterns: [/\baccount (?:will be|is) suspended\b/i] },
  { canonical: 'update kyc details', patterns: [/\b(?:update|complete) (?:your )?kyc\b/i] },
  { canonical: 'click the link below', patterns: [/\bclick (?:the |this )?link(?: below)?\b/i] },
  { canonical: 'within 24 hours', patterns: [/\bwithin (?:24|twelve|48)\s*(?:hours?|hrs?)\b/i] },
  { canonical: 'pay processing fee', patterns: [/\b(?:pay|deposit) (?:a |the )?(?:small )?(?:processing|registration|customs|clearance) fee\b/i] },
  { canonical: 'share otp or pin', patterns: [/\b(?:share|send|enter|provide) (?:your )?(?:otp|pin|cvv)\b/i] },
  { canonical: 'claim your reward', patterns: [/\bclaim your (?:reward|prize|refund|bonus)\b/i] },
  { canonical: 'package on hold', patterns: [/\b(?:parcel|package|delivery) (?:is )?(?:on hold|held|pending)\b/i] },
  { canonical: 'guaranteed daily returns', patterns: [/\bguaranteed (?:daily |weekly |high )?returns\b/i] },
  { canonical: 'part-time remote job', patterns: [/\b(?:part[- ]time|work from home|remote) (?:job|task|income)\b/i] },
  { canonical: 'unauthorized login detected', patterns: [/\bunauthorized (?:login|activity|transaction) detected\b/i] },
  { canonical: 'scan qr code', patterns: [/\bscan (?:the )?qr code\b/i] },
];

const SUSPICIOUS_TLD_REGEX = /\.(?:xyz|top|tk|ml|ga|cf|gq|click|link|buzz|icu|vip|work)$/i;
const BRAND_DOMAIN_LOOKALIKE_REGEX = /(?:paypa1|amaz0n|micros0ft|app1e|secure-|verify-|login-|update-|kyc-)/i;

function matchRules<T extends string>(text: string, rules: PatternRule<T>[]): T[] {
  const matched: T[] = [];
  for (const rule of rules) {
    if (rule.patterns.some((rx) => rx.test(text))) {
      matched.push(rule.label);
    }
  }
  return dedupeSorted(matched);
}

function extractRecurringPhrases(text: string): string[] {
  const normalized = normalizePhrase(text);
  const found: string[] = [];

  for (const rule of RECURRING_PHRASE_PATTERNS) {
    if (rule.patterns.some((rx) => rx.test(text) || rx.test(normalized))) {
      found.push(rule.canonical);
    }
  }

  return dedupeSorted(found);
}

function extractEvidenceSnippets(text: string, providedEvidence?: string[]): string[] {
  const snippets = new Set<string>();
  if (providedEvidence) {
    for (const item of providedEvidence) {
      const trimmed = item.trim();
      if (trimmed.length >= 2) {
        snippets.add(trimmed);
      }
    }
  }

  // Extract concise sentence-level snippets containing key triggers
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 220);

  for (const sentence of sentences) {
    if (
      /http|\[REDACTED_|otp|kyc|fee|suspend|urgent|upi|gift card|crypto|job|parcel|verify/i.test(
        sentence
      )
    ) {
      snippets.add(sentence);
    }
    if (snippets.size >= 8) break;
  }

  return Array.from(snippets);
}

function inferFallbackCategory(
  observed: ScamDnaObserved,
  categoryHint?: ScamCategory
): ScamCategory {
  if (categoryHint) return categoryHint;

  if (observed.claimedOrganizationTypes.includes('employer_recruiter')) {
    return 'job_scam';
  }
  if (observed.claimedOrganizationTypes.includes('postal_delivery')) {
    return 'delivery_scam';
  }
  if (
    observed.claimedOrganizationTypes.includes('crypto_exchange') &&
    observed.recurringPhrases.includes('guaranteed daily returns')
  ) {
    return 'investment_fraud';
  }
  if (
    observed.paymentMechanisms.some((p) => p !== 'none_detected') ||
    observed.requestedActions.includes('send_money_or_fee') ||
    observed.requestedActions.includes('scan_qr_or_upi')
  ) {
    return 'payment_fraud';
  }
  if (
    observed.requestedActions.includes('share_otp_or_credentials') ||
    observed.claimedOrganizationTypes.includes('bank_financial')
  ) {
    return 'phishing';
  }
  if (observed.impersonationIndicators.length > 0) {
    return 'impersonation';
  }
  if (observed.suspiciousDomains.length > 0) {
    return 'suspicious_links';
  }

  return 'ambiguous_unclear';
}

export interface DeterministicDnaResult {
  observed: ScamDnaObserved;
  fallbackCategory: ScamCategory;
  primaryClaimedOrganizationType: ClaimedOrgType;
  primaryRequestedAction: RequestedAction;
  primaryPaymentMechanism: PaymentMechanism;
}

/**
 * Deterministically extracts and normalizes directly observed Scam DNA indicators
 * from a sanitized report without inventing evidence.
 */
export function extractDeterministicDna(rawInput: ScamDnaInput): DeterministicDnaResult {
  const input = ScamDnaInputSchema.parse(rawInput);
  const text = input.sanitizedText;

  const claimedOrganizationTypes = matchRules(text, CLAIMED_ORG_RULES);
  const requestedActions = matchRules(text, REQUESTED_ACTION_RULES);
  const paymentMechanisms = matchRules(text, PAYMENT_MECHANISM_RULES);
  const urgencyPatterns = matchRules(text, URGENCY_PATTERN_RULES);
  const impersonationIndicators = matchRules(text, IMPERSONATION_RULES);
  const suspiciousDomains = extractNormalizedDomains(text);

  if (
    suspiciousDomains.some(
      (d) => SUSPICIOUS_TLD_REGEX.test(d) || BRAND_DOMAIN_LOOKALIKE_REGEX.test(d)
    ) &&
    !impersonationIndicators.includes('domain_lookalike_or_mismatch')
  ) {
    impersonationIndicators.push('domain_lookalike_or_mismatch');
  }

  const recurringPhrases = extractRecurringPhrases(text);
  const evidenceSnippets = extractEvidenceSnippets(text, input.observedEvidence);

  const observed = ScamDnaObservedSchema.parse({
    claimedOrganizationTypes,
    requestedActions,
    paymentMechanisms,
    urgencyPatterns,
    impersonationIndicators: dedupeSorted(impersonationIndicators),
    suspiciousDomains,
    recurringPhrases,
    evidenceSnippets,
  });

  return {
    observed,
    fallbackCategory: inferFallbackCategory(observed, input.categoryHint),
    primaryClaimedOrganizationType: claimedOrganizationTypes[0] ?? 'unknown_unspecified',
    primaryRequestedAction: requestedActions[0] ?? 'none_detected',
    primaryPaymentMechanism: paymentMechanisms[0] ?? 'none_detected',
  };
}
