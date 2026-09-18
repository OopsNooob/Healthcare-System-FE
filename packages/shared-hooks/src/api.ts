import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { io, type Socket } from "socket.io-client";
import { getStorage } from "./storage";

// NOTE: We'll inject useAuthStore later to avoid circular dependencies
let logoutCallback: () => void = () => {};
let setUserCallback: (user: any, token: string, refreshToken: string) => void = () => {};
let getCurrentUser: () => any = () => null;

export function setAuthCallbacks(
  logout: () => void,
  setUser: (user: any, token: string, refreshToken: string) => void,
  getUser: () => any
) {
  logoutCallback = logout;
  setUserCallback = setUser;
  getCurrentUser = getUser;
}

// In a real mobile environment, process.env might not be available exactly like Vite
// We fallback to a hardcoded URL or require the consumer to inject it.
let API_BASE_URL = typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL
  ? process.env.EXPO_PUBLIC_API_URL
  : "http://localhost:3000/api/v1";

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url;
  api.defaults.baseURL = url;
  refreshApi.defaults.baseURL = url;
}

let SOCKET_BASE_URL = API_BASE_URL.replace(/\/api(\/.*)?$/, "");

async function getAccessToken(): Promise<string> {
  const storeToken = await getStorage().getItem("accessToken");
  return storeToken || "";
}

const socket: Socket = io(`${SOCKET_BASE_URL}/chat`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

const sessionSocket: Socket = io(`${SOCKET_BASE_URL}/session`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

const notificationsSocket: Socket = io(`${SOCKET_BASE_URL}/notifications`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

const presenceSocket: Socket = io(`${SOCKET_BASE_URL}`, {
  autoConnect: false,
  reconnectionAttempts: 3,
});

function updateSocketAuth(token: string) {
  socket.auth = { token };
  sessionSocket.auth = { token };
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

export async function connectSessionSocket(token?: string): Promise<boolean> {
  if (!token) {
    if (sessionSocket.connected) sessionSocket.disconnect();
    return false;
  }
  updateSocketAuth(token);
  if (!sessionSocket.connected) sessionSocket.connect();
  return true;
}

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
  "/auth/register",
  "/auth/forgot-password",
  "/auth/send-otp",
  "/auth/confirm-otp",
  "/auth/change-password",
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

async function clearAuthStorage() {
  logoutCallback();
  const storage = getStorage();
  await storage.removeItem("accessToken");
  await storage.removeItem("refreshToken");
}

function notifySessionExpired() {
  // Use a generic way to emit events, potentially utilizing a simple EventTarget or callback
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent("auth:session-expired", {
        detail: { message: "Session expired. Please log in again!" },
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

    const requestPath = originalRequest.url ?? "";
    const isAuthFreeRequest = authFreePaths.has(requestPath);

    if (error.response?.status !== 401 || isAuthFreeRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await clearAuthStorage();
      notifySessionExpired();
      return Promise.reject(error);
    }

    const currentUser = getCurrentUser();
    const storage = getStorage();
    const refreshToken = await storage.getItem("refreshToken");

    if (!currentUser?.id || !refreshToken) {
      await clearAuthStorage();
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
          userId: currentUser.id,
          refreshToken,
        },
      );

      const nextAccessToken = refreshResponse.data.accessToken;
      const nextRefreshToken = refreshResponse.data.refreshToken;

      await storage.setItem("accessToken", nextAccessToken);
      await storage.setItem("refreshToken", nextRefreshToken);
      
      setUserCallback(currentUser, nextAccessToken, nextRefreshToken);
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

export {
  API_BASE_URL,
  api,
  socket,
  sessionSocket,
  notificationsSocket,
  presenceSocket,
};
