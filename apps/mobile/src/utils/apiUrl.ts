import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@repo/shared-hooks';

export function resolveMobileApiBaseUrl(): string {
  const rawUrl = (
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
    API_BASE_URL ||
    'http://10.0.2.2:3000/api/v1'
  )
    .trim()
    .replace(/\/+$/, '');

  if (Platform.OS === 'android' && /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(rawUrl)) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    const targetHost =
      host && host !== 'localhost' && host !== '127.0.0.1' ? host : '10.0.2.2';
    return rawUrl.replace(/\/\/(localhost|127\.0\.0\.1)/, `//${targetHost}`);
  }

  if ((Platform.OS === 'web' || Platform.OS === 'ios') && rawUrl.includes('10.0.2.2')) {
    return rawUrl.replace(/\/\/10\.0\.2\.2/, '//localhost');
  }

  return rawUrl;
}

export function resolveMobileOAuthBaseUrl(): string {
  const apiUrl = resolveMobileApiBaseUrl();
  if (/^https?:\/\/(10\.0\.2\.2|127\.0\.0\.1)(:\d+)?(\/|$)/.test(apiUrl)) {
    return apiUrl.replace(/^(https?:\/\/)(10\.0\.2\.2|127\.0\.0\.1)/, '$1localhost');
  }
  return apiUrl;
}
