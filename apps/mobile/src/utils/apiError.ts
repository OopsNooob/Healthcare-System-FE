import axios from 'axios';
import i18n from '@/i18n';

export function extractApiErrorMessage(err: unknown, fallbackKey = 'mobile.error_generic'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[]; error?: string } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return i18n.t(fallbackKey, 'Something went wrong. Please try again.');
}
