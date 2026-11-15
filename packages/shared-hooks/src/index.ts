import {
  SOCKET_EVENTS as RAW_SOCKET_EVENTS,
  type FeTypes,
} from "@healthcare/api-client";

export * from "./storage";
export * from "./api";
export {
  createFeApiSdk,
  normalizePaginatedList,
  normalizeCursorList,
  buildPaginationParams,
  generateIdempotencyKey,
  SOCKET_NAMESPACES,
  type ApiExecutor,
  type FeApiSdk,
  type PaginatedResult,
  type CursorPaginatedResult,
} from "@healthcare/api-client";

export type { FeTypes };

export const SOCKET_EVENTS = {
  ...RAW_SOCKET_EVENTS,
  JOIN_CONSULTATION: RAW_SOCKET_EVENTS.chat.client.joinConsultation,
  LEAVE_CONSULTATION: RAW_SOCKET_EVENTS.chat.client.leaveConsultation,
  CONSULTATION_MESSAGE: RAW_SOCKET_EVENTS.chat.server.consultationMessage,
  USER_STATUS_CHANGED: RAW_SOCKET_EVENTS.presence.server.userStatusChanged,
  CONSULTATION_MESSAGE_NOTIFICATION:
    RAW_SOCKET_EVENTS.notifications.server.consultationMessageNotification,
  CONSULTATION_HEARTBEAT:
    RAW_SOCKET_EVENTS.consultations.client.consultationHeartbeat,
  CONSULTATIONS_CHANGED:
    RAW_SOCKET_EVENTS.consultations.server.consultationChanged,
  QUEUE_CHANGED: RAW_SOCKET_EVENTS.consultations.server.queueChanged,
  QUEUE_CALLED: RAW_SOCKET_EVENTS.consultations.server.queueCalled,
} as const;
export * from "./hooks/auth/useLogin";
export * from "./hooks/auth/useLogout";
export * from "./hooks/auth/useSignUp";
export * from "./hooks/auth/useChangePassword";
export * from "./hooks/auth/useConfirmOtp";
export * from "./hooks/auth/useForgotPassword";
export * from "./hooks/auth/useDoctorPrefillData";
export * from "./store/useAuthStore";
export * from "./services/auth/login.service";
export * from "./services/auth/logout.service";
export * from "./services/auth/signup.service";
export * from "./services/auth/change-password.service";
export * from "./services/auth/confirm-otp.service";
export * from "./services/auth/forgot-password.service";
export * from "./services/health-metrics.service";
export * from "./hooks/useHealthMetrics";
export * from "./utils/useMetricStatus";
