import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@repo/ui/store/useAuthStore";
import i18n from "@/i18n";
import {
  client,
  createFeApiSdk,
  extractApiErrorContext,
  normalizePaginatedList,
  normalizeCursorList,
  buildPaginationParams,
  generateIdempotencyKey,
  resolveApiError,
  SOCKET_NAMESPACES,
  SOCKET_EVENTS,
  type ApiExecutor,
  type CursorPaginatedResult,
  type PaginatedResult,
  type NotificationsCreateRequest,
} from "@healthcare/api-client";

import { io } from "socket.io-client";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1"
)
  .trim()
  .replace(/\/+$/, "");

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn("VITE_API_BASE_URL is missing in environment variables. Falling back to:", API_BASE_URL);
}

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api(\/.*)?$/, "");

function getAccessToken(): string {
  return (
    useAuthStore.getState().token || localStorage.getItem("accessToken") || ""
  );
}

const socket = io(`${SOCKET_BASE_URL}${SOCKET_NAMESPACES.chat}`, {
  autoConnect: false,
  auth: {
    token: getAccessToken(),
  },
  reconnectionAttempts: 3,
});

const consultationsSocket = io(
  `${SOCKET_BASE_URL}${SOCKET_NAMESPACES.consultations}`,
  {
    autoConnect: false,
    auth: {
      token: getAccessToken(),
    },
    reconnectionAttempts: 3,
  },
);

const sessionSocket = consultationsSocket;

const notificationsSocket = io(
  `${SOCKET_BASE_URL}${SOCKET_NAMESPACES.notifications}`,
  {
    autoConnect: false,
    auth: {
      token: getAccessToken(),
    },
    reconnectionAttempts: 3,
  },
);

const presenceSocket = io(`${SOCKET_BASE_URL}`, {
  autoConnect: false,
  auth: {
    token: getAccessToken(),
  },
  reconnectionAttempts: 3,
});

function updateSocketAuth(token: string) {
  socket.auth = { token };
  consultationsSocket.auth = { token };
  notificationsSocket.auth = { token };
  presenceSocket.auth = { token };
}

function connectNotificationsSocket(token?: string): boolean {
  if (!token) {
    if (notificationsSocket.connected) {
      notificationsSocket.disconnect();
    }
    console.log("Cannot connect notification socket");
    return false;
  }
  updateSocketAuth(token);
  if (!notificationsSocket.connected) {
    notificationsSocket.connect();
  }
  console.log("Notification socket connected successfully");
  return true;
}

// Listen for account_banned event and dispatch browser event
if (typeof window !== "undefined") {
  notificationsSocket.on("account_banned", (payload?: { message?: string }) => {
    window.dispatchEvent(
      new CustomEvent("auth:account-banned", {
        detail: {
          message:
            (payload?.message
              ? extractApiErrorMessage({ message: payload.message })
              : "") || i18n.t("auth.accountBannedMsg"),
        },
      }),
    );
  });
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
    email: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
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
  "/auth/password-recovery",
  "/auth/reset-password",
  "/auth/request-email-verification",
  "/auth/verify-email",
]);

function isVietnameseLocale(): boolean {
  const lng = (i18n.language || "vi").toLowerCase();
  return lng.startsWith("vi");
}

function extractApiErrorMessage(
  error: unknown,
  fallbackKey = "apiErrors.GENERIC_ERROR",
): string {
  const resolved = resolveApiError(error);
  if (resolved) {
    const fallback = isVietnameseLocale()
      ? resolved.fallbackVi
      : resolved.fallbackEn;
    return i18n.t(`apiErrors.${resolved.key}`, {
      ...resolved.params,
      defaultValue: fallback,
    });
  }

  const ctx = extractApiErrorContext(error);
  if (ctx.rawMessage) {
    return ctx.rawMessage;
  }

  return i18n.t(
    fallbackKey,
    isVietnameseLocale()
      ? "Đã xảy ra lỗi. Vui lòng thử lại."
      : "Something went wrong. Please try again.",
  );
}

function getApiErrorMessage(error: AxiosError): string | undefined {
  const resolved = resolveApiError(error);
  if (resolved) {
    const fallback = isVietnameseLocale()
      ? resolved.fallbackVi
      : resolved.fallbackEn;
    return i18n.t(`apiErrors.${resolved.key}`, {
      ...resolved.params,
      defaultValue: fallback,
    });
  }

  const ctx = extractApiErrorContext(error);
  return ctx.rawMessage;
}

function normalizeAxiosError(error: AxiosError): AxiosError {
  const message = getApiErrorMessage(error);

  if (message) {
    error.message = message;
    const data = error.response?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      (data as Record<string, unknown>).message = message;
    }
  }

  return error;
}

function clearAuthStorage() {
  useAuthStore.getState().logout();
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

function notifySessionExpired() {
  window.dispatchEvent(
    new CustomEvent("auth:session-expired", {
      detail: {
        message: i18n.t("auth.sessionExpiredMsg"),
      },
    }),
  );
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

api.interceptors.request.use((config) => {
  const accessTokenFromStore = useAuthStore.getState().token;
  const accessToken =
    accessTokenFromStore || localStorage.getItem("accessToken");

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

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestPath = originalRequest.url ?? "";
    const isAuthFreeRequest = authFreePaths.has(requestPath);

    if (error.response?.status !== 401 || isAuthFreeRequest) {
      return Promise.reject(error);
    }

    if (import.meta.env.VITE_MOCK_AUTH === "true") {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearAuthStorage();
      notifySessionExpired();
      return Promise.reject(error);
    }

    const currentUser = useAuthStore.getState().user;
    const refreshToken =
      useAuthStore.getState().refreshToken ||
      localStorage.getItem("refreshToken");

    if (!refreshToken) {
      clearAuthStorage();
      notifySessionExpired();
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
      const hydratedUser = refreshResponse.data.user
        ? {
            id: refreshResponse.data.user.id,
            email: refreshResponse.data.user.email,
            name: refreshResponse.data.user.fullName,
            role: refreshResponse.data.user.role,
            avatar: refreshResponse.data.user.avatarUrl,
          }
        : currentUser;

      localStorage.setItem("accessToken", nextAccessToken);
      localStorage.setItem("refreshToken", nextRefreshToken);
      if (hydratedUser) {
        useAuthStore
          .getState()
          .setUser(
            hydratedUser as NonNullable<typeof currentUser>,
            nextAccessToken,
            nextRefreshToken,
          );
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
      clearAuthStorage();
      notifySessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      normalizeAxiosError(error);
    }
    return Promise.reject(error);
  },
);

const webAdminApi = createFeApiSdk(api as unknown as ApiExecutor);

function connectConsultationsSocket(token?: string): boolean {
  if (!token) {
    if (consultationsSocket.connected) consultationsSocket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!consultationsSocket.connected) consultationsSocket.connect();
  return true;
}

export type * from "@healthcare/api-client";
export {
  API_BASE_URL,
  api,
  webAdminApi,
  extractApiErrorMessage,
  socket,
  consultationsSocket,
  sessionSocket,
  notificationsSocket,
  presenceSocket,
  connectNotificationsSocket,
  connectConsultationsSocket,
  updateSocketAuth,
  normalizePaginatedList,
  normalizeCursorList,
  buildPaginationParams,
  generateIdempotencyKey,
  SOCKET_NAMESPACES,
  SOCKET_EVENTS,
  type CursorPaginatedResult,
  type PaginatedResult,
  type NotificationsCreateRequest,
};
