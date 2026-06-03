import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ENV } from '@/constants/env';
import { ERROR_CODES } from '@/constants/error-codes';
import { ApiResponseSchema } from '@/types/api-response';
import {
  AiTaskRequestSchema,
  SuggestSiblingSpecsOutputSchema,
  type SuggestSiblingSpecsInput,
  type SuggestSiblingSpecsOutput,
} from '@shared/task-schemas';

// Calls the anthropic-proxy Edge Function for the suggest_sibling_specs task. Validates the
// outgoing request shape client-side (defense in depth — the proxy re-validates), parses the
// canonical envelope on the way back, and throws a stable ERROR_CODES string on any failure so
// callers map it to copy. Never logs the request/response bodies — only sizes/codes.
export async function suggestSiblingSpecs(
  input: SuggestSiblingSpecsInput,
): Promise<SuggestSiblingSpecsOutput> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error(ERROR_CODES.NOT_AUTHENTICATED);

  const validated = AiTaskRequestSchema.parse({ task: 'suggest_sibling_specs', input });

  const response = await fetch(`${ENV.SUPABASE_URL}/functions/v1/anthropic-proxy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated),
  });

  const json: unknown = await response.json();
  const envelopeSchema = ApiResponseSchema(SuggestSiblingSpecsOutputSchema);
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) {
    logger.error('ai_invalid_envelope', { issues: envelope.error.issues.length });
    throw new Error(ERROR_CODES.INVALID_RESPONSE);
  }
  if (!envelope.data.success) {
    logger.error('ai_proxy_error', { code: envelope.data.error.code });
    throw new Error(envelope.data.error.code);
  }
  return envelope.data.data;
}
