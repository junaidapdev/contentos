// Single source of truth for the Anthropic integration's tunables. Changing the model, version,
// limits, or timeout is a one-line edit here + a deploy. No model string is hardcoded anywhere
// else (enforced by code review).
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_API_VERSION = '2023-06-01';

// Pinned model. NOTE: verify this exact identifier against current Anthropic docs before the
// hosted deploy (Chunk 13) — model identifiers evolve, and the value lives here precisely so a
// deploy-time bump is a single edit. Low temperature for reliable structured (JSON) output.
export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const ANTHROPIC_MAX_TOKENS = 4096;
export const ANTHROPIC_DEFAULT_TEMPERATURE = 0.2;

// 60s gives headroom for longer requests; beyond that is a runaway and we abort.
export const ANTHROPIC_REQUEST_TIMEOUT_MS = 60_000;

// Per-user rate limits. Minute checked first (the abuse / runaway-client guard), day second
// (the cost cap). A real creator using suggest_sibling_specs once per idea is far below both.
export const RATE_LIMIT_PER_MINUTE = 20;
export const RATE_LIMIT_PER_DAY = 200;
