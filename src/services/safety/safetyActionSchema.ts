import { z } from 'zod';

export const SAFETY_SCENARIOS = [
  'verify_job_offer',
  'check_official_contact',
  'respond_to_phishing',
  'shared_credentials',
  'transferred_money',
] as const;

export type SafetyScenario = (typeof SAFETY_SCENARIOS)[number];

export const SAFETY_SCENARIO_LABELS: Record<SafetyScenario, string> = {
  verify_job_offer: 'Verify a Suspicious Job Offer',
  check_official_contact: 'Check Official Organization Contact Info',
  respond_to_phishing: 'Respond to a Phishing Attempt',
  shared_credentials: 'I Already Shared Credentials / OTP',
  transferred_money: 'I Already Transferred Money',
};

export type SafetyRegion = 'IN' | 'GLOBAL';

export interface VerifiedOfficialResource {
  id: string;
  region: SafetyRegion | 'BOTH';
  title: string;
  url?: string;
  helpline?: string;
  description: string;
  isVerifiedOfficialResource: true;
}

export const VERIFIED_OFFICIAL_RESOURCES: VerifiedOfficialResource[] = [
  {
    id: 'in-cybercrime-portal',
    region: 'IN',
    title: 'National Cyber Crime Reporting Portal (India)',
    url: 'https://cybercrime.gov.in',
    description:
      'Official Government of India portal for reporting cybercrime, phishing, and online financial fraud.',
    isVerifiedOfficialResource: true,
  },
  {
    id: 'in-helpline-1930',
    region: 'IN',
    title: 'National Cyber Crime Helpline 1930 (India)',
    helpline: '1930',
    description:
      'Official 24x7 toll-free helpline in India for reporting financial cyber fraud promptly.',
    isVerifiedOfficialResource: true,
  },
  {
    id: 'official-bank-channels',
    region: 'BOTH',
    title: 'Your Bank or Payment Provider Official Channels',
    description:
      'Use the phone number printed on the back of your physical bank card or inside your official banking/UPI app—never a number from a suspicious message.',
    isVerifiedOfficialResource: true,
  },
  {
    id: 'official-org-directory',
    region: 'BOTH',
    title: 'Official Organization Website & Careers Portal',
    description:
      'Manually type the company domain into your browser to verify recruiters, support numbers, or account notices.',
    isVerifiedOfficialResource: true,
  },
];

export const MANDATORY_BOUNDARY_NOTICE =
  'ScamSignal provides general safety guidance only. It cannot promise payment recovery, contact banks or third parties on your behalf, or investigate or reverse transactions.';

export const SafetyActionInputSchema = z.object({
  scenario: z.enum(SAFETY_SCENARIOS),
  region: z.enum(['IN', 'GLOBAL']).default('IN'),
  userQuestion: z.string().trim().max(400).optional(),
});

export type SafetyActionInput = z.infer<typeof SafetyActionInputSchema>;

export const SafetyActionAiOutputSchema = z.object({
  immediateSteps: z.array(z.string().trim().min(8)).min(2).max(6),
  verificationChecklist: z.array(z.string().trim().min(8)).min(1).max(6),
  whatNotToDo: z.array(z.string().trim().min(8)).min(1).max(5),
  officialResourceIds: z.array(z.string().trim().min(1)).min(1).max(4),
});

export type SafetyActionAiOutput = z.infer<typeof SafetyActionAiOutputSchema>;

export interface SafetyActionResult {
  scenario: SafetyScenario;
  region: SafetyRegion;
  /** General educational guidance (distinct from verified official resources). */
  generalGuidance: {
    immediateSteps: string[];
    verificationChecklist: string[];
    whatNotToDo: string[];
  };
  /** Curated, verified official external resources. */
  verifiedOfficialResources: VerifiedOfficialResource[];
  /** Explicit platform limitation boundary. */
  boundaryNotice: string;
  inferenceSource: 'on_device' | 'in_cloud' | 'unknown';
  isAiAssisted: boolean;
}

export function resolveOfficialResources(
  resourceIds: readonly string[],
  region: SafetyRegion
): VerifiedOfficialResource[] {
  const byId = new Map(VERIFIED_OFFICIAL_RESOURCES.map((r) => [r.id, r]));
  const resolved: VerifiedOfficialResource[] = [];
  for (const id of resourceIds) {
    const item = byId.get(id);
    if (item && (item.region === 'BOTH' || item.region === region)) {
      resolved.push(item);
    }
  }
  if (resolved.length === 0) {
    return VERIFIED_OFFICIAL_RESOURCES.filter(
      (r) => r.region === 'BOTH' || r.region === region
    );
  }
  return resolved;
}

export function parseAndValidateSafetyAiResponse(rawText: string): SafetyActionAiOutput {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new SyntaxError('Model returned an empty safety action response.');
  }
  let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  const parsed: unknown = JSON.parse(cleaned);
  return SafetyActionAiOutputSchema.parse(parsed);
}

/**
 * Deterministic grounded safety playbooks used as baseline and offline fallback.
 */
export function getDeterministicSafetyPlaybook(
  scenario: SafetyScenario,
  region: SafetyRegion
): SafetyActionResult {
  const playbooks: Record<
    SafetyScenario,
    {
      immediateSteps: string[];
      verificationChecklist: string[];
      whatNotToDo: string[];
      resourceIds: string[];
    }
  > = {
    verify_job_offer: {
      immediateSteps: [
        'Pause all communication if the recruiter asks for any registration, training, or equipment fee.',
        'Independently visit the company’s official careers website by typing its domain directly into your browser.',
      ],
      verificationChecklist: [
        'Verify the sender’s email domain matches the company’s official domain (not free webmail or lookalike domains).',
        'Confirm the job requisition ID exists on the organization’s official careers page.',
        'Check whether an interview occurred through official company video/scheduling channels rather than chat-only tasks.',
      ],
      whatNotToDo: [
        'Never pay an upfront fee, security deposit, or task recharge to unlock a salary or job.',
        'Do not share government ID scans or bank credentials before verifying the employer independently.',
      ],
      resourceIds: ['official-org-directory'],
    },
    check_official_contact: {
      immediateSteps: [
        'Ignore phone numbers, email addresses, and links embedded inside the suspicious message.',
        'Look up the organization’s contact details from a trusted bookmark, official app, or physical statement/card.',
      ],
      verificationChecklist: [
        'Compare the full domain name character-by-character for lookalike substitutions.',
        'Confirm customer support numbers on the back of your bank card or the official website footer.',
      ],
      whatNotToDo: [
        'Do not call back numbers provided in unsolicited SMS, WhatsApp, or pop-up alerts.',
        'Do not trust caller ID display names alone, as they can be spoofed.',
      ],
      resourceIds: ['official-org-directory', 'official-bank-channels'],
    },
    respond_to_phishing: {
      immediateSteps: [
        'Do not click any links, download attachments, or reply to the suspicious message.',
        'Delete or mark the message as spam/phishing in your messaging or email app.',
      ],
      verificationChecklist: [
        'Log in separately via the organization’s official app or website to check if any real alert exists.',
        'Review recent account sign-in activity if you suspect you opened a suspicious link.',
      ],
      whatNotToDo: [
        'Never enter passwords, PINs, or OTPs on a page opened from a message link.',
        'Do not install remote-access apps requested by an unverified caller.',
      ],
      resourceIds:
        region === 'IN'
          ? ['official-org-directory', 'in-cybercrime-portal']
          : ['official-org-directory'],
    },
    shared_credentials: {
      immediateSteps: [
        'Change your password immediately on the affected account using a trusted device and official app/website.',
        'Contact your bank or service provider right away through official channels to freeze or monitor the account.',
        'Revoke active sessions and enable app-based multi-factor authentication (MFA).',
      ],
      verificationChecklist: [
        'Check recent transactions, email forwarding rules, and linked recovery phone/email settings.',
        'Update passwords on any other accounts where the same password was reused.',
      ],
      whatNotToDo: [
        'Do not share any new OTPs with callers claiming they can "cancel" or "reverse" unauthorized access.',
        'Do not delay notifying your bank or IT security team.',
      ],
      resourceIds:
        region === 'IN'
          ? ['official-bank-channels', 'in-cybercrime-portal', 'in-helpline-1930']
          : ['official-bank-channels', 'official-org-directory'],
    },
    transferred_money: {
      immediateSteps:
        region === 'IN'
          ? [
              'Contact your bank or payment provider immediately using the official number on your card or inside your banking/UPI app to report the unauthorized or fraudulent transfer.',
              'Report the financial cyber fraud promptly on the official National Cyber Crime Reporting Portal (cybercrime.gov.in) or by calling helpline 1930.',
              'Save transaction IDs, UTR numbers, screenshots, and message timestamps as evidence for your bank and authorities.',
            ]
          : [
              'Contact your bank, card issuer, or payment provider immediately using the official number on your card or app to report the fraudulent transfer.',
              'Report the incident to your national cybercrime or law enforcement reporting portal.',
              'Preserve transaction IDs, receipts, and message screenshots as evidence.',
            ],
      verificationChecklist: [
        'Confirm whether your bank card, UPI ID, or net-banking access needs to be temporarily blocked or re-secured.',
        'Collect exact transaction reference numbers (such as UTR / reference ID) before submitting an official report.',
      ],
      whatNotToDo: [
        'Never pay anyone claiming they can "recover" lost funds for a fee—recovery scams target prior victims.',
        'Do not rely on unofficial third parties to investigate or reverse transactions.',
      ],
      resourceIds:
        region === 'IN'
          ? ['official-bank-channels', 'in-helpline-1930', 'in-cybercrime-portal']
          : ['official-bank-channels'],
    },
  };

  const selected = playbooks[scenario];

  return {
    scenario,
    region,
    generalGuidance: {
      immediateSteps: selected.immediateSteps,
      verificationChecklist: selected.verificationChecklist,
      whatNotToDo: selected.whatNotToDo,
    },
    verifiedOfficialResources: resolveOfficialResources(selected.resourceIds, region),
    boundaryNotice: MANDATORY_BOUNDARY_NOTICE,
    inferenceSource: 'unknown',
    isAiAssisted: false,
  };
}
