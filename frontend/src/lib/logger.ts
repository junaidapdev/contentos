import { ENV } from '@/constants/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = Record<string, unknown>;

function emit(level: LogLevel, event: string, data?: LogPayload): void {
  if (ENV.IS_PRODUCTION && level === 'debug') return;

  // The logger is the ONLY module allowed to call console.*.
  // In production, this is the seam where a structured logging destination (e.g., Logflare,
  // Sentry breadcrumbs) would be wired in. For now, production logs go to console too —
  // but never include user PII in the payload.
  const target =
    level === 'debug'
      ? console.debug
      : level === 'info'
        ? console.info
        : level === 'warn'
          ? console.warn
          : console.error;

  if (data) {
    target(`[${level}] ${event}`, data);
  } else {
    target(`[${level}] ${event}`);
  }
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
