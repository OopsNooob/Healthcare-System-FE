/**
 * Presentation helpers for booking-related backend values so raw enum/IANA
 * strings are never rendered directly in the UI.
 */
export function bookingPolicyLabel(policy: string, isVi: boolean): string {
  switch (policy) {
    case 'instant':
      return isVi ? 'Xác nhận tự động' : 'Auto-confirm';
    case 'approval_required':
      return isVi ? 'Cần bác sĩ duyệt' : 'Doctor approval required';
    default:
      return policy;
  }
}

export function timezoneLabel(timezone: string, isVi: boolean): string {
  if (timezone === 'Asia/Ho_Chi_Minh') {
    return isVi ? 'Giờ Việt Nam (GMT+7)' : 'Vietnam time (GMT+7)';
  }
  return timezone;
}

