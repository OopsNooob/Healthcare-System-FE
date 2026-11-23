import axios from 'axios';
import i18n from '@/i18n';

export interface ApiErrorInfo {
  code?: string;
  details?: Record<string, unknown>;
  rawMessage?: string;
}

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

interface ApiErrorPayload {
  code?: unknown;
  details?: unknown;
  message?: unknown;
  error?: unknown;
}

/**
 * Extracts structured backend error code, details, and raw message from an HTTP/Error object.
 */
export function extractApiErrorInfo(err: unknown): ApiErrorInfo {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorPayload | undefined;
    const rawMessage = Array.isArray(data?.message)
      ? data.message.map(String).join(', ')
      : typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : err.message || undefined;

    return {
      code: typeof data?.code === 'string' ? data.code : undefined,
      details:
        data?.details && typeof data.details === 'object' && !Array.isArray(data.details)
          ? (data.details as Record<string, unknown>)
          : undefined,
      rawMessage,
    };
  }

  if (err && typeof err === 'object') {
    const maybe = err as ApiErrorPayload;
    const rawMessage = Array.isArray(maybe.message)
      ? maybe.message.map(String).join(', ')
      : typeof maybe.message === 'string'
        ? maybe.message
        : typeof maybe.error === 'string'
          ? maybe.error
          : undefined;
    return {
      code: typeof maybe.code === 'string' ? maybe.code : undefined,
      details:
        maybe.details && typeof maybe.details === 'object' && !Array.isArray(maybe.details)
          ? (maybe.details as Record<string, unknown>)
          : undefined,
      rawMessage,
    };
  }

  return {};
}

const STATIC_CODE_MAP: Record<string, { key: string; fallback: string }> = {
  SLOT_IN_PAST: {
    key: 'mobile.api_err_slot_in_past',
    fallback: 'Slot start time must be in the future.',
  },
  SLOT_OVERLAP: {
    key: 'mobile.api_err_slot_overlap',
    fallback: 'This slot overlaps another active slot or violates the buffer interval.',
  },
  SLOT_NOT_MUTABLE: {
    key: 'mobile.api_err_slot_not_mutable',
    fallback: 'This slot cannot be modified in its current status.',
  },
  INVALID_SLOT_RANGE: {
    key: 'mobile.api_err_invalid_slot_range',
    fallback: 'End time must be after start time.',
  },
  INVALID_TIMEZONE: {
    key: 'mobile.api_err_invalid_timezone',
    fallback: 'Invalid IANA timezone.',
  },
  DOCTOR_NOT_APPROVED: {
    key: 'mobile.api_err_doctor_not_approved',
    fallback: 'Only an active approved doctor can manage availability slots.',
  },
  BOOKING_POLICY_NOT_CONFIGURED: {
    key: 'mobile.api_err_booking_policy_not_configured',
    fallback: 'Scheduled booking policy is not configured. Please try again later.',
  },
};

/**
 * Translates known backend error codes (with optional structured details) to the active locale.
 */
export function translateApiErrorCode(
  code: string | undefined,
  details: Record<string, unknown> | undefined,
  tFn: TranslateFn = (key, opts) => i18n.t(key, opts)
): string | null {
  if (!code) return null;

  if (code === 'MIN_NOTICE_NOT_MET') {
    const minutes =
      typeof details?.minNoticeMinutes === 'number' && Number.isFinite(details.minNoticeMinutes)
        ? details.minNoticeMinutes
        : 60;
    return tFn('mobile.api_err_min_notice_not_met', {
      minutes,
      defaultValue: `The slot must be scheduled at least ${minutes} minutes in advance.`,
    });
  }

  const mapped = STATIC_CODE_MAP[code];
  if (!mapped) return null;
  return tFn(mapped.key, { defaultValue: mapped.fallback });
}

export function extractApiErrorMessage(err: unknown, fallbackKey = 'mobile.error_generic'): string {
  const info = extractApiErrorInfo(err);
  const translated = translateApiErrorCode(info.code, info.details);
  if (translated) {
    return translated;
  }

  if (info.rawMessage?.toLowerCase().includes('minimum notice')) {
    const minutes =
      typeof info.details?.minNoticeMinutes === 'number' &&
      Number.isFinite(info.details.minNoticeMinutes)
        ? info.details.minNoticeMinutes
        : 60;
    return i18n.t('mobile.api_err_min_notice_not_met', {
      minutes,
      defaultValue: `The slot must be scheduled at least ${minutes} minutes in advance.`,
    });
  }

  if (info.rawMessage) {
    return info.rawMessage;
  }

  return i18n.t(fallbackKey, 'Something went wrong. Please try again.');
}
