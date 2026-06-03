// Minimal Deno-side logger. The ONLY module in the backend allowed to call console.*; every other
// `_shared` / function module imports this so the "no console.* in business logic" discipline is
// uniform across frontend (src/lib/logger.ts) and backend. (The frontend ESLint config doesn't
// lint /backend — it's Deno code — so this discipline is enforced by code review, documented in
// /context/03-code-standards.md.) Payloads carry IDs, sizes, codes — never user content or bodies.
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, event: string, data?: LogPayload): void {
  const fn =
    level === 'debug'
      ? console.debug
      : level === 'info'
        ? console.info
        : level === 'warn'
          ? console.warn
          : console.error;
  if (data) fn(`[${level}] ${event}`, data);
  else fn(`[${level}] ${event}`);
}

export const logger = Object.freeze({
  debug: (event: string, data?: LogPayload): void => {
    emit('debug', event, data);
  },
  info: (event: string, data?: LogPayload): void => {
    emit('info', event, data);
  },
  warn: (event: string, data?: LogPayload): void => {
    emit('warn', event, data);
  },
  error: (event: string, data?: LogPayload): void => {
    emit('error', event, data);
  },
});
