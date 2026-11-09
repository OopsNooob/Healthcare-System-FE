import i18n from '@/i18n';

/**
 * Presentation helpers for booking-related backend values so raw enum/IANA
 * strings are never rendered directly in the UI.
 */
export function bookingPolicyLabel(policy: string): string {
  switch (policy) {
    case 'instant':
      return i18n.t('mobile.policy_instant_short', 'Xác nhận tự động');
    case 'approval_required':
      return i18n.t('mobile.policy_approval_short', 'Cần bác sĩ duyệt');
    default:
      return policy;
  }
}

export function timezoneLabel(timezone: string): string {
  if (timezone === 'Asia/Ho_Chi_Minh') {
    return i18n.t('mobile.timezone_vietnam', 'Giờ Việt Nam');
  }
  return timezone;
}
