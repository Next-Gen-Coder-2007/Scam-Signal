export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 4000;

export interface InputValidationResult {
  valid: boolean;
  error: string | null;
  length: number;
}

/**
 * Validates user-pasted message content before running scam analysis.
 */
export function validateAnalyzerInput(rawText: string): InputValidationResult {
  const trimmed = rawText.trim();
  const length = rawText.length;

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please paste a message, email, job offer, or payment request to analyze.',
      length,
    };
  }

  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message is too short. Enter at least ${MIN_MESSAGE_LENGTH} characters for accurate pattern analysis.`,
      length,
    };
  }

  if (length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()}-character limit (${length.toLocaleString()} characters entered).`,
      length,
    };
  }

  return {
    valid: true,
    error: null,
    length,
  };
}
