import { createClient } from 'npm:@supabase/supabase-js@2';
import { AiTaskRequestSchema } from '../_shared/task-schemas.ts';
import { handleAiTask, AiResponseInvalidError } from '../_shared/task-handlers.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { okResponse, errorResponse } from '../_shared/response.ts';
import { HTTP_STATUS } from '../_shared/constants/http-status.ts';
import { ERROR_CODES } from '../_shared/constants/error-codes.ts';
import { AnthropicTimeoutError, AnthropicRequestError } from '../_shared/anthropic-client.ts';
import { logger } from '../_shared/logger.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

interface LogArgs {
  userId: string;
  task: string;
  requestSize: number;
  responseSize: number;
  success: boolean;
  errorCode: string | null;
  latencyMs: number;
}

// Inserts one observability row via the service role (bypasses RLS; the table has no client-side
// INSERT policy). Sizes + timing + code only — NEVER bodies.
async function logRequest(args: LogArgs): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('ai_request_log').insert({
    user_id: args.userId,
    task: args.task,
    request_size_chars: args.requestSize,
    response_size_chars: args.responseSize,
    success: args.success,
    error_code: args.errorCode,
    latency_ms: args.latencyMs,
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const startedAt = performance.now();
  let userId: string | null = null;
  let task: string | null = null;
  let requestSizeChars = 0;

  try {
    if (req.method !== 'POST') {
      return errorResponse(
        { code: ERROR_CODES.VALIDATION_FAILED, message: 'Method not allowed' },
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Configuration check — fail fast and loud if any required secret is missing.
    if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      logger.error('configuration_error_missing_env');
      return errorResponse(
        { code: ERROR_CODES.CONFIGURATION_ERROR, message: 'Server not configured' },
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }

    // Authenticate via the user JWT. supabase.auth.getUser() validates the token signature +
    // expiry server-side — a forged token fails here (security boundary, not a workaround point).
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return errorResponse(
        { code: ERROR_CODES.NOT_AUTHENTICATED, message: 'Not authenticated' },
        HTTP_STATUS.UNAUTHORIZED,
      );
    }
    userId = userData.user.id;

    // Rate limit BEFORE any Anthropic call.
    const rl = await checkRateLimit(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, userId);
    if (!rl.allowed) {
      const msg =
        rl.reason === 'minute'
          ? 'Too many requests in the last minute. Try again shortly.'
          : 'Daily AI usage limit reached. Try again tomorrow.';
      return errorResponse(
        { code: ERROR_CODES.RATE_LIMITED, message: msg },
        HTTP_STATUS.TOO_MANY_REQUESTS,
        { reset_seconds: rl.resetSeconds },
      );
    }

    // Parse + validate the body.
    const rawBody = await req.text();
    requestSizeChars = rawBody.length;
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return errorResponse(
        { code: ERROR_CODES.VALIDATION_FAILED, message: 'Invalid JSON body' },
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const validated = AiTaskRequestSchema.safeParse(parsedBody);
    if (!validated.success) {
      return errorResponse(
        {
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Invalid task request',
          details: { issueCount: validated.error.issues.length },
        },
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    task = validated.data.task;

    // Dispatch to the task handler.
    const result = await handleAiTask(validated.data, ANTHROPIC_API_KEY);
    const responseBodyString = JSON.stringify(result);
    const latencyMs = Math.round(performance.now() - startedAt);

    await logRequest({
      userId,
      task,
      requestSize: requestSizeChars,
      responseSize: responseBodyString.length,
      success: true,
      errorCode: null,
      latencyMs,
    }).catch((err: unknown) => {
      logger.warn('ai_log_insert_failed', { message: String(err) });
    });

    return okResponse(result);
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startedAt);
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let httpStatus: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let message = 'AI request failed';

    if (err instanceof AnthropicTimeoutError) {
      code = ERROR_CODES.AI_TIMEOUT;
      httpStatus = HTTP_STATUS.GATEWAY_TIMEOUT;
      message = 'AI request timed out';
    } else if (err instanceof AnthropicRequestError) {
      code = ERROR_CODES.AI_UPSTREAM_ERROR;
      httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      message = 'Upstream AI error';
      // Status only — never the upstream body (already truncated to 500 chars inside the error).
      logger.error('ai_upstream_error', { status: err.status });
    } else if (err instanceof AiResponseInvalidError) {
      code = ERROR_CODES.AI_RESPONSE_INVALID;
      httpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      message = 'AI returned an unexpected response shape';
    } else {
      logger.error('ai_unhandled_error', {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    if (userId) {
      await logRequest({
        userId,
        task: task ?? 'unknown',
        requestSize: requestSizeChars,
        responseSize: 0,
        success: false,
        errorCode: code,
        latencyMs,
      }).catch(() => {
        // Swallow log-insert failure so it doesn't mask the original error.
      });
    }

    return errorResponse({ code, message }, httpStatus);
  }
});
