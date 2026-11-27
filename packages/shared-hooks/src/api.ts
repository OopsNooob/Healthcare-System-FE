import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { io, type Socket } from "socket.io-client";
import {
  createFeApiSdk,
  type ApiExecutor,
  SOCKET_NAMESPACES,
} from "@healthcare/api-client";
import { getStorage } from "./storage";

export type AuthCallbackUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  hasPassword?: boolean;
  authProvider?: 'local' | 'google';
};

// NOTE: We'll inject useAuthStore later to avoid circular dependencies
let logoutCallback: () => void = () => {};
let setUserCallback: (
  user: AuthCallbackUser,
  token: string,
  refreshToken: string,
) => void = () => {};
let getCurrentUser: () => AuthCallbackUser | null = () => null;

export function setAuthCallbacks(
  logout: () => void,
  setUser: (
    user: AuthCallbackUser,
    token: string,
    refreshToken: string,
  ) => void,
  getUser: () => AuthCallbackUser | null,
) {
  logoutCallback = logout;
  setUserCallback = setUser;
  getCurrentUser = getUser;
}

// In a real mobile environment, process.env might not be available exactly like Vite
// We fallback to a hardcoded URL or require the consumer to inject it.
let API_BASE_URL = (
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL
    : "http://localhost:3000/api/v1"
)
  .trim()
  .replace(/\/+$/, "");

let SOCKET_BASE_URL = API_BASE_URL.replace(/\/api(\/.*)?$/, "");

type MutableSocketManager = {
  uri?: string;
  opts?: {
    hostname?: string;
    port?: string | number;
    secure?: boolean;
  };
};

export function setApiBaseUrl(url: string) {
  const normalizedUrl = url.trim().replace(/\/+$/, "");
  API_BASE_URL = normalizedUrl;
  api.defaults.baseURL = normalizedUrl;
  refreshApi.defaults.baseURL = normalizedUrl;
  SOCKET_BASE_URL = normalizedUrl.replace(/\/api(\/.*)?$/, "");

  const managers = new Set<MutableSocketManager>();
  for (const s of [socket, consultationsSocket, notificationsSocket, presenceSocket]) {
    managers.add(s.io as unknown as MutableSocketManager);
  }
  for (const manager of managers) {
    manager.uri = SOCKET_BASE_URL;
    if (manager.opts) {
      delete manager.opts.hostname;
      delete manager.opts.port;
      delete manager.opts.secure;
    }
  }
}

async function getAccessToken(): Promise<string> {
  const storeToken = await getStorage().getItem("accessToken");
  return storeToken || "";
}

const socket: Socket = io(`${SOCKET_BASE_URL}${SOCKET_NAMESPACES.chat}`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

const consultationsSocket: Socket = io(
  `${SOCKET_BASE_URL}${SOCKET_NAMESPACES.consultations}`,
  {
    autoConnect: false,
    reconnectionAttempts: 3,
  },
);

const sessionSocket: Socket = consultationsSocket;

const notificationsSocket: Socket = io(
  `${SOCKET_BASE_URL}${SOCKET_NAMESPACES.notifications}`,
  {
    autoConnect: false,
    reconnectionAttempts: 3,
  },
);

const presenceSocket: Socket = io(`${SOCKET_BASE_URL}`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

function updateSocketAuth(token: string) {
  socket.auth = { token };
  consultationsSocket.auth = { token };
  notificationsSocket.auth = { token };
  presenceSocket.auth = { token };
}

export async function connectSocket(token?: string): Promise<boolean> {
  if (!token) {
    if (socket.connected) socket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!socket.connected) socket.connect();
  return true;
}

export async function connectConsultationsSocket(
  token?: string,
): Promise<boolean> {
  if (!token) {
    if (consultationsSocket.connected) consultationsSocket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!consultationsSocket.connected) consultationsSocket.connect();
  return true;
}

export const connectSessionSocket = connectConsultationsSocket;

export async function connectNotificationsSocket(token?: string): Promise<boolean> {
  if (!token) {
    if (notificationsSocket.connected) notificationsSocket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!notificationsSocket.connected) notificationsSocket.connect();
  return true;
}

export async function connectPresenceSocket(token?: string): Promise<boolean> {
  if (!token) {
    if (presenceSocket.connected) presenceSocket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!presenceSocket.connected) presenceSocket.connect();
  return true;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email?: string;
    fullName?: string;
    role?: string;
    avatarUrl?: string;
    hasPassword?: boolean;
    authProvider?: 'local' | 'google';
  };
};

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const refreshQueue: QueueItem[] = [];
let isRefreshing = false;

const authFreePaths = new Set([
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/register/patient",
  "/auth/register/doctor",
  "/auth/doctor-reapplication/restore",
  "/auth/verify-email",
  "/auth/request-email-verification",
  "/auth/resend-verification",
  "/auth/password-recovery",
  "/auth/reset-password",
  "/auth/oauth/google/exchange",
]);

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  detail?: string;
  details?: string;
  errors?: Array<{ message?: string; msg?: string } | string>;
};

function getApiErrorMessage(error: AxiosError): string | undefined {
  const data = error.response?.data as ApiErrorPayload | string | unknown;
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  
  if (typeof data === "object") {
    const message =
      (data as ApiErrorPayload).message ??
      (data as ApiErrorPayload).error ??
      (data as ApiErrorPayload).detail ??
      (data as ApiErrorPayload).details;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;

    const errors = (data as ApiErrorPayload).errors;
    if (Array.isArray(errors)) {
      const parts = errors
        .map((item) =>
          typeof item === "string" ? item : (item?.message ?? item?.msg),
        )
        .filter((item): item is string => Boolean(item));
      if (parts.length > 0) return parts.join(", ");
    }
  }
  return undefined;
}

function normalizeAxiosError(error: AxiosError): AxiosError {
  const message = getApiErrorMessage(error);
  if (message) {
    error.message = message;
  }
  return error;
}

export type SessionExpiredPayload = {
  message: string;
};

export type SessionExpiredListener = (payload: SessionExpiredPayload) => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();
let hasNotifiedSessionExpired = false;

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function resetSessionExpiredNotification(): void {
  hasNotifiedSessionExpired = false;
}

export function disconnectAllSockets(): void {
  for (const s of [socket, consultationsSocket, notificationsSocket, presenceSocket]) {
    s.auth = {};
    if (s.connected || s.active) {
      s.disconnect();
    }
  }
}

function normalizeRequestPath(url?: string): string {
  if (!url) return "";
  const withoutOrigin = url.trim().replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutOrigin.split("?")[0] ?? "";
  const withoutApiPrefix = withoutQuery.replace(/^\/api\/v\d+(?=\/|$)/i, "");
  if (!withoutApiPrefix) return "/";
  return withoutApiPrefix.startsWith("/") ? withoutApiPrefix : `/${withoutApiPrefix}`;
}

async function clearAuthStorage() {
  disconnectAllSockets();
  logoutCallback();
  const storage = getStorage();
  await storage.removeItem("accessToken");
  await storage.removeItem("refreshToken");
}

function notifySessionExpired() {
  if (hasNotifiedSessionExpired) return;
  hasNotifiedSessionExpired = true;

  const payload: SessionExpiredPayload = {
    message: "Session expired. Please log in again!",
  };

  for (const listener of sessionExpiredListeners) {
    try {
      listener(payload);
    } catch {
      // Isolate listener errors
    }
  }

  // Keep DOM CustomEvent dispatch for web clients while supporting native listeners above
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent("auth:session-expired", {
        detail: payload,
      }),
    );
  }
}

function resolveRefreshQueue(token: string) {
  while (refreshQueue.length > 0) {
    const item = refreshQueue.shift();
    item?.resolve(token);
  }
}

function rejectRefreshQueue(error: unknown) {
  while (refreshQueue.length > 0) {
    const item = refreshQueue.shift();
    item?.reject(error);
  }
}

api.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    normalizeAxiosError(error);
    const originalRequest = error.config as RetryConfig | undefined;

    if (!originalRequest) return Promise.reject(error);

    const requestPath = normalizeRequestPath(originalRequest.url);
    const isAuthFreeRequest = authFreePaths.has(requestPath);

    if (error.response?.status !== 401 || isAuthFreeRequest) {
      return Promise.reject(error);
    }

    const hadAuthHeader = Boolean(originalRequest.headers?.Authorization);
    const currentUser = getCurrentUser();

    if (originalRequest._retry) {
      const hadSession = Boolean(currentUser || hadAuthHeader);
      await clearAuthStorage();
      if (hadSession) notifySessionExpired();
      return Promise.reject(error);
    }

    const storage = getStorage();
    const refreshToken = await storage.getItem("refreshToken");

    if (!refreshToken) {
      const hadSession = Boolean(currentUser || hadAuthHeader);
      await clearAuthStorage();
      if (hadSession) notifySessionExpired();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newAccessToken) => {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await refreshApi.post<RefreshResponse>(
        "/auth/refresh",
        {
          refreshToken,
        },
      );

      const nextAccessToken = refreshResponse.data.accessToken;
      const nextRefreshToken = refreshResponse.data.refreshToken;
      const nextUser = refreshResponse.data.user
        ? {
            id: refreshResponse.data.user.id,
            email: refreshResponse.data.user.email ?? currentUser?.email ?? "",
            name:
              refreshResponse.data.user.fullName ?? currentUser?.name ?? "",
            role: refreshResponse.data.user.role ?? currentUser?.role ?? "patient",
            avatar:
              refreshResponse.data.user.avatarUrl ?? currentUser?.avatar,
            hasPassword:
              refreshResponse.data.user.hasPassword ?? currentUser?.hasPassword,
            authProvider:
              refreshResponse.data.user.authProvider ??
              currentUser?.authProvider,
          }
        : currentUser;

      await storage.setItem("accessToken", nextAccessToken);
      await storage.setItem("refreshToken", nextRefreshToken);

      resetSessionExpiredNotification();
      if (nextUser) {
        setUserCallback(nextUser, nextAccessToken, nextRefreshToken);
      }
      updateSocketAuth(nextAccessToken);

      resolveRefreshQueue(nextAccessToken);
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError)) {
        normalizeAxiosError(refreshError);
      }
      rejectRefreshQueue(refreshError);
      await clearAuthStorage();
      notifySessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

const mobileApi = createFeApiSdk(api as unknown as ApiExecutor);

export {
  API_BASE_URL,
  api,
  mobileApi,
  socket,
  consultationsSocket,
  sessionSocket,
  notificationsSocket,
  presenceSocket,
  updateSocketAuth,
};
