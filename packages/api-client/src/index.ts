import { client } from './gen/client.gen';

declare const process: any;

const getBaseUrl = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
      // @ts-ignore
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
  } catch {
    // ignore
  }

  return 'http://localhost:3000/api/v1';
};

client.setConfig({
  baseURL: getBaseUrl(),
});

export const setApiBaseUrl = (url: string) => {
  client.setConfig({
    baseURL: url,
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

export const generateIdempotencyKey = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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

export { client };
export * from './gen/index';
export * from './gen/@tanstack/react-query.gen';
