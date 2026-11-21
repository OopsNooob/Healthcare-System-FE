import { client } from './gen/client.gen';
import { createFeApiSdk, type ApiExecutor } from './fe-api-sdk';

declare const process: any;

const normalizeBaseUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const getBaseUrl = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
      // @ts-ignore
      return normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
      return normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
    }
  } catch {
    // ignore
  }

  return 'http://localhost:3001/api/v1';
};

client.setConfig({
  baseURL: getBaseUrl(),
});

export const setApiBaseUrl = (url: string) => {
  client.setConfig({
    baseURL: normalizeBaseUrl(url),
  });
};

let activeToken: string | null = null;
let tokenGetter: (() => string | null | Promise<string | null>) | null = null;

export const setAuthToken = (token: string | null) => {
  activeToken = token;
  if (token) {
    client.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.instance.defaults.headers.common['Authorization'];
  }
};

export const setTokenGetter = (getter: () => string | null | Promise<string | null>) => {
  tokenGetter = getter;
};

// generateIdempotencyKey is exported via ./pagination

client.instance.interceptors.request.use(async (config) => {
  let token = activeToken;
  if (!token && tokenGetter) {
    try {
      token = await tokenGetter();
    } catch {
      // ignore
    }
  }
  if (!token && typeof window !== 'undefined' && window.localStorage) {
    token = window.localStorage.getItem('accessToken');
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const feApi = createFeApiSdk(client.instance as unknown as ApiExecutor);

export { client };
export * from './gen/index';
export * from './gen/@tanstack/react-query.gen';
export * from './pagination';
export * from './fe-api-sdk';
export * from './fe-api-types';
export * as FeTypes from './fe-api-types';
export type {
  HealthLiveResponse,
  HealthReadyResponse,
  ViolationsCreateResponse,
  ViolationsDeleteResponse,
  ViolationsFindByIdResponse,
  ViolationsUpdateResponse,
  ViolationsResolveResponse,
  ChatRemoveMessageResponse,
} from './fe-api-types';
