import { firebaseStatus } from '../firebase/firebaseApp';
import { executeSafetyActionInference } from '../ai/firebaseAILogic';
import {
  MANDATORY_BOUNDARY_NOTICE,
  SafetyActionInputSchema,
  getDeterministicSafetyPlaybook,
  resolveOfficialResources,
  type SafetyActionInput,
  type SafetyActionResult,
} from './safetyActionSchema';

export interface SafetyActionOptions {
  useAi?: boolean;
  signal?: AbortSignal;
}

/**
 * Provides grounded safety action guidance using Firebase AI Logic when configured,
 * with deterministic fallback playbooks and strict separation between general
 * guidance and verified official resources.
 */
export async function getSafetyActionGuidance(
  rawInput: SafetyActionInput,
  options: SafetyActionOptions = {}
): Promise<SafetyActionResult> {
  const input = SafetyActionInputSchema.parse(rawInput);

  if (options.useAi !== false && firebaseStatus.isConfigured) {
    try {
      const aiResult = await executeSafetyActionInference({
        scenario: input.scenario,
        region: input.region,
        userQuestion: input.userQuestion,
        signal: options.signal,
      });

      return {
        scenario: input.scenario,
        region: input.region,
        generalGuidance: {
          immediateSteps: aiResult.immediateSteps,
          verificationChecklist: aiResult.verificationChecklist,
          whatNotToDo: aiResult.whatNotToDo,
        },
        verifiedOfficialResources: resolveOfficialResources(
          aiResult.officialResourceIds,
          input.region
        ),
        boundaryNotice: MANDATORY_BOUNDARY_NOTICE,
        inferenceSource: aiResult.source,
        isAiAssisted: true,
      };
    } catch {
      // Fall back safely to deterministic grounded playbook
    }
  }

  return getDeterministicSafetyPlaybook(input.scenario, input.region);
}
