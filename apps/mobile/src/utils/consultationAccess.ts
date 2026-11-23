export type ConsultationLockReason =
  | 'pending'
  | 'scheduled_not_checked_in'
  | 'scheduled_waiting_call'
  | 'closed';

export interface ConsultationAccessInput {
  mode?: string | null;
  requestStatus?: string | null;
  sessionStatus?: string | null;
  queueJoinedAt?: string | Date | null;
  calledAt?: string | Date | null;
  scheduledStartAt?: string | Date | null;
  noShowAfterMinutes?: number | null;
}

export interface ConsultationAccess {
  isScheduled: boolean;
  isPending: boolean;
  isAccepted: boolean;
  isNotStarted: boolean;
  isWaiting: boolean;
  isInConsultation: boolean;
  isInterrupted: boolean;
  isCompleted: boolean;
  isClosed: boolean;
  isQueued: boolean;
  isCalled: boolean;
  canChat: boolean;
  canVideoCall: boolean;
  canStart: boolean;
  canComplete: boolean;
  canMarkNoShow: boolean;
  canReview: boolean;
  chatLockReason: ConsultationLockReason | null;
}

function parseTimestampMs(value?: string | Date | null): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Evaluates lifecycle permissions for a consultation in one place across doctor and patient screens.
 */
export function evaluateConsultationAccess(
  input: ConsultationAccessInput,
  nowMs = Date.now(),
): ConsultationAccess {
  const mode = String(input.mode ?? '').toLowerCase();
  const requestStatus = String(input.requestStatus ?? '').toLowerCase();
  const sessionStatus = String(input.sessionStatus ?? '').toLowerCase();

  const isScheduled = mode === 'scheduled';
  const isPending = requestStatus === 'pending';
  const isAccepted = requestStatus === 'accepted';
  const isNotStarted = sessionStatus === 'not_started' || sessionStatus === 'scheduled';
  const isWaiting = sessionStatus === 'waiting';
  const isInConsultation = sessionStatus === 'in_consultation';
  const isInterrupted = sessionStatus === 'interrupted';
  const isCompleted = sessionStatus === 'completed';
  const isClosed =
    isCompleted ||
    sessionStatus === 'no_show' ||
    requestStatus === 'cancelled' ||
    requestStatus === 'declined' ||
    requestStatus === 'expired';

  const isQueued = Boolean(input.queueJoinedAt);
  const isCalled = Boolean(input.calledAt);

  const canChat =
    isAccepted &&
    !isClosed &&
    (isInConsultation || isInterrupted || (isWaiting && (!isScheduled || isCalled)));
  const canVideoCall = canChat;
  const canStart = isAccepted && isWaiting && (!isScheduled || isCalled);
  const canComplete = isAccepted && isInConsultation;

  const scheduledStartMs = parseTimestampMs(input.scheduledStartAt);
  const noShowAfterMinutes =
    typeof input.noShowAfterMinutes === 'number' && Number.isFinite(input.noShowAfterMinutes)
      ? input.noShowAfterMinutes
      : 10;
  const canMarkNoShow =
    isAccepted &&
    isScheduled &&
    isWaiting &&
    scheduledStartMs !== null &&
    nowMs >= scheduledStartMs + noShowAfterMinutes * 60_000;

  const canReview = isCompleted;

  let chatLockReason: ConsultationLockReason | null = null;
  if (isPending) {
    chatLockReason = 'pending';
  } else if (isClosed) {
    chatLockReason = 'closed';
  } else if (isAccepted && isScheduled && isNotStarted) {
    chatLockReason = 'scheduled_not_checked_in';
  } else if (isAccepted && isScheduled && isWaiting && !isCalled) {
    chatLockReason = 'scheduled_waiting_call';
  } else if (!canChat) {
    chatLockReason = 'closed';
  }

  return {
    isScheduled,
    isPending,
    isAccepted,
    isNotStarted,
    isWaiting,
    isInConsultation,
    isInterrupted,
    isCompleted,
    isClosed,
    isQueued,
    isCalled,
    canChat,
    canVideoCall,
    canStart,
    canComplete,
    canMarkNoShow,
    canReview,
    chatLockReason,
  };
}

