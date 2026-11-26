/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as FeTypes from './fe-api-types';
import { generateIdempotencyKey } from './pagination';

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiExecutor {
  request<T = unknown>(config: ApiRequestConfig): Promise<{ data: T }>;
}

export interface RequestRuntimeOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface NativeMultipartAsset {
  uri: string;
  name?: string;
  fileName?: string;
  type?: string;
  mimeType?: string;
}

export type MultipartFileInput = FeTypes.UploadBinary | NativeMultipartAsset;

export type UploadSingleInput = FeTypes.UploadUploadSingleRequest & {
  file: MultipartFileInput;
};

type WithNativeMultipart<T> = T extends FeTypes.UploadBinary
  ? MultipartFileInput
  : T extends Array<infer U>
  ? Array<WithNativeMultipart<U>>
  : T extends Record<string, unknown>
  ? { [K in keyof T]: WithNativeMultipart<T[K]> }
  : T;

export type FlexibleIdempotencyHeaders = {
  'Idempotency-Key'?: string;
  'idempotency-key'?: string;
} & Record<string, string | undefined>;

export type WithFlexibleHeaders<T> = T extends { headers: unknown }
  ? Omit<T, 'headers'> & { headers?: FlexibleIdempotencyHeaders }
  : T;

export interface AiDocumentsRagIngestingRequest {
  params: { id: string };
}

export interface AiDocumentsRagIngestingResponse {
  statusCode?: number;
  message?: string;
  accepted?: boolean;
  data?: unknown;
  [key: string]: unknown;
}

const FILE_FIELD_NAMES = new Set([
  'file',
  'files',
  'newFilesToUpload',
  'attachments',
  'images',
]);

function isNativeAsset(value: unknown): value is NativeMultipartAsset {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as NativeMultipartAsset).uri === 'string'
  );
}

function isBinaryLike(value: unknown): boolean {
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  return isNativeAsset(value);
}

function appendFormEntry(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      appendFormEntry(formData, key, item);
    }
    return;
  }
  if (isNativeAsset(value)) {
    const filePayload = {
      uri: value.uri,
      name: value.name ?? value.fileName ?? `${key}.bin`,
      type: value.type ?? value.mimeType ?? 'application/octet-stream',
    };
    formData.append(key, filePayload as unknown as Blob);
    return;
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    formData.append(key, value);
    return;
  }
  if (typeof value === 'object') {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
}

function buildMultipartFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    appendFormEntry(formData, key, value);
  }
  return formData;
}

function hasAnyBinaryValue(payload: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(payload)) {
    if (!FILE_FIELD_NAMES.has(key) && !isBinaryLike(value)) continue;
    if (Array.isArray(value)) {
      if (value.some((item) => isBinaryLike(item))) return true;
    } else if (isBinaryLike(value)) {
      return true;
    }
  }
  return false;
}

function interpolatePath(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    encodeURIComponent(String(params[key] ?? '')),
  );
}

function normalizeRequestHeaders(
  rawHeaders?: Record<string, string | undefined>,
  requiresIdempotency?: boolean,
  extraHeaders?: Record<string, string>,
): Record<string, string> | undefined {
  const merged: Record<string, string> = {};
  if (rawHeaders) {
    for (const [key, val] of Object.entries(rawHeaders)) {
      if (val !== undefined && key.toLowerCase() !== 'idempotency-key') {
        merged[key] = val;
      }
    }
  }
  if (extraHeaders) {
    for (const [key, val] of Object.entries(extraHeaders)) {
      if (key.toLowerCase() !== 'idempotency-key') {
        merged[key] = val;
      }
    }
  }
  const idempotency =
    rawHeaders?.['Idempotency-Key'] ??
    rawHeaders?.['idempotency-key'] ??
    extraHeaders?.['Idempotency-Key'] ??
    extraHeaders?.['idempotency-key'] ??
    (requiresIdempotency ? generateIdempotencyKey() : undefined);
  if (idempotency) {
    merged['Idempotency-Key'] = idempotency;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

interface EndpointSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  isWrapper: boolean;
  isMultipart: boolean;
  requiresIdempotency: boolean;
}

async function runEndpoint<TReq, TRes>(
  executor: ApiExecutor,
  spec: EndpointSpec,
  input?: TReq,
  options?: RequestRuntimeOptions,
): Promise<TRes> {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    const url = interpolatePath(spec.path, undefined);
    const headers = normalizeRequestHeaders(
      { 'Content-Type': 'multipart/form-data' },
      spec.requiresIdempotency,
      options?.headers,
    );
    const response = await executor.request<TRes>({
      method: spec.method,
      url,
      data: input,
      headers,
      signal: options?.signal,
    });
    return response.data;
  }

  const record = (input && typeof input === 'object' ? input : {}) as Record<
    string,
    unknown
  >;

  let pathParams: Record<string, unknown> | undefined;
  let queryParams: Record<string, unknown> | undefined;
  let rawHeaders: Record<string, string | undefined> | undefined;
  let data: unknown;

  if (spec.isWrapper) {
    pathParams = record.params as Record<string, unknown> | undefined;
    queryParams = record.query as Record<string, unknown> | undefined;
    rawHeaders = record.headers as
      | Record<string, string | undefined>
      | undefined;

    if (spec.isMultipart) {
      if (typeof FormData !== 'undefined' && record.body instanceof FormData) {
        data = record.body;
      } else {
        const mergedBody: Record<string, unknown> = {
          ...((record.body as Record<string, unknown> | undefined) ?? {}),
          ...(record.images !== undefined ? { images: record.images } : {}),
        };
        data = buildMultipartFormData(mergedBody);
      }
    } else if ('body' in record) {
      data = record.body;
    }
  } else if (spec.isMultipart) {
    const forceMultipart =
      spec.path.startsWith('/upload/') || spec.path === '/ai-documents';
    if (forceMultipart || hasAnyBinaryValue(record)) {
      data = buildMultipartFormData(record);
    } else {
      data = record;
    }
  } else if (Object.keys(record).length > 0 && spec.method !== 'GET') {
    data = record;
  }

  const isSendingFormData =
    typeof FormData !== 'undefined' && data instanceof FormData;
  const headers = normalizeRequestHeaders(
    isSendingFormData
      ? { 'Content-Type': 'multipart/form-data', ...(rawHeaders ?? {}) }
      : rawHeaders,
    spec.requiresIdempotency,
    options?.headers,
  );

  const response = await executor.request<TRes>({
    method: spec.method,
    url: interpolatePath(spec.path, pathParams),
    ...(queryParams ? { params: queryParams } : {}),
    ...(data !== undefined ? { data } : {}),
    ...(headers ? { headers } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  return response.data;
}

export const SOCKET_NAMESPACES = {
  chat: '/chat',
  consultations: '/consultations',
  notifications: '/notifications',
  presence: '/',
} as const;

export const SOCKET_EVENTS = {
  chat: {
    client: {
      joinConsultation: 'join_consultation',
      leaveConsultation: 'leave_consultation',
      sendConsultationMessage: 'send_consultation_message',
      getConsultationMessages: 'get_consultation_messages',
    },
    server: {
      joinedConsultation: 'joined_consultation',
      leftConsultation: 'left_consultation',
      consultationMessage: 'consultation_message',
      consultationMessageSent: 'consultation_message_sent',
      consultationMessages: 'consultation_messages',
      joinConsultationError: 'join_consultation_error',
      leaveConsultationError: 'leave_consultation_error',
      sendConsultationMessageError: 'send_consultation_message_error',
      getConsultationMessagesError: 'get_consultation_messages_error',
    },
  },
  consultations: {
    client: {
      consultationHeartbeat: 'consultation_heartbeat',
    },
    server: {
      consultationChanged: 'consultation_changed',
      queueChanged: 'queue.v1.changed',
      queueCalled: 'queue.v1.called',
    },
  },
  notifications: {
    server: {
      connected: 'connected',
      notifications: 'notifications',
      consultationMessageNotification: 'consultation_message_notification',
      accountBanned: 'account_banned',
    },
  },
  presence: {
    server: {
      userStatusChanged: 'userStatusChanged',
    },
  },
} as const;

export interface RealtimeEventPayloads {
  // /chat client -> server
  join_consultation: FeTypes.ChatJoinConsultationPayload;
  leave_consultation: FeTypes.ChatLeaveConsultationPayload;
  send_consultation_message: FeTypes.ChatSendConsultationMessagePayload;
  get_consultation_messages: FeTypes.ChatGetConsultationMessagesPayload;
  // /chat server -> client
  joined_consultation: FeTypes.RealtimeConsultationRoomResult;
  left_consultation: FeTypes.RealtimeConsultationRoomResult;
  consultation_message: FeTypes.RealtimeMessageDocument;
  consultation_message_sent: FeTypes.RealtimeMessageDocument;
  consultation_messages: FeTypes.RealtimeConsultationMessages;
  join_consultation_error: FeTypes.RealtimeConsultationError;
  leave_consultation_error: FeTypes.RealtimeConsultationError;
  send_consultation_message_error: FeTypes.RealtimeConsultationError;
  get_consultation_messages_error: FeTypes.RealtimeConsultationError;
  // /consultations
  consultation_heartbeat: FeTypes.ConsultationHeartbeatPayload;
  consultation_changed: FeTypes.RealtimeConsultationChanged;
  'queue.v1.changed': FeTypes.RealtimeQueueChanged;
  'queue.v1.called': FeTypes.RealtimeQueueCalled;
  // /notifications
  connected: FeTypes.RealtimeNotificationConnected;
  notifications: FeTypes.RealtimeNotificationChanged;
  consultation_message_notification: FeTypes.RealtimeConsultationMessageNotification;
  account_banned: FeTypes.RealtimeAccountBanned;
  // /
  userStatusChanged: FeTypes.RealtimePresenceChanged;
}

export function createFeApiSdk(executor: ApiExecutor) {
  return {
    /** GET /api/v1/health/live */
    healthLive(input?: FeTypes.HealthLiveRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthLiveResponse> {
      return runEndpoint<FeTypes.HealthLiveRequest, FeTypes.HealthLiveResponse>(
        executor,
        {
          method: 'GET',
          path: '/health/live',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/health/ready */
    healthReady(input?: FeTypes.HealthReadyRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthReadyResponse> {
      return runEndpoint<FeTypes.HealthReadyRequest, FeTypes.HealthReadyResponse>(
        executor,
        {
          method: 'GET',
          path: '/health/ready',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/register/patient */
    authRegisterPatient(input: FeTypes.AuthRegisterPatientRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRegisterPatientResponse> {
      return runEndpoint<FeTypes.AuthRegisterPatientRequest, FeTypes.AuthRegisterPatientResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/register/patient',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/register/doctor */
    authRegisterDoctor(input: WithNativeMultipart<FeTypes.AuthRegisterDoctorRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRegisterDoctorResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.AuthRegisterDoctorRequest> | FormData, FeTypes.AuthRegisterDoctorResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/register/doctor',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/doctor-reapplication/restore */
    authRestoreDoctorReapplication(input: FeTypes.AuthRestoreDoctorReapplicationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRestoreDoctorReapplicationResponse> {
      return runEndpoint<FeTypes.AuthRestoreDoctorReapplicationRequest, FeTypes.AuthRestoreDoctorReapplicationResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/doctor-reapplication/restore',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/verify-email */
    authVerifyEmail(input: FeTypes.AuthVerifyEmailRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthVerifyEmailResponse> {
      return runEndpoint<FeTypes.AuthVerifyEmailRequest, FeTypes.AuthVerifyEmailResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/verify-email',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/request-email-verification */
    authRequestEmailVerification(input: FeTypes.AuthRequestEmailVerificationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRequestEmailVerificationResponse> {
      return runEndpoint<FeTypes.AuthRequestEmailVerificationRequest, FeTypes.AuthRequestEmailVerificationResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/request-email-verification',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/password-recovery */
    authPasswordRecovery(input: FeTypes.AuthPasswordRecoveryRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthPasswordRecoveryResponse> {
      return runEndpoint<FeTypes.AuthPasswordRecoveryRequest, FeTypes.AuthPasswordRecoveryResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/password-recovery',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/reset-password */
    authResetPassword(input: FeTypes.AuthResetPasswordRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthResetPasswordResponse> {
      return runEndpoint<FeTypes.AuthResetPasswordRequest, FeTypes.AuthResetPasswordResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/reset-password',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/oauth/google/mobile/attempt */
    authBeginGoogleMobileOAuth(input: FeTypes.BeginGoogleMobileOAuthRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BeginGoogleMobileOAuthResponse> {
      return runEndpoint<FeTypes.BeginGoogleMobileOAuthRequest, FeTypes.BeginGoogleMobileOAuthResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/oauth/google/mobile/attempt',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/oauth/google/exchange */
    authExchangeGoogleOAuthTicket(input: FeTypes.AuthExchangeGoogleOAuthTicketRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthExchangeGoogleOAuthTicketResponse> {
      return runEndpoint<FeTypes.AuthExchangeGoogleOAuthTicketRequest, FeTypes.AuthExchangeGoogleOAuthTicketResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/oauth/google/exchange',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/login */
    authLogin(input: FeTypes.AuthLoginRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthLoginResponse> {
      return runEndpoint<FeTypes.AuthLoginRequest, FeTypes.AuthLoginResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/login',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/refresh */
    authRefresh(input: FeTypes.AuthRefreshRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRefreshResponse> {
      return runEndpoint<FeTypes.AuthRefreshRequest, FeTypes.AuthRefreshResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/refresh',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/auth/sessions */
    authListSessions(input?: FeTypes.AuthListSessionsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthListSessionsResponse> {
      return runEndpoint<FeTypes.AuthListSessionsRequest, FeTypes.AuthListSessionsResponse>(
        executor,
        {
          method: 'GET',
          path: '/auth/sessions',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/sessions/revoke */
    authRevokeSession(input: FeTypes.AuthRevokeSessionRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthRevokeSessionResponse> {
      return runEndpoint<FeTypes.AuthRevokeSessionRequest, FeTypes.AuthRevokeSessionResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/sessions/revoke',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/logout */
    authLogout(input?: FeTypes.AuthLogoutRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthLogoutResponse> {
      return runEndpoint<FeTypes.AuthLogoutRequest, FeTypes.AuthLogoutResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/logout',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/auth/logout-all */
    authLogoutAll(input?: FeTypes.AuthLogoutAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthLogoutAllResponse> {
      return runEndpoint<FeTypes.AuthLogoutAllRequest, FeTypes.AuthLogoutAllResponse>(
        executor,
        {
          method: 'POST',
          path: '/auth/logout-all',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/auth/me */
    authGetProfile(input?: FeTypes.AuthGetProfileRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AuthGetProfileResponse> {
      return runEndpoint<FeTypes.AuthGetProfileRequest, FeTypes.AuthGetProfileResponse>(
        executor,
        {
          method: 'GET',
          path: '/auth/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/upload/single */
    uploadUploadSingle(input: WithNativeMultipart<UploadSingleInput> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.UploadUploadSingleResponse> {
      return runEndpoint<WithNativeMultipart<UploadSingleInput> | FormData, FeTypes.UploadUploadSingleResponse>(
        executor,
        {
          method: 'POST',
          path: '/upload/single',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/upload/multiple */
    uploadUploadMultiple(input: WithNativeMultipart<FeTypes.UploadUploadMultipleRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.UploadUploadMultipleResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.UploadUploadMultipleRequest> | FormData, FeTypes.UploadUploadMultipleResponse>(
        executor,
        {
          method: 'POST',
          path: '/upload/multiple',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/upload/info */
    uploadGetFileInfo(input: FeTypes.UploadGetFileInfoRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UploadGetFileInfoResponse> {
      return runEndpoint<FeTypes.UploadGetFileInfoRequest, FeTypes.UploadGetFileInfoResponse>(
        executor,
        {
          method: 'GET',
          path: '/upload/info',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/upload/debug/list */
    uploadDebugListFiles(input?: FeTypes.UploadDebugListFilesRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UploadDebugListFilesResponse> {
      return runEndpoint<FeTypes.UploadDebugListFilesRequest, FeTypes.UploadDebugListFilesResponse>(
        executor,
        {
          method: 'GET',
          path: '/upload/debug/list',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/upload/delete */
    uploadDeleteFile(input: FeTypes.UploadDeleteFileRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UploadDeleteFileResponse> {
      return runEndpoint<FeTypes.UploadDeleteFileRequest, FeTypes.UploadDeleteFileResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/upload/delete',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/upload/delete-multiple */
    uploadDeleteMultiple(input: FeTypes.UploadDeleteMultipleRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UploadDeleteMultipleResponse> {
      return runEndpoint<FeTypes.UploadDeleteMultipleRequest, FeTypes.UploadDeleteMultipleResponse>(
        executor,
        {
          method: 'POST',
          path: '/upload/delete-multiple',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/upload/avatar */
    uploadUploadAvatar(input: WithNativeMultipart<FeTypes.UploadUploadAvatarRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.UploadUploadAvatarResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.UploadUploadAvatarRequest> | FormData, FeTypes.UploadUploadAvatarResponse>(
        executor,
        {
          method: 'POST',
          path: '/upload/avatar',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/upload/doctor-verification */
    uploadUploadDoctorVerification(input: WithNativeMultipart<FeTypes.UploadUploadDoctorVerificationRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.UploadUploadDoctorVerificationResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.UploadUploadDoctorVerificationRequest> | FormData, FeTypes.UploadUploadDoctorVerificationResponse>(
        executor,
        {
          method: 'POST',
          path: '/upload/doctor-verification',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users */
    usersFindAll(input?: FeTypes.UsersFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindAllResponse> {
      return runEndpoint<FeTypes.UsersFindAllRequest, FeTypes.UsersFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/users',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/search */
    usersFindAllPaged(input: FeTypes.UsersFindAllPagedRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindAllPagedResponse> {
      return runEndpoint<FeTypes.UsersFindAllPagedRequest, FeTypes.UsersFindAllPagedResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/search',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/doctors */
    usersFindDoctors(input?: FeTypes.UsersFindDoctorsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindDoctorsResponse> {
      return runEndpoint<FeTypes.UsersFindDoctorsRequest, FeTypes.UsersFindDoctorsResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/doctors',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/doctors/search */
    usersSearchDoctors(input: FeTypes.UsersSearchDoctorsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersSearchDoctorsResponse> {
      return runEndpoint<FeTypes.UsersSearchDoctorsRequest, FeTypes.UsersSearchDoctorsResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/doctors/search',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/doctor/{email} */
    usersFindDoctorByEmail(input: FeTypes.UsersFindDoctorByEmailRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindDoctorByEmailResponse> {
      return runEndpoint<FeTypes.UsersFindDoctorByEmailRequest, FeTypes.UsersFindDoctorByEmailResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/doctor/{email}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/me */
    usersGetMe(input?: FeTypes.UsersGetMeRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersGetMeResponse> {
      return runEndpoint<FeTypes.UsersGetMeRequest, FeTypes.UsersGetMeResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/users/me */
    usersUpdateMe(input?: WithNativeMultipart<FeTypes.UsersUpdateMeRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.UsersUpdateMeResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.UsersUpdateMeRequest> | FormData, FeTypes.UsersUpdateMeResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/users/me',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/{id} */
    usersFindOne(input: FeTypes.UsersFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindOneResponse> {
      return runEndpoint<FeTypes.UsersFindOneRequest, FeTypes.UsersFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/users/{id} */
    usersDeactivate(input: FeTypes.UsersDeactivateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersDeactivateResponse> {
      return runEndpoint<FeTypes.UsersDeactivateRequest, FeTypes.UsersDeactivateResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/users/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/patients/me */
    patientProfileGetProfile(input?: FeTypes.PatientProfileGetProfileRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientProfileGetProfileResponse> {
      return runEndpoint<FeTypes.PatientProfileGetProfileRequest, FeTypes.PatientProfileGetProfileResponse>(
        executor,
        {
          method: 'GET',
          path: '/patients/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/patients/me */
    patientProfileCreate(input?: FeTypes.PatientProfileCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientProfileCreateResponse> {
      return runEndpoint<FeTypes.PatientProfileCreateRequest, FeTypes.PatientProfileCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/patients/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/patients/me */
    patientProfileDelete(input?: FeTypes.PatientProfileDeleteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientProfileDeleteResponse> {
      return runEndpoint<FeTypes.PatientProfileDeleteRequest, FeTypes.PatientProfileDeleteResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/patients/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/patients */
    patientProfileFindAll(input: FeTypes.PatientProfileFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientProfileFindAllResponse> {
      return runEndpoint<FeTypes.PatientProfileFindAllRequest, FeTypes.PatientProfileFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/patients',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admins */
    adminsFindAll(input: FeTypes.AdminsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminsFindAllResponse> {
      return runEndpoint<FeTypes.AdminsFindAllRequest, FeTypes.AdminsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/admins',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/admins */
    adminsCreate(input: FeTypes.AdminsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminsCreateResponse> {
      return runEndpoint<FeTypes.AdminsCreateRequest, FeTypes.AdminsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/admins',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/admins/{id} */
    adminsUpdate(input: FeTypes.AdminsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminsUpdateResponse> {
      return runEndpoint<FeTypes.AdminsUpdateRequest, FeTypes.AdminsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/admins/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/admins/{id} */
    adminsDelete(input: FeTypes.AdminsDeleteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminsDeleteResponse> {
      return runEndpoint<FeTypes.AdminsDeleteRequest, FeTypes.AdminsDeleteResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/admins/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/notifications */
    notificationsFindAll(input: FeTypes.NotificationsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsFindAllResponse> {
      return runEndpoint<FeTypes.NotificationsFindAllRequest, FeTypes.NotificationsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/notifications',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/notifications */
    notificationsCreate(input: FeTypes.NotificationsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsCreateResponse> {
      return runEndpoint<FeTypes.NotificationsCreateRequest, FeTypes.NotificationsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/notifications',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/notifications/mark-all-as-read */
    notificationsMarkAllAsRead(input?: FeTypes.NotificationsMarkAllAsReadRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsMarkAllAsReadResponse> {
      return runEndpoint<FeTypes.NotificationsMarkAllAsReadRequest, FeTypes.NotificationsMarkAllAsReadResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/notifications/mark-all-as-read',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/notifications/unread/count */
    notificationsCountUnread(input?: FeTypes.NotificationsCountUnreadRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsCountUnreadResponse> {
      return runEndpoint<FeTypes.NotificationsCountUnreadRequest, FeTypes.NotificationsCountUnreadResponse>(
        executor,
        {
          method: 'GET',
          path: '/notifications/unread/count',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/notifications/{id} */
    notificationsFindOne(input: FeTypes.NotificationsFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsFindOneResponse> {
      return runEndpoint<FeTypes.NotificationsFindOneRequest, FeTypes.NotificationsFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/notifications/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/notifications/{id} */
    notificationsUpdate(input: FeTypes.NotificationsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsUpdateResponse> {
      return runEndpoint<FeTypes.NotificationsUpdateRequest, FeTypes.NotificationsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/notifications/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/notifications/{id} */
    notificationsDelete(input: FeTypes.NotificationsDeleteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.NotificationsDeleteResponse> {
      return runEndpoint<FeTypes.NotificationsDeleteRequest, FeTypes.NotificationsDeleteResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/notifications/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/presence/status */
    presenceCheckUsersStatus(input?: FeTypes.PresenceCheckUsersStatusRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PresenceCheckUsersStatusResponse> {
      return runEndpoint<FeTypes.PresenceCheckUsersStatusRequest, FeTypes.PresenceCheckUsersStatusResponse>(
        executor,
        {
          method: 'POST',
          path: '/presence/status',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/blacklist-keywords */
    blacklistKeywordsGetAll(input: FeTypes.BlacklistKeywordsGetAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsGetAllResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsGetAllRequest, FeTypes.BlacklistKeywordsGetAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/blacklist-keywords',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/blacklist-keywords */
    blacklistKeywordsCreate(input: FeTypes.BlacklistKeywordsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsCreateResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsCreateRequest, FeTypes.BlacklistKeywordsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/blacklist-keywords',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/blacklist-keywords/check */
    blacklistKeywordsCheckContent(input?: FeTypes.BlacklistKeywordsCheckContentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsCheckContentResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsCheckContentRequest, FeTypes.BlacklistKeywordsCheckContentResponse>(
        executor,
        {
          method: 'POST',
          path: '/blacklist-keywords/check',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/blacklist-keywords/{id} */
    blacklistKeywordsGetKeyword(input: FeTypes.BlacklistKeywordsGetKeywordRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsGetKeywordResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsGetKeywordRequest, FeTypes.BlacklistKeywordsGetKeywordResponse>(
        executor,
        {
          method: 'GET',
          path: '/blacklist-keywords/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/blacklist-keywords/{id} */
    blacklistKeywordsUpdateKeyword(input: FeTypes.BlacklistKeywordsUpdateKeywordRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsUpdateKeywordResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsUpdateKeywordRequest, FeTypes.BlacklistKeywordsUpdateKeywordResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/blacklist-keywords/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/blacklist-keywords/{id} */
    blacklistKeywordsDeleteKeyword(input: FeTypes.BlacklistKeywordsDeleteKeywordRequest, options?: RequestRuntimeOptions): Promise<FeTypes.BlacklistKeywordsDeleteKeywordResponse> {
      return runEndpoint<FeTypes.BlacklistKeywordsDeleteKeywordRequest, FeTypes.BlacklistKeywordsDeleteKeywordResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/blacklist-keywords/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/violations */
    violationsFindAll(input: FeTypes.ViolationsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsFindAllResponse> {
      return runEndpoint<FeTypes.ViolationsFindAllRequest, FeTypes.ViolationsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/violations',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/violations */
    violationsCreate(input: FeTypes.ViolationsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsCreateResponse> {
      return runEndpoint<FeTypes.ViolationsCreateRequest, FeTypes.ViolationsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/violations',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/violations/{id} */
    violationsFindById(input: FeTypes.ViolationsFindByIdRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsFindByIdResponse> {
      return runEndpoint<FeTypes.ViolationsFindByIdRequest, FeTypes.ViolationsFindByIdResponse>(
        executor,
        {
          method: 'GET',
          path: '/violations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/violations/{id} */
    violationsUpdate(input: FeTypes.ViolationsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsUpdateResponse> {
      return runEndpoint<FeTypes.ViolationsUpdateRequest, FeTypes.ViolationsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/violations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/violations/{id} */
    violationsDelete(input: FeTypes.ViolationsDeleteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsDeleteResponse> {
      return runEndpoint<FeTypes.ViolationsDeleteRequest, FeTypes.ViolationsDeleteResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/violations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/violations/user/{userId} */
    violationsFindByUserId(input: FeTypes.ViolationsFindByUserIdRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsFindByUserIdResponse> {
      return runEndpoint<FeTypes.ViolationsFindByUserIdRequest, FeTypes.ViolationsFindByUserIdResponse>(
        executor,
        {
          method: 'GET',
          path: '/violations/user/{userId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/violations/{id}/resolve */
    violationsResolve(input: FeTypes.ViolationsResolveRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsResolveResponse> {
      return runEndpoint<FeTypes.ViolationsResolveRequest, FeTypes.ViolationsResolveResponse>(
        executor,
        {
          method: 'POST',
          path: '/violations/{id}/resolve',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/violations/stats/overview */
    violationsGetStats(input?: FeTypes.ViolationsGetStatsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ViolationsGetStatsResponse> {
      return runEndpoint<FeTypes.ViolationsGetStatsRequest, FeTypes.ViolationsGetStatsResponse>(
        executor,
        {
          method: 'GET',
          path: '/violations/stats/overview',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/health-metrics */
    healthMetricsFindAll(input: FeTypes.HealthMetricsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsFindAllResponse> {
      return runEndpoint<FeTypes.HealthMetricsFindAllRequest, FeTypes.HealthMetricsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/health-metrics',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/health-metrics */
    healthMetricsCreate(input: FeTypes.HealthMetricsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsCreateResponse> {
      return runEndpoint<FeTypes.HealthMetricsCreateRequest, FeTypes.HealthMetricsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/health-metrics',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/health-metrics/statistics/{type} */
    healthMetricsGetStatistics(input: FeTypes.HealthMetricsGetStatisticsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsGetStatisticsResponse> {
      return runEndpoint<FeTypes.HealthMetricsGetStatisticsRequest, FeTypes.HealthMetricsGetStatisticsResponse>(
        executor,
        {
          method: 'GET',
          path: '/health-metrics/statistics/{type}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/health-metrics/alerts */
    healthMetricsGetAlerts(input?: FeTypes.HealthMetricsGetAlertsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsGetAlertsResponse> {
      return runEndpoint<FeTypes.HealthMetricsGetAlertsRequest, FeTypes.HealthMetricsGetAlertsResponse>(
        executor,
        {
          method: 'GET',
          path: '/health-metrics/alerts',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/health-metrics/{id} */
    healthMetricsFindOne(input: FeTypes.HealthMetricsFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsFindOneResponse> {
      return runEndpoint<FeTypes.HealthMetricsFindOneRequest, FeTypes.HealthMetricsFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/health-metrics/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/health-metrics/{id}/corrections */
    healthMetricsCorrect(input: FeTypes.HealthMetricsCorrectRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsCorrectResponse> {
      return runEndpoint<FeTypes.HealthMetricsCorrectRequest, FeTypes.HealthMetricsCorrectResponse>(
        executor,
        {
          method: 'POST',
          path: '/health-metrics/{id}/corrections',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/health-metrics/{id}/review */
    healthMetricsMarkAsReviewed(input: FeTypes.HealthMetricsMarkAsReviewedRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsMarkAsReviewedResponse> {
      return runEndpoint<FeTypes.HealthMetricsMarkAsReviewedRequest, FeTypes.HealthMetricsMarkAsReviewedResponse>(
        executor,
        {
          method: 'POST',
          path: '/health-metrics/{id}/review',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/health-metrics/{id}/void */
    healthMetricsVoid(input: FeTypes.HealthMetricsVoidRequest, options?: RequestRuntimeOptions): Promise<FeTypes.HealthMetricsVoidResponse> {
      return runEndpoint<FeTypes.HealthMetricsVoidRequest, FeTypes.HealthMetricsVoidResponse>(
        executor,
        {
          method: 'POST',
          path: '/health-metrics/{id}/void',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/scheduled */
    consultationsCreateScheduled(input: WithFlexibleHeaders<FeTypes.ConsultationsCreateScheduledRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsCreateScheduledResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.ConsultationsCreateScheduledRequest>, FeTypes.ConsultationsCreateScheduledResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/scheduled',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/consultations */
    consultationsFindAll(input: FeTypes.ConsultationsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsFindAllResponse> {
      return runEndpoint<FeTypes.ConsultationsFindAllRequest, FeTypes.ConsultationsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/consultations',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations */
    consultationsCreate(input: FeTypes.ConsultationsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsCreateResponse> {
      return runEndpoint<FeTypes.ConsultationsCreateRequest, FeTypes.ConsultationsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/consultations/upcoming */
    consultationsUpcoming(input?: FeTypes.ConsultationsUpcomingRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsUpcomingResponse> {
      return runEndpoint<FeTypes.ConsultationsUpcomingRequest, FeTypes.ConsultationsUpcomingResponse>(
        executor,
        {
          method: 'GET',
          path: '/consultations/upcoming',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/check-in */
    consultationsCheckIn(input: WithFlexibleHeaders<FeTypes.ConsultationsCheckInRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsCheckInResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.ConsultationsCheckInRequest>, FeTypes.ConsultationsCheckInResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/check-in',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/consultations/{id}/queue */
    consultationsGetQueue(input: FeTypes.ConsultationsGetQueueRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsGetQueueResponse> {
      return runEndpoint<FeTypes.ConsultationsGetQueueRequest, FeTypes.ConsultationsGetQueueResponse>(
        executor,
        {
          method: 'GET',
          path: '/consultations/{id}/queue',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/consultations/{id} */
    consultationsFindOne(input: FeTypes.ConsultationsFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsFindOneResponse> {
      return runEndpoint<FeTypes.ConsultationsFindOneRequest, FeTypes.ConsultationsFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/consultations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/consultations/{id} */
    consultationsUpdate(input: FeTypes.ConsultationsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsUpdateResponse> {
      return runEndpoint<FeTypes.ConsultationsUpdateRequest, FeTypes.ConsultationsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/consultations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/accept */
    consultationsAccept(input: FeTypes.ConsultationsAcceptRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsAcceptResponse> {
      return runEndpoint<FeTypes.ConsultationsAcceptRequest, FeTypes.ConsultationsAcceptResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/accept',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/decline */
    consultationsDecline(input: FeTypes.ConsultationsDeclineRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsDeclineResponse> {
      return runEndpoint<FeTypes.ConsultationsDeclineRequest, FeTypes.ConsultationsDeclineResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/decline',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/start */
    consultationsStart(input: FeTypes.ConsultationsStartRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsStartResponse> {
      return runEndpoint<FeTypes.ConsultationsStartRequest, FeTypes.ConsultationsStartResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/start',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/waiting-room-presence */
    consultationsRecordWaitingRoomPresence(input: FeTypes.ConsultationsRecordWaitingRoomPresenceRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsRecordWaitingRoomPresenceResponse> {
      return runEndpoint<FeTypes.ConsultationsRecordWaitingRoomPresenceRequest, FeTypes.ConsultationsRecordWaitingRoomPresenceResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/waiting-room-presence',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/complete */
    consultationsComplete(input: FeTypes.ConsultationsCompleteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsCompleteResponse> {
      return runEndpoint<FeTypes.ConsultationsCompleteRequest, FeTypes.ConsultationsCompleteResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/complete',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/no-show */
    consultationsMarkNoShow(input: FeTypes.ConsultationsMarkNoShowRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsMarkNoShowResponse> {
      return runEndpoint<FeTypes.ConsultationsMarkNoShowRequest, FeTypes.ConsultationsMarkNoShowResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/no-show',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/cancel */
    consultationsCancel(input: FeTypes.ConsultationsCancelRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsCancelResponse> {
      return runEndpoint<FeTypes.ConsultationsCancelRequest, FeTypes.ConsultationsCancelResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/cancel',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/consultations/{id}/reschedule */
    consultationsReschedule(input: WithFlexibleHeaders<FeTypes.ConsultationsRescheduleRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.ConsultationsRescheduleResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.ConsultationsRescheduleRequest>, FeTypes.ConsultationsRescheduleResponse>(
        executor,
        {
          method: 'POST',
          path: '/consultations/{id}/reschedule',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/availability-slots */
    availabilitySlotsListMine(input: FeTypes.AvailabilitySlotsListMineRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsListMineResponse> {
      return runEndpoint<FeTypes.AvailabilitySlotsListMineRequest, FeTypes.AvailabilitySlotsListMineResponse>(
        executor,
        {
          method: 'GET',
          path: '/availability-slots',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/availability-slots */
    availabilitySlotsCreate(input: WithFlexibleHeaders<FeTypes.AvailabilitySlotsCreateRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsCreateResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.AvailabilitySlotsCreateRequest>, FeTypes.AvailabilitySlotsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/availability-slots',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/availability-slots/doctors/{doctorId} */
    availabilitySlotsListAvailable(input: FeTypes.AvailabilitySlotsListAvailableRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsListAvailableResponse> {
      return runEndpoint<FeTypes.AvailabilitySlotsListAvailableRequest, FeTypes.AvailabilitySlotsListAvailableResponse>(
        executor,
        {
          method: 'GET',
          path: '/availability-slots/doctors/{doctorId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/availability-slots/{id} */
    availabilitySlotsUpdate(input: FeTypes.AvailabilitySlotsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsUpdateResponse> {
      return runEndpoint<FeTypes.AvailabilitySlotsUpdateRequest, FeTypes.AvailabilitySlotsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/availability-slots/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/availability-slots/{id} */
    availabilitySlotsRemove(input: FeTypes.AvailabilitySlotsRemoveRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsRemoveResponse> {
      return runEndpoint<FeTypes.AvailabilitySlotsRemoveRequest, FeTypes.AvailabilitySlotsRemoveResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/availability-slots/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/availability-slots/{id}/block */
    availabilitySlotsBlock(input: FeTypes.AvailabilitySlotsBlockRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AvailabilitySlotsBlockResponse> {
      return runEndpoint<FeTypes.AvailabilitySlotsBlockRequest, FeTypes.AvailabilitySlotsBlockResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/availability-slots/{id}/block',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/doctors/me/queue */
    doctorQueueList(input: FeTypes.DoctorQueueListRequest, options?: RequestRuntimeOptions): Promise<FeTypes.DoctorQueueListResponse> {
      return runEndpoint<FeTypes.DoctorQueueListRequest, FeTypes.DoctorQueueListResponse>(
        executor,
        {
          method: 'GET',
          path: '/doctors/me/queue',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/doctors/me/queue/call-next */
    doctorQueueCallNext(input?: WithFlexibleHeaders<FeTypes.DoctorQueueCallNextRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.DoctorQueueCallNextResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.DoctorQueueCallNextRequest>, FeTypes.DoctorQueueCallNextResponse>(
        executor,
        {
          method: 'POST',
          path: '/doctors/me/queue/call-next',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/chat/consultation/messages */
    chatSendMessage(input: WithNativeMultipart<FeTypes.ChatSendMessageRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.ChatSendMessageResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.ChatSendMessageRequest> | FormData, FeTypes.ChatSendMessageResponse>(
        executor,
        {
          method: 'POST',
          path: '/chat/consultation/messages',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/chat/consultation/{consultationId} */
    chatGetConsultationMessages(input: FeTypes.ChatGetConsultationMessagesRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ChatGetConsultationMessagesResponse> {
      return runEndpoint<FeTypes.ChatGetConsultationMessagesRequest, FeTypes.ChatGetConsultationMessagesResponse>(
        executor,
        {
          method: 'GET',
          path: '/chat/consultation/{consultationId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/chat */
    chatFindAll(input: FeTypes.ChatFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ChatFindAllResponse> {
      return runEndpoint<FeTypes.ChatFindAllRequest, FeTypes.ChatFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/chat',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/chat/{id} */
    chatFindOne(input: FeTypes.ChatFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ChatFindOneResponse> {
      return runEndpoint<FeTypes.ChatFindOneRequest, FeTypes.ChatFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/chat/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/chat/{id} */
    chatUpdateMessage(input: FeTypes.ChatUpdateMessageRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ChatUpdateMessageResponse> {
      return runEndpoint<FeTypes.ChatUpdateMessageRequest, FeTypes.ChatUpdateMessageResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/chat/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/chat/{id} */
    chatRemoveMessage(input: FeTypes.ChatRemoveMessageRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ChatRemoveMessageResponse> {
      return runEndpoint<FeTypes.ChatRemoveMessageRequest, FeTypes.ChatRemoveMessageResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/chat/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews */
    reviewsFindAll(input: FeTypes.ReviewsFindAllRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsFindAllResponse> {
      return runEndpoint<FeTypes.ReviewsFindAllRequest, FeTypes.ReviewsFindAllResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/reviews */
    reviewsCreate(input: FeTypes.ReviewsCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsCreateResponse> {
      return runEndpoint<FeTypes.ReviewsCreateRequest, FeTypes.ReviewsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/reviews',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews/doctor/{doctorId}/rating */
    reviewsGetDoctorRating(input: FeTypes.ReviewsGetDoctorRatingRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsGetDoctorRatingResponse> {
      return runEndpoint<FeTypes.ReviewsGetDoctorRatingRequest, FeTypes.ReviewsGetDoctorRatingResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews/doctor/{doctorId}/rating',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews/doctor/{doctorId} */
    reviewsFindByDoctor(input: FeTypes.ReviewsFindByDoctorRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsFindByDoctorResponse> {
      return runEndpoint<FeTypes.ReviewsFindByDoctorRequest, FeTypes.ReviewsFindByDoctorResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews/doctor/{doctorId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews/top/doctors */
    reviewsGetTopDoctors(input: FeTypes.ReviewsGetTopDoctorsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsGetTopDoctorsResponse> {
      return runEndpoint<FeTypes.ReviewsGetTopDoctorsRequest, FeTypes.ReviewsGetTopDoctorsResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews/top/doctors',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews/{id} */
    reviewsFindOne(input: FeTypes.ReviewsFindOneRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsFindOneResponse> {
      return runEndpoint<FeTypes.ReviewsFindOneRequest, FeTypes.ReviewsFindOneResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/reviews/{id} */
    reviewsUpdate(input: FeTypes.ReviewsUpdateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsUpdateResponse> {
      return runEndpoint<FeTypes.ReviewsUpdateRequest, FeTypes.ReviewsUpdateResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/reviews/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/reviews/{id} */
    reviewsRemove(input: FeTypes.ReviewsRemoveRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsRemoveResponse> {
      return runEndpoint<FeTypes.ReviewsRemoveRequest, FeTypes.ReviewsRemoveResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/reviews/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/reviews/consultation/{id} */
    reviewsFindByConsultationId(input: FeTypes.ReviewsFindByConsultationIdRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsFindByConsultationIdResponse> {
      return runEndpoint<FeTypes.ReviewsFindByConsultationIdRequest, FeTypes.ReviewsFindByConsultationIdResponse>(
        executor,
        {
          method: 'GET',
          path: '/reviews/consultation/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/reviews/{id}/helpful */
    reviewsMarkHelpful(input: FeTypes.ReviewsMarkHelpfulRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsMarkHelpfulResponse> {
      return runEndpoint<FeTypes.ReviewsMarkHelpfulRequest, FeTypes.ReviewsMarkHelpfulResponse>(
        executor,
        {
          method: 'POST',
          path: '/reviews/{id}/helpful',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/reviews/{id}/helpful */
    reviewsUnmarkHelpful(input: FeTypes.ReviewsUnmarkHelpfulRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsUnmarkHelpfulResponse> {
      return runEndpoint<FeTypes.ReviewsUnmarkHelpfulRequest, FeTypes.ReviewsUnmarkHelpfulResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/reviews/{id}/helpful',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/reviews/{id}/flag */
    reviewsFlagReview(input: FeTypes.ReviewsFlagReviewRequest, options?: RequestRuntimeOptions): Promise<FeTypes.ReviewsFlagReviewResponse> {
      return runEndpoint<FeTypes.ReviewsFlagReviewRequest, FeTypes.ReviewsFlagReviewResponse>(
        executor,
        {
          method: 'POST',
          path: '/reviews/{id}/flag',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/plans */
    plansList(input?: FeTypes.PlansListRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PlansListResponse> {
      return runEndpoint<FeTypes.PlansListRequest, FeTypes.PlansListResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/plans',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/plans/drafts */
    plansCreate(input?: FeTypes.PlansCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PlansCreateResponse> {
      return runEndpoint<FeTypes.PlansCreateRequest, FeTypes.PlansCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/plans/drafts',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/plans/deploy-defaults */
    plansDeployDefaults(input?: FeTypes.PlansDeployDefaultsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PlansDeployDefaultsResponse> {
      return runEndpoint<FeTypes.PlansDeployDefaultsRequest, FeTypes.PlansDeployDefaultsResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/plans/deploy-defaults',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/plans/{id}/publish */
    plansPublish(input: FeTypes.PlansPublishRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PlansPublishResponse> {
      return runEndpoint<FeTypes.PlansPublishRequest, FeTypes.PlansPublishResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/plans/{id}/publish',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/plans/{id}/retire */
    plansRetire(input: FeTypes.PlansRetireRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PlansRetireResponse> {
      return runEndpoint<FeTypes.PlansRetireRequest, FeTypes.PlansRetireResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/plans/{id}/retire',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/payments/orders */
    paymentsList(input: FeTypes.PaymentsListRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsListResponse> {
      return runEndpoint<FeTypes.PaymentsListRequest, FeTypes.PaymentsListResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/payments/orders',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/payments/orders */
    paymentsCreate(input: WithFlexibleHeaders<FeTypes.PaymentsCreateRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsCreateResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.PaymentsCreateRequest>, FeTypes.PaymentsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/payments/orders',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/billing/payments/orders/{id}/cancel */
    paymentsCancel(input: FeTypes.PaymentsCancelRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsCancelResponse> {
      return runEndpoint<FeTypes.PaymentsCancelRequest, FeTypes.PaymentsCancelResponse>(
        executor,
        {
          method: 'POST',
          path: '/billing/payments/orders/{id}/cancel',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/payments/orders/{id} */
    paymentsGet(input: FeTypes.PaymentsGetRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsGetResponse> {
      return runEndpoint<FeTypes.PaymentsGetRequest, FeTypes.PaymentsGetResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/payments/orders/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/payments/orders/{id}/evidence */
    paymentsGetEvidence(input: FeTypes.PaymentsGetEvidenceRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsGetEvidenceResponse> {
      return runEndpoint<FeTypes.PaymentsGetEvidenceRequest, FeTypes.PaymentsGetEvidenceResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/payments/orders/{id}/evidence',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/payments/vnpay/return */
    paymentsReturnFromVnpay(input?: FeTypes.PaymentsReturnFromVnpayRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsReturnFromVnpayResponse> {
      return runEndpoint<FeTypes.PaymentsReturnFromVnpayRequest, FeTypes.PaymentsReturnFromVnpayResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/payments/vnpay/return',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/billing/payments/vnpay/ipn */
    paymentsIpn(input?: FeTypes.PaymentsIpnRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PaymentsIpnResponse> {
      return runEndpoint<FeTypes.PaymentsIpnRequest, FeTypes.PaymentsIpnResponse>(
        executor,
        {
          method: 'GET',
          path: '/billing/payments/vnpay/ipn',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/plans */
    patientBillingReadListPlans(input: FeTypes.PatientBillingReadListPlansRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientBillingReadListPlansResponse> {
      return runEndpoint<FeTypes.PatientBillingReadListPlansRequest, FeTypes.PatientBillingReadListPlansResponse>(
        executor,
        {
          method: 'GET',
          path: '/plans',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/plans/{id} */
    patientBillingReadGetPlan(input: FeTypes.PatientBillingReadGetPlanRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientBillingReadGetPlanResponse> {
      return runEndpoint<FeTypes.PatientBillingReadGetPlanRequest, FeTypes.PatientBillingReadGetPlanResponse>(
        executor,
        {
          method: 'GET',
          path: '/plans/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/subscriptions/me */
    patientBillingReadSubscriptions(input: FeTypes.PatientBillingReadSubscriptionsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientBillingReadSubscriptionsResponse> {
      return runEndpoint<FeTypes.PatientBillingReadSubscriptionsRequest, FeTypes.PatientBillingReadSubscriptionsResponse>(
        executor,
        {
          method: 'GET',
          path: '/subscriptions/me',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/subscriptions/me/usage */
    patientBillingReadUsage(input?: FeTypes.PatientBillingReadUsageRequest, options?: RequestRuntimeOptions): Promise<FeTypes.PatientBillingReadUsageResponse> {
      return runEndpoint<FeTypes.PatientBillingReadUsageRequest, FeTypes.PatientBillingReadUsageResponse>(
        executor,
        {
          method: 'GET',
          path: '/subscriptions/me/usage',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admin/doctors/applications */
    adminGetDoctorApplication(input: FeTypes.AdminGetDoctorApplicationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminGetDoctorApplicationResponse> {
      return runEndpoint<FeTypes.AdminGetDoctorApplicationRequest, FeTypes.AdminGetDoctorApplicationResponse>(
        executor,
        {
          method: 'GET',
          path: '/admin/doctors/applications',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/admin/doctors/{id}/verify */
    adminVerifyDoctor(input: FeTypes.AdminVerifyDoctorRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminVerifyDoctorResponse> {
      return runEndpoint<FeTypes.AdminVerifyDoctorRequest, FeTypes.AdminVerifyDoctorResponse>(
        executor,
        {
          method: 'POST',
          path: '/admin/doctors/{id}/verify',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/admin/doctors/{id}/reject */
    adminRejectDoctor(input: FeTypes.AdminRejectDoctorRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminRejectDoctorResponse> {
      return runEndpoint<FeTypes.AdminRejectDoctorRequest, FeTypes.AdminRejectDoctorResponse>(
        executor,
        {
          method: 'POST',
          path: '/admin/doctors/{id}/reject',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/admin/users/{id}/lock */
    adminLockAccount(input: FeTypes.AdminLockAccountRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminLockAccountResponse> {
      return runEndpoint<FeTypes.AdminLockAccountRequest, FeTypes.AdminLockAccountResponse>(
        executor,
        {
          method: 'POST',
          path: '/admin/users/{id}/lock',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/admin/users/{id}/unlock */
    adminUnlockAccount(input: FeTypes.AdminUnlockAccountRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminUnlockAccountResponse> {
      return runEndpoint<FeTypes.AdminUnlockAccountRequest, FeTypes.AdminUnlockAccountResponse>(
        executor,
        {
          method: 'POST',
          path: '/admin/users/{id}/unlock',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admin/consultations */
    adminGetAllConsultations(input: FeTypes.AdminGetAllConsultationsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminGetAllConsultationsResponse> {
      return runEndpoint<FeTypes.AdminGetAllConsultationsRequest, FeTypes.AdminGetAllConsultationsResponse>(
        executor,
        {
          method: 'GET',
          path: '/admin/consultations',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admin/consultations/{id} */
    adminGetConsultationById(input: FeTypes.AdminGetConsultationByIdRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminGetConsultationByIdResponse> {
      return runEndpoint<FeTypes.AdminGetConsultationByIdRequest, FeTypes.AdminGetConsultationByIdResponse>(
        executor,
        {
          method: 'GET',
          path: '/admin/consultations/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admin/dashboard/stats */
    adminGetDashboardStats(input?: FeTypes.AdminGetDashboardStatsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AdminGetDashboardStatsResponse> {
      return runEndpoint<FeTypes.AdminGetDashboardStatsRequest, FeTypes.AdminGetDashboardStatsResponse>(
        executor,
        {
          method: 'GET',
          path: '/admin/dashboard/stats',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/users/{id}/profile */
    usersFindProfile(input: FeTypes.UsersFindProfileRequest, options?: RequestRuntimeOptions): Promise<FeTypes.UsersFindProfileResponse> {
      return runEndpoint<FeTypes.UsersFindProfileRequest, FeTypes.UsersFindProfileResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/{id}/profile',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/start */
    aiAssistantStartConversation(input: FeTypes.AiAssistantStartConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantStartConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantStartConversationRequest, FeTypes.AiAssistantStartConversationResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/start',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/{conversationId}/message */
    aiAssistantSendMessage(input: WithNativeMultipart<WithFlexibleHeaders<FeTypes.AiAssistantSendMessageRequest>> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantSendMessageResponse> {
      return runEndpoint<WithNativeMultipart<WithFlexibleHeaders<FeTypes.AiAssistantSendMessageRequest>> | FormData, FeTypes.AiAssistantSendMessageResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/{conversationId}/message',
          isWrapper: true,
          isMultipart: true,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-assistant/conversations */
    aiAssistantGetConversations(input: FeTypes.AiAssistantGetConversationsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantGetConversationsResponse> {
      return runEndpoint<FeTypes.AiAssistantGetConversationsRequest, FeTypes.AiAssistantGetConversationsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-assistant/conversations',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-assistant/conversations/{conversationId} */
    aiAssistantGetConversation(input: FeTypes.AiAssistantGetConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantGetConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantGetConversationRequest, FeTypes.AiAssistantGetConversationResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-assistant/conversations/{conversationId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-assistant/conversations/{conversationId} */
    aiAssistantUpdateConversation(input: FeTypes.AiAssistantUpdateConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantUpdateConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantUpdateConversationRequest, FeTypes.AiAssistantUpdateConversationResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-assistant/conversations/{conversationId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/ai-assistant/conversations/{conversationId} */
    aiAssistantDeleteConversation(input: FeTypes.AiAssistantDeleteConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantDeleteConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantDeleteConversationRequest, FeTypes.AiAssistantDeleteConversationResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/ai-assistant/conversations/{conversationId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/{conversationId}/favorite */
    aiAssistantToggleFavorite(input: FeTypes.AiAssistantToggleFavoriteRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantToggleFavoriteResponse> {
      return runEndpoint<FeTypes.AiAssistantToggleFavoriteRequest, FeTypes.AiAssistantToggleFavoriteResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/{conversationId}/favorite',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/{conversationId}/archive */
    aiAssistantArchiveConversation(input: FeTypes.AiAssistantArchiveConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantArchiveConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantArchiveConversationRequest, FeTypes.AiAssistantArchiveConversationResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/{conversationId}/archive',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/{conversationId}/rate */
    aiAssistantRateConversation(input: FeTypes.AiAssistantRateConversationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantRateConversationResponse> {
      return runEndpoint<FeTypes.AiAssistantRateConversationRequest, FeTypes.AiAssistantRateConversationResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/{conversationId}/rate',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-assistant/conversations/{conversationId}/stats */
    aiAssistantGetConversationStats(input: FeTypes.AiAssistantGetConversationStatsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantGetConversationStatsResponse> {
      return runEndpoint<FeTypes.AiAssistantGetConversationStatsRequest, FeTypes.AiAssistantGetConversationStatsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-assistant/conversations/{conversationId}/stats',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-assistant/summary */
    aiAssistantGetUserConversationSummary(input?: FeTypes.AiAssistantGetUserConversationSummaryRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantGetUserConversationSummaryResponse> {
      return runEndpoint<FeTypes.AiAssistantGetUserConversationSummaryRequest, FeTypes.AiAssistantGetUserConversationSummaryResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-assistant/summary',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-assistant/search */
    aiAssistantSearchConversations(input: FeTypes.AiAssistantSearchConversationsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantSearchConversationsResponse> {
      return runEndpoint<FeTypes.AiAssistantSearchConversationsRequest, FeTypes.AiAssistantSearchConversationsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-assistant/search',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-assistant/conversations/summary */
    aiAssistantGetHealthProfileSummary(input?: FeTypes.AiAssistantGetHealthProfileSummaryRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiAssistantGetHealthProfileSummaryResponse> {
      return runEndpoint<FeTypes.AiAssistantGetHealthProfileSummaryRequest, FeTypes.AiAssistantGetHealthProfileSummaryResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-assistant/conversations/summary',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-feedbacks */
    aiFeedbacksGetAllFeedbacks(input: FeTypes.AiFeedbacksGetAllFeedbacksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksGetAllFeedbacksResponse> {
      return runEndpoint<FeTypes.AiFeedbacksGetAllFeedbacksRequest, FeTypes.AiFeedbacksGetAllFeedbacksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-feedbacks',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-feedbacks */
    aiFeedbacksCreate(input: FeTypes.AiFeedbacksCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksCreateResponse> {
      return runEndpoint<FeTypes.AiFeedbacksCreateRequest, FeTypes.AiFeedbacksCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-feedbacks',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-feedbacks/my-feedbacks */
    aiFeedbacksGetMyFeedbacks(input: FeTypes.AiFeedbacksGetMyFeedbacksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksGetMyFeedbacksResponse> {
      return runEndpoint<FeTypes.AiFeedbacksGetMyFeedbacksRequest, FeTypes.AiFeedbacksGetMyFeedbacksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-feedbacks/my-feedbacks',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-feedbacks/conversation/{conversationId} */
    aiFeedbacksGetConversationFeedbacks(input: FeTypes.AiFeedbacksGetConversationFeedbacksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksGetConversationFeedbacksResponse> {
      return runEndpoint<FeTypes.AiFeedbacksGetConversationFeedbacksRequest, FeTypes.AiFeedbacksGetConversationFeedbacksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-feedbacks/conversation/{conversationId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-feedbacks/conversation/{conversationId}/stats */
    aiFeedbacksGetConversationStats(input: FeTypes.AiFeedbacksGetConversationStatsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksGetConversationStatsResponse> {
      return runEndpoint<FeTypes.AiFeedbacksGetConversationStatsRequest, FeTypes.AiFeedbacksGetConversationStatsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-feedbacks/conversation/{conversationId}/stats',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-feedbacks/{id} */
    aiFeedbacksGetFeedback(input: FeTypes.AiFeedbacksGetFeedbackRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksGetFeedbackResponse> {
      return runEndpoint<FeTypes.AiFeedbacksGetFeedbackRequest, FeTypes.AiFeedbacksGetFeedbackResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-feedbacks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-feedbacks/{id} */
    aiFeedbacksUpdateFeedback(input: FeTypes.AiFeedbacksUpdateFeedbackRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksUpdateFeedbackResponse> {
      return runEndpoint<FeTypes.AiFeedbacksUpdateFeedbackRequest, FeTypes.AiFeedbacksUpdateFeedbackResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-feedbacks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/ai-feedbacks/{id} */
    aiFeedbacksDeleteFeedback(input: FeTypes.AiFeedbacksDeleteFeedbackRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksDeleteFeedbackResponse> {
      return runEndpoint<FeTypes.AiFeedbacksDeleteFeedbackRequest, FeTypes.AiFeedbacksDeleteFeedbackResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/ai-feedbacks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-feedbacks/{id}/helpful */
    aiFeedbacksMarkHelpful(input: FeTypes.AiFeedbacksMarkHelpfulRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksMarkHelpfulResponse> {
      return runEndpoint<FeTypes.AiFeedbacksMarkHelpfulRequest, FeTypes.AiFeedbacksMarkHelpfulResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-feedbacks/{id}/helpful',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-feedbacks/{id}/verify */
    aiFeedbacksVerifyFeedback(input: FeTypes.AiFeedbacksVerifyFeedbackRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiFeedbacksVerifyFeedbackResponse> {
      return runEndpoint<FeTypes.AiFeedbacksVerifyFeedbackRequest, FeTypes.AiFeedbacksVerifyFeedbackResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-feedbacks/{id}/verify',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-documents */
    aiDocumentsGetAllDocuments(input: FeTypes.AiDocumentsGetAllDocumentsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsGetAllDocumentsResponse> {
      return runEndpoint<FeTypes.AiDocumentsGetAllDocumentsRequest, FeTypes.AiDocumentsGetAllDocumentsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-documents',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents */
    aiDocumentsCreate(input: WithNativeMultipart<FeTypes.AiDocumentsCreateRequest> | FormData, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsCreateResponse> {
      return runEndpoint<WithNativeMultipart<FeTypes.AiDocumentsCreateRequest> | FormData, FeTypes.AiDocumentsCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-documents',
          isWrapper: false,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-documents/search/{query} */
    aiDocumentsSearchDocuments(input: FeTypes.AiDocumentsSearchDocumentsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsSearchDocumentsResponse> {
      return runEndpoint<FeTypes.AiDocumentsSearchDocumentsRequest, FeTypes.AiDocumentsSearchDocumentsResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-documents/search/{query}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-documents/{id} */
    aiDocumentsGetDocument(input: FeTypes.AiDocumentsGetDocumentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsGetDocumentResponse> {
      return runEndpoint<FeTypes.AiDocumentsGetDocumentRequest, FeTypes.AiDocumentsGetDocumentResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-documents/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-documents/{id} */
    aiDocumentsUpdateDocument(input: FeTypes.AiDocumentsUpdateDocumentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsUpdateDocumentResponse> {
      return runEndpoint<FeTypes.AiDocumentsUpdateDocumentRequest, FeTypes.AiDocumentsUpdateDocumentResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-documents/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/ai-documents/{id} */
    aiDocumentsDeleteDocument(input: FeTypes.AiDocumentsDeleteDocumentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsDeleteDocumentResponse> {
      return runEndpoint<FeTypes.AiDocumentsDeleteDocumentRequest, FeTypes.AiDocumentsDeleteDocumentResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/ai-documents/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-documents/{id}/index */
    aiDocumentsIndexDocument(input: FeTypes.AiDocumentsIndexDocumentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsIndexDocumentResponse> {
      return runEndpoint<FeTypes.AiDocumentsIndexDocumentRequest, FeTypes.AiDocumentsIndexDocumentResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-documents/{id}/index',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-documents/{id}/usage */
    aiDocumentsIncrementUsage(input: FeTypes.AiDocumentsIncrementUsageRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsIncrementUsageResponse> {
      return runEndpoint<FeTypes.AiDocumentsIncrementUsageRequest, FeTypes.AiDocumentsIncrementUsageResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-documents/{id}/usage',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-documents/{id}/archive */
    aiDocumentsArchiveDocument(input: FeTypes.AiDocumentsArchiveDocumentRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentsArchiveDocumentResponse> {
      return runEndpoint<FeTypes.AiDocumentsArchiveDocumentRequest, FeTypes.AiDocumentsArchiveDocumentResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-documents/{id}/archive',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents/{id}/approve */
    aiDocumentsApprove(
      input: { params: { id: string } },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeDocument> {
      return runEndpoint<{ params: { id: string } }, FeTypes.KnowledgeDocument>(
        executor,
        {
          method: 'POST',
          path: '/ai-documents/{id}/approve',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents/{id}/reject */
    aiDocumentsReject(
      input: { params: { id: string }; body: FeTypes.KnowledgeDocumentRejectRequest },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeDocument> {
      return runEndpoint<
        { params: { id: string }; body: FeTypes.KnowledgeDocumentRejectRequest },
        FeTypes.KnowledgeDocument
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-documents/{id}/reject',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents/{id}/activate */
    aiDocumentsActivate(
      input: { params: { id: string } },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeDocument> {
      return runEndpoint<{ params: { id: string } }, FeTypes.KnowledgeDocument>(
        executor,
        {
          method: 'POST',
          path: '/ai-documents/{id}/activate',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents/{id}/replacements */
    aiDocumentsReplaceVersion(
      input: {
        params: { id: string };
        body: FormData | WithNativeMultipart<FeTypes.KnowledgeDocumentReplacementRequest>;
      },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeDocument> {
      return runEndpoint<
        {
          params: { id: string };
          body: FormData | WithNativeMultipart<FeTypes.KnowledgeDocumentReplacementRequest>;
        },
        FeTypes.KnowledgeDocument
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-documents/{id}/replacements',
          isWrapper: true,
          isMultipart: true,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-knowledge-candidates */
    aiKnowledgeCandidatesList(
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeCandidate[]> {
      return runEndpoint<undefined, FeTypes.KnowledgeCandidate[]>(
        executor,
        {
          method: 'GET',
          path: '/ai-knowledge-candidates',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        undefined,
        options,
      );
    },
    /** POST /api/v1/ai-knowledge-candidates */
    aiKnowledgeCandidatesPropose(
      input: FeTypes.ProposeKnowledgeCandidateRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeCandidate> {
      return runEndpoint<
        FeTypes.ProposeKnowledgeCandidateRequest,
        FeTypes.KnowledgeCandidate
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-knowledge-candidates',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-knowledge-candidates/{id}/promote */
    aiKnowledgeCandidatesPromote(
      input: { params: { id: string } },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.PromoteKnowledgeCandidateResponse> {
      return runEndpoint<
        { params: { id: string } },
        FeTypes.PromoteKnowledgeCandidateResponse
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-knowledge-candidates/{id}/promote',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-knowledge-candidates/{id}/reject */
    aiKnowledgeCandidatesReject(
      input: { params: { id: string }; body: FeTypes.RejectKnowledgeCandidateRequest },
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.KnowledgeCandidate> {
      return runEndpoint<
        { params: { id: string }; body: FeTypes.RejectKnowledgeCandidateRequest },
        FeTypes.KnowledgeCandidate
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-knowledge-candidates/{id}/reject',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-document-chunks */
    aiDocumentChunksGetAllChunks(input: FeTypes.AiDocumentChunksGetAllChunksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksGetAllChunksResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksGetAllChunksRequest, FeTypes.AiDocumentChunksGetAllChunksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-document-chunks',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-document-chunks */
    aiDocumentChunksCreate(input: FeTypes.AiDocumentChunksCreateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksCreateResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksCreateRequest, FeTypes.AiDocumentChunksCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-document-chunks',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-document-chunks/batch */
    aiDocumentChunksCreateMany(input: FeTypes.AiDocumentChunksCreateManyRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksCreateManyResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksCreateManyRequest, FeTypes.AiDocumentChunksCreateManyResponse>(
        executor,
        {
          method: 'POST',
          path: '/ai-document-chunks/batch',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-document-chunks/document/{documentId} */
    aiDocumentChunksGetDocumentChunks(input: FeTypes.AiDocumentChunksGetDocumentChunksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksGetDocumentChunksResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksGetDocumentChunksRequest, FeTypes.AiDocumentChunksGetDocumentChunksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-document-chunks/document/{documentId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/ai-document-chunks/document/{documentId} */
    aiDocumentChunksDeleteDocumentChunks(input: FeTypes.AiDocumentChunksDeleteDocumentChunksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksDeleteDocumentChunksResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksDeleteDocumentChunksRequest, FeTypes.AiDocumentChunksDeleteDocumentChunksResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/ai-document-chunks/document/{documentId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-document-chunks/search/{query} */
    aiDocumentChunksSearchChunks(input: FeTypes.AiDocumentChunksSearchChunksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksSearchChunksResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksSearchChunksRequest, FeTypes.AiDocumentChunksSearchChunksResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-document-chunks/search/{query}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/ai-document-chunks/{id} */
    aiDocumentChunksGetChunk(input: FeTypes.AiDocumentChunksGetChunkRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksGetChunkResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksGetChunkRequest, FeTypes.AiDocumentChunksGetChunkResponse>(
        executor,
        {
          method: 'GET',
          path: '/ai-document-chunks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-document-chunks/{id} */
    aiDocumentChunksUpdateChunk(input: FeTypes.AiDocumentChunksUpdateChunkRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksUpdateChunkResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksUpdateChunkRequest, FeTypes.AiDocumentChunksUpdateChunkResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-document-chunks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/ai-document-chunks/{id} */
    aiDocumentChunksDeleteChunk(input: FeTypes.AiDocumentChunksDeleteChunkRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksDeleteChunkResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksDeleteChunkRequest, FeTypes.AiDocumentChunksDeleteChunkResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/ai-document-chunks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/ai-document-chunks/{id}/usage */
    aiDocumentChunksIncrementUsage(input: FeTypes.AiDocumentChunksIncrementUsageRequest, options?: RequestRuntimeOptions): Promise<FeTypes.AiDocumentChunksIncrementUsageResponse> {
      return runEndpoint<FeTypes.AiDocumentChunksIncrementUsageRequest, FeTypes.AiDocumentChunksIncrementUsageResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/ai-document-chunks/{id}/usage',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-programs */
    careProgramRuleListPrograms(input: FeTypes.CareProgramRuleListProgramsRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleListProgramsResponse> {
      return runEndpoint<FeTypes.CareProgramRuleListProgramsRequest, FeTypes.CareProgramRuleListProgramsResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-programs',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs */
    careProgramRuleCreateProgram(input: WithFlexibleHeaders<FeTypes.CareProgramRuleCreateProgramRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleCreateProgramResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleCreateProgramRequest>, FeTypes.CareProgramRuleCreateProgramResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-programs/{id} */
    careProgramRuleGetProgram(input: FeTypes.CareProgramRuleGetProgramRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleGetProgramResponse> {
      return runEndpoint<FeTypes.CareProgramRuleGetProgramRequest, FeTypes.CareProgramRuleGetProgramResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-programs/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/care-programs/{id} */
    careProgramRuleUpdateProgram(input: WithFlexibleHeaders<FeTypes.CareProgramRuleUpdateProgramRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleUpdateProgramResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleUpdateProgramRequest>, FeTypes.CareProgramRuleUpdateProgramResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/care-programs/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-programs/{id}/rules */
    careProgramRuleGetRule(input: FeTypes.CareProgramRuleGetRuleRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleGetRuleResponse> {
      return runEndpoint<FeTypes.CareProgramRuleGetRuleRequest, FeTypes.CareProgramRuleGetRuleResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-programs/{id}/rules',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs/{id}/rules */
    careProgramRuleCreateRule(input: WithFlexibleHeaders<FeTypes.CareProgramRuleCreateRuleRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleCreateRuleResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleCreateRuleRequest>, FeTypes.CareProgramRuleCreateRuleResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs/{id}/rules',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs/{id}/publish */
    careProgramRulePublishProgram(input: WithFlexibleHeaders<FeTypes.CareProgramRulePublishProgramRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRulePublishProgramResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRulePublishProgramRequest>, FeTypes.CareProgramRulePublishProgramResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs/{id}/publish',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs/{id}/retire */
    careProgramRuleRetireProgram(input: WithFlexibleHeaders<FeTypes.CareProgramRuleRetireProgramRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleRetireProgramResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleRetireProgramRequest>, FeTypes.CareProgramRuleRetireProgramResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs/{id}/retire',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/care-programs/{id}/rules/{ruleId} */
    careProgramRuleUpdateRule(input: WithFlexibleHeaders<FeTypes.CareProgramRuleUpdateRuleRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleUpdateRuleResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleUpdateRuleRequest>, FeTypes.CareProgramRuleUpdateRuleResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/care-programs/{id}/rules/{ruleId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs/{id}/rules/{ruleId}/activate */
    careProgramRuleActivateRule(input: WithFlexibleHeaders<FeTypes.CareProgramRuleActivateRuleRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleActivateRuleResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleActivateRuleRequest>, FeTypes.CareProgramRuleActivateRuleResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs/{id}/rules/{ruleId}/activate',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-programs/{id}/rules/{ruleId}/retire */
    careProgramRuleRetireRule(input: WithFlexibleHeaders<FeTypes.CareProgramRuleRetireRuleRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareProgramRuleRetireRuleResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareProgramRuleRetireRuleRequest>, FeTypes.CareProgramRuleRetireRuleResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-programs/{id}/rules/{ruleId}/retire',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-enrollments */
    careEnrollmentList(input: FeTypes.CareEnrollmentListRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentListResponse> {
      return runEndpoint<FeTypes.CareEnrollmentListRequest, FeTypes.CareEnrollmentListResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-enrollments',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments */
    careEnrollmentCreate(input: WithFlexibleHeaders<FeTypes.CareEnrollmentCreateRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentCreateResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentCreateRequest>, FeTypes.CareEnrollmentCreateResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-enrollments/{id} */
    careEnrollmentDetail(input: FeTypes.CareEnrollmentDetailRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentDetailResponse> {
      return runEndpoint<FeTypes.CareEnrollmentDetailRequest, FeTypes.CareEnrollmentDetailResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-enrollments/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/consent */
    careEnrollmentConsent(input: WithFlexibleHeaders<FeTypes.CareEnrollmentConsentRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentConsentResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentConsentRequest>, FeTypes.CareEnrollmentConsentResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/consent',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/baseline */
    careEnrollmentBaseline(input: WithFlexibleHeaders<FeTypes.CareEnrollmentBaselineRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentBaselineResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentBaselineRequest>, FeTypes.CareEnrollmentBaselineResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/baseline',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/pause */
    careEnrollmentPause(input: WithFlexibleHeaders<FeTypes.CareEnrollmentPauseRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentPauseResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentPauseRequest>, FeTypes.CareEnrollmentPauseResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/pause',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/resume */
    careEnrollmentResume(input: WithFlexibleHeaders<FeTypes.CareEnrollmentResumeRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentResumeResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentResumeRequest>, FeTypes.CareEnrollmentResumeResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/resume',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/complete */
    careEnrollmentComplete(input: WithFlexibleHeaders<FeTypes.CareEnrollmentCompleteRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentCompleteResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentCompleteRequest>, FeTypes.CareEnrollmentCompleteResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/complete',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/cancel */
    careEnrollmentCancel(input: WithFlexibleHeaders<FeTypes.CareEnrollmentCancelRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentCancelResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentCancelRequest>, FeTypes.CareEnrollmentCancelResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/cancel',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/withdraw-consent */
    careEnrollmentWithdraw(input: WithFlexibleHeaders<FeTypes.CareEnrollmentWithdrawRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareEnrollmentWithdrawResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareEnrollmentWithdrawRequest>, FeTypes.CareEnrollmentWithdrawResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/withdraw-consent',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-tasks/schedule */
    careTaskSchedule(input?: FeTypes.CareTaskScheduleRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskScheduleResponse> {
      return runEndpoint<FeTypes.CareTaskScheduleRequest, FeTypes.CareTaskScheduleResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-tasks/schedule',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-enrollments/{id}/tasks */
    careTaskTasks(input: FeTypes.CareTaskTasksRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskTasksResponse> {
      return runEndpoint<FeTypes.CareTaskTasksRequest, FeTypes.CareTaskTasksResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-enrollments/{id}/tasks',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-enrollments/{id}/completion-rate */
    careTaskCompletionRate(input: FeTypes.CareTaskCompletionRateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskCompletionRateResponse> {
      return runEndpoint<FeTypes.CareTaskCompletionRateRequest, FeTypes.CareTaskCompletionRateResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-enrollments/{id}/completion-rate',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-tasks/{id} */
    careTaskDetail(input: FeTypes.CareTaskDetailRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskDetailResponse> {
      return runEndpoint<FeTypes.CareTaskDetailRequest, FeTypes.CareTaskDetailResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-tasks/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-tasks/{id}/responses */
    careTaskRespond(input: WithFlexibleHeaders<FeTypes.CareTaskRespondRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskRespondResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareTaskRespondRequest>, FeTypes.CareTaskRespondResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-tasks/{id}/responses',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-tasks/{id}/doctor-review */
    careTaskDoctorReview(input: WithFlexibleHeaders<FeTypes.CareTaskDoctorReviewRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskDoctorReviewResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareTaskDoctorReviewRequest>, FeTypes.CareTaskDoctorReviewResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-tasks/{id}/doctor-review',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-tasks/{id}/appointment-link */
    careTaskAppointmentLink(input: WithFlexibleHeaders<FeTypes.CareTaskAppointmentLinkRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareTaskAppointmentLinkResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareTaskAppointmentLinkRequest>, FeTypes.CareTaskAppointmentLinkResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-tasks/{id}/appointment-link',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-alerts */
    careAlertInbox(input: FeTypes.CareAlertInboxRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertInboxResponse> {
      return runEndpoint<FeTypes.CareAlertInboxRequest, FeTypes.CareAlertInboxResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-alerts',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-alerts/{id}/detail */
    careAlertDoctorDetail(input: FeTypes.CareAlertDoctorDetailRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertDoctorDetailResponse> {
      return runEndpoint<FeTypes.CareAlertDoctorDetailRequest, FeTypes.CareAlertDoctorDetailResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-alerts/{id}/detail',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-alerts/{id} */
    careAlertGet(input: FeTypes.CareAlertGetRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertGetResponse> {
      return runEndpoint<FeTypes.CareAlertGetRequest, FeTypes.CareAlertGetResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-alerts/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-alerts/{id}/audit */
    careAlertAudit(input: FeTypes.CareAlertAuditRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertAuditResponse> {
      return runEndpoint<FeTypes.CareAlertAuditRequest, FeTypes.CareAlertAuditResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-alerts/{id}/audit',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-alerts/{id}/acknowledge */
    careAlertAcknowledge(input: FeTypes.CareAlertAcknowledgeRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertAcknowledgeResponse> {
      return runEndpoint<FeTypes.CareAlertAcknowledgeRequest, FeTypes.CareAlertAcknowledgeResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-alerts/{id}/acknowledge',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-alerts/{id}/resolve */
    careAlertResolve(input: FeTypes.CareAlertResolveRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertResolveResponse> {
      return runEndpoint<FeTypes.CareAlertResolveRequest, FeTypes.CareAlertResolveResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-alerts/{id}/resolve',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-alerts/{id}/dismiss */
    careAlertDismiss(input: FeTypes.CareAlertDismissRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertDismissResponse> {
      return runEndpoint<FeTypes.CareAlertDismissRequest, FeTypes.CareAlertDismissResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-alerts/{id}/dismiss',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-alerts/{id}/consultations */
    careAlertCreateConsultation(input: FeTypes.CareAlertCreateConsultationRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareAlertCreateConsultationResponse> {
      return runEndpoint<FeTypes.CareAlertCreateConsultationRequest, FeTypes.CareAlertCreateConsultationResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-alerts/{id}/consultations',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-enrollments/{id}/reports */
    careReportList(input: FeTypes.CareReportListRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportListResponse> {
      return runEndpoint<FeTypes.CareReportListRequest, FeTypes.CareReportListResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-enrollments/{id}/reports',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-enrollments/{id}/reports */
    careReportGenerate(input: FeTypes.CareReportGenerateRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportGenerateResponse> {
      return runEndpoint<FeTypes.CareReportGenerateRequest, FeTypes.CareReportGenerateResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-enrollments/{id}/reports',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-reports/{id} */
    careReportGet(input: FeTypes.CareReportGetRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportGetResponse> {
      return runEndpoint<FeTypes.CareReportGetRequest, FeTypes.CareReportGetResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-reports/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-reports/{id}/summaries */
    careReportGenerateSummary(input: FeTypes.CareReportGenerateSummaryRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportGenerateSummaryResponse> {
      return runEndpoint<FeTypes.CareReportGenerateSummaryRequest, FeTypes.CareReportGenerateSummaryResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-reports/{id}/summaries',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/care-reports/{id}/exports */
    careReportCreateExport(input: WithFlexibleHeaders<FeTypes.CareReportCreateExportRequest>, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportCreateExportResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.CareReportCreateExportRequest>, FeTypes.CareReportCreateExportResponse>(
        executor,
        {
          method: 'POST',
          path: '/care-reports/{id}/exports',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/care-report-exports/{id} */
    careReportGetExport(input: FeTypes.CareReportGetExportRequest, options?: RequestRuntimeOptions): Promise<FeTypes.CareReportGetExportResponse> {
      return runEndpoint<FeTypes.CareReportGetExportRequest, FeTypes.CareReportGetExportResponse>(
        executor,
        {
          method: 'GET',
          path: '/care-report-exports/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/ai-documents/{id}/rag-ingesting (incomplete/pending backend endpoint) */
    aiDocumentsRagIngesting(
      input: AiDocumentsRagIngestingRequest,
      options?: RequestRuntimeOptions,
    ): Promise<AiDocumentsRagIngestingResponse> {
      return runEndpoint<
        AiDocumentsRagIngestingRequest,
        AiDocumentsRagIngestingResponse
      >(
        executor,
        {
          method: 'POST',
          path: '/ai-documents/{id}/rag-ingesting',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    // ==================== E1: DOCTOR BOOKING SETTINGS ====================
    /** GET /api/v1/doctor-booking-settings/me */
    doctorBookingSettingsGetMine(options?: RequestRuntimeOptions): Promise<FeTypes.DoctorBookingSettingsResponse> {
      return runEndpoint<undefined, FeTypes.DoctorBookingSettingsResponse>(
        executor,
        {
          method: 'GET',
          path: '/doctor-booking-settings/me',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        undefined,
        options,
      );
    },
    /** PATCH /api/v1/doctor-booking-settings/me */
    doctorBookingSettingsUpdateMine(
      input: FeTypes.UpdateDoctorBookingSettingsRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.DoctorBookingSettingsResponse> {
      return runEndpoint<FeTypes.UpdateDoctorBookingSettingsRequest, FeTypes.DoctorBookingSettingsResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/doctor-booking-settings/me',
          isWrapper: false,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/doctor-booking-settings/{doctorId} */
    doctorBookingSettingsGetForAdmin(
      input: FeTypes.DoctorBookingSettingsGetForAdminRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.DoctorBookingSettingsResponse> {
      return runEndpoint<FeTypes.DoctorBookingSettingsGetForAdminRequest, FeTypes.DoctorBookingSettingsResponse>(
        executor,
        {
          method: 'GET',
          path: '/doctor-booking-settings/{doctorId}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PATCH /api/v1/doctor-booking-settings/{doctorId}/override */
    doctorBookingSettingsOverride(
      input: FeTypes.DoctorBookingSettingsOverrideRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.DoctorBookingSettingsResponse> {
      return runEndpoint<FeTypes.DoctorBookingSettingsOverrideRequest, FeTypes.DoctorBookingSettingsResponse>(
        executor,
        {
          method: 'PATCH',
          path: '/doctor-booking-settings/{doctorId}/override',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    // ==================== E2: FAMILY COMPANION & METRICS ====================
    /** GET /api/v1/users/family-companion/contacts */
    usersSearchFamilyCompanionContacts(
      input: FeTypes.UsersSearchFamilyCompanionContactsRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.SearchFamilyCompanionContactsResponse> {
      return runEndpoint<FeTypes.UsersSearchFamilyCompanionContactsRequest, FeTypes.SearchFamilyCompanionContactsResponse>(
        executor,
        {
          method: 'GET',
          path: '/users/family-companion/contacts',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/family-links */
    familyLinksCreate(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksCreateApiRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.CreateFamilyInvitationResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksCreateApiRequest>, FeTypes.CreateFamilyInvitationResponse>(
        executor,
        {
          method: 'POST',
          path: '/family-links',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/family-links */
    familyLinksList(
      input?: FeTypes.FamilyLinksListRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksListResponse> {
      return runEndpoint<FeTypes.FamilyLinksListRequest, FeTypes.FamilyLinksListResponse>(
        executor,
        {
          method: 'GET',
          path: '/family-links',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/family-links/{id} */
    familyLinksGet(
      input: FeTypes.FamilyLinkGetRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinkGetResponse> {
      return runEndpoint<FeTypes.FamilyLinkGetRequest, FeTypes.FamilyLinkGetResponse>(
        executor,
        {
          method: 'GET',
          path: '/family-links/{id}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/family-links/redeem */
    familyLinksRedeem(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksRedeemApiRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksRedeemResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksRedeemApiRequest>, FeTypes.FamilyLinksRedeemResponse>(
        executor,
        {
          method: 'POST',
          path: '/family-links/redeem',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/family-links/{id}/accept */
    familyLinksAccept(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksAcceptApiRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksAcceptResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksAcceptApiRequest>, FeTypes.FamilyLinksAcceptResponse>(
        executor,
        {
          method: 'POST',
          path: '/family-links/{id}/accept',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/family-links/{id}/actions/{action} */
    familyLinksAction(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksActionApiRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksActionResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksActionApiRequest>, FeTypes.FamilyLinksActionResponse>(
        executor,
        {
          method: 'POST',
          path: '/family-links/{id}/actions/{action}',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** PUT /api/v1/family-links/{id}/permissions */
    familyLinksUpdatePermissions(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksUpdatePermissionsApiRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksUpdatePermissionsResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksUpdatePermissionsApiRequest>, FeTypes.FamilyLinksUpdatePermissionsResponse>(
        executor,
        {
          method: 'PUT',
          path: '/family-links/{id}/permissions',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** POST /api/v1/family-links/{id}/regenerate-artifacts */
    familyLinksRegenerateArtifacts(
      input: WithFlexibleHeaders<FeTypes.RegenerateFamilyInvitationArtifactsRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.RegenerateFamilyInvitationArtifactsResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.RegenerateFamilyInvitationArtifactsRequest>, FeTypes.RegenerateFamilyInvitationArtifactsResponse>(
        executor,
        {
          method: 'POST',
          path: '/family-links/{id}/regenerate-artifacts',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/family-links/{id}/health-metric-sharing */
    familyLinksGetHealthMetricSharing(
      input: FeTypes.FamilyLinksGetHealthMetricSharingRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyHealthMetricSharingResponse> {
      return runEndpoint<FeTypes.FamilyLinksGetHealthMetricSharingRequest, FeTypes.FamilyHealthMetricSharingResponse>(
        executor,
        {
          method: 'GET',
          path: '/family-links/{id}/health-metric-sharing',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** PUT /api/v1/family-links/{id}/health-metric-sharing */
    familyLinksUpsertHealthMetricSharing(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksUpsertHealthMetricSharingRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyHealthMetricSharingResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksUpsertHealthMetricSharingRequest>, FeTypes.FamilyHealthMetricSharingResponse>(
        executor,
        {
          method: 'PUT',
          path: '/family-links/{id}/health-metric-sharing',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** DELETE /api/v1/family-links/{id}/health-metric-sharing */
    familyLinksRevokeHealthMetricSharing(
      input: WithFlexibleHeaders<FeTypes.FamilyLinksRevokeHealthMetricSharingRequest>,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyLinksRevokeHealthMetricSharingResponse> {
      return runEndpoint<WithFlexibleHeaders<FeTypes.FamilyLinksRevokeHealthMetricSharingRequest>, FeTypes.FamilyLinksRevokeHealthMetricSharingResponse>(
        executor,
        {
          method: 'DELETE',
          path: '/family-links/{id}/health-metric-sharing',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: true,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/family-links/{id}/health-metrics/summary */
    familyLinksReadHealthMetricSummary(
      input: FeTypes.FamilyLinksReadHealthMetricApiRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyHealthMetricSummaryResponse> {
      return runEndpoint<FeTypes.FamilyLinksReadHealthMetricApiRequest, FeTypes.FamilyHealthMetricSummaryResponse>(
        executor,
        {
          method: 'GET',
          path: '/family-links/{id}/health-metrics/summary',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/family-links/{id}/health-metrics/trend */
    familyLinksReadHealthMetricTrend(
      input: FeTypes.FamilyLinksReadHealthMetricApiRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.FamilyHealthMetricTrendResponse> {
      return runEndpoint<FeTypes.FamilyLinksReadHealthMetricApiRequest, FeTypes.FamilyHealthMetricTrendResponse>(
        executor,
        {
          method: 'GET',
          path: '/family-links/{id}/health-metrics/trend',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
    /** GET /api/v1/admin/family-links */
    adminFamilyLinksList(
      input?: FeTypes.AdminFamilyLinksListRequest,
      options?: RequestRuntimeOptions,
    ): Promise<FeTypes.AdminFamilyLinksListResponse> {
      return runEndpoint<FeTypes.AdminFamilyLinksListRequest, FeTypes.AdminFamilyLinksListResponse>(
        executor,
        {
          method: 'GET',
          path: '/admin/family-links',
          isWrapper: true,
          isMultipart: false,
          requiresIdempotency: false,
        },
        input,
        options,
      );
    },
  };
}

export type FeApiSdk = ReturnType<typeof createFeApiSdk>;
