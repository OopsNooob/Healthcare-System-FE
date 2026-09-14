import { client } from './gen';

client.setConfig({
  baseURL: 'http://localhost:3000/api/v1',
});

client.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export * from './gen';
