import { client, type RequestConfig } from './gen';

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

client.interceptors.request.use((config: RequestConfig) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token && config.headers) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export * from './gen';
