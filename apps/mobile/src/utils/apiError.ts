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

function isVietnameseLocale(): boolean {
  const lng = (i18n.language || 'vi').toLowerCase();
  return lng.startsWith('vi');
}

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

  const fallback = isVietnameseLocale() ? resolved.fallbackVi : resolved.fallbackEn;
  return tFn(`apiErrors.${resolved.key}`, {
    ...resolved.params,
    defaultValue: fallback,
  });
}

/**
 * Resolves any Axios/API/runtime error into a localized user-facing error message.
 */
export function extractApiErrorMessage(err: unknown, fallbackKey = 'mobile.error_generic'): string {
  const resolved = resolveApiError(err);
  if (resolved) {
    const fallback = isVietnameseLocale() ? resolved.fallbackVi : resolved.fallbackEn;
    return i18n.t(`apiErrors.${resolved.key}`, {
      ...resolved.params,
      defaultValue: fallback,
    });
  }

  const ctx = extractApiErrorContext(err);
  if (ctx.rawMessage) {
    return ctx.rawMessage;
  }

  return i18n.t(fallbackKey, 'Something went wrong. Please try again.');
}
