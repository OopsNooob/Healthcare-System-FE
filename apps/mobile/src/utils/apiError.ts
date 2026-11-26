import {
  extractApiErrorContext,
  resolveApiError,
  resolveApiErrorByCode,
} from '@healthcare/api-client';
import i18n from '@/i18n';

export interface ApiErrorInfo {
  code?: string;
  details?: Record<string, unknown>;
  rawMessage?: string;
}

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Extracts structured backend error code, details, and raw message from an HTTP/Error object.
 */
export function extractApiErrorInfo(err: unknown): ApiErrorInfo {
  const ctx = extractApiErrorContext(err);
  return {
    code: ctx.code,
    details: ctx.details,
    rawMessage: ctx.rawMessage,
  };
}

/**
 * Translates known backend error codes (with optional structured details) to the active locale.
 */
export function translateApiErrorCode(
  code: string | undefined,
  details: Record<string, unknown> | undefined,
  tFn: TranslateFn = (key, opts) => i18n.t(key, opts),
): string | null {
  const resolved = resolveApiErrorByCode(code, details);
  if (!resolved) return null;

  return tFn(`apiErrors.${resolved.key}`, {
    ...resolved.params,
  });
}

/**
 * Resolves any Axios/API/runtime error into a localized user-facing error message.
 */
export function extractApiErrorMessage(err: unknown, fallbackKey = 'mobile.error_generic'): string {
  const resolved = resolveApiError(err);
  if (resolved) {
    return i18n.t(`apiErrors.${resolved.key}`, {
      ...resolved.params,
    });
  }

  const ctx = extractApiErrorContext(err);
  if (ctx.rawMessage) {
    return ctx.rawMessage;
  }

  return i18n.t(fallbackKey);
}
