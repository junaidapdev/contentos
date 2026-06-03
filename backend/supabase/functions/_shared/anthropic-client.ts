import {
  ANTHROPIC_API_URL,
  ANTHROPIC_API_VERSION,
  ANTHROPIC_MODEL,
  ANTHROPIC_MAX_TOKENS,
  ANTHROPIC_DEFAULT_TEMPERATURE,
  ANTHROPIC_REQUEST_TIMEOUT_MS,
} from './anthropic-config.ts';

export interface AnthropicMessageRequest {
  system: string;
  userMessage: string;
  temperature?: number;
}

export interface AnthropicMessageResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export class AnthropicTimeoutError extends Error {
  constructor() {
    super('Anthropic request timed out');
    this.name = 'AnthropicTimeoutError';
  }
}

export class AnthropicRequestError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Anthropic API error (${String(status)}): ${detail}`);
    this.name = 'AnthropicRequestError';
  }
}

// Defensive narrowing of the `/v1/messages` response. We read only `content[0].text` and the
// usage counters; everything else is ignored. We never trust the shape beyond these fields.
function extractText(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const content = (json as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const first: unknown = content[0];
  if (typeof first !== 'object' || first === null) return null;
  const text = (first as { text?: unknown }).text;
  return typeof text === 'string' ? text : null;
}

function extractUsage(json: unknown): { inputTokens: number; outputTokens: number } {
  const usage =
    typeof json === 'object' && json !== null ? (json as { usage?: unknown }).usage : null;
  const input =
    typeof usage === 'object' && usage !== null
      ? (usage as { input_tokens?: unknown }).input_tokens
      : undefined;
  const output =
    typeof usage === 'object' && usage !== null
      ? (usage as { output_tokens?: unknown }).output_tokens
      : undefined;
  return {
    inputTokens: typeof input === 'number' ? input : 0,
    outputTokens: typeof output === 'number' ? output : 0,
  };
}

// Calls Anthropic's Messages API with a 60s abort timeout. Throws AnthropicTimeoutError on abort,
// AnthropicRequestError on non-2xx or unexpected shape. The system prompt carries stable per-request
// context (the brand pack); the user message carries the task-specific question.
export async function callAnthropic(
  req: AnthropicMessageRequest,
  apiKey: string,
): Promise<AnthropicMessageResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ANTHROPIC_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        temperature: req.temperature ?? ANTHROPIC_DEFAULT_TEMPERATURE,
        system: req.system,
        messages: [{ role: 'user', content: req.userMessage }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AnthropicRequestError(response.status, errorBody.slice(0, 500));
    }

    const json: unknown = await response.json();
    const text = extractText(json);
    if (text === null) {
      throw new AnthropicRequestError(500, 'Unexpected response shape from Anthropic');
    }
    const usage = extractUsage(json);
    return { text, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AnthropicTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
