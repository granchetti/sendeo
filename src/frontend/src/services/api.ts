import axios from 'axios';
import { getCurrentUser, refreshSession } from '../auth/cognito';
import { externalSetSession, externalSignOut } from '../auth/AuthProvider';

const baseURL = import.meta.env.VITE_API_URL;

function validateApiUrl(): void {
  if (!baseURL) {
    throw new Error(
      'VITE_API_URL is not defined. It must point to the backend API.'
    );
  }
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

api.interceptors.request.use(async (config) => {
  let accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (accessToken && refreshToken && isTokenExpired(accessToken)) {
    const user = getCurrentUser();
    if (user) {
      try {
        const session = await refreshSession(user, refreshToken);
        accessToken = session.getAccessToken().getJwtToken();
        const newRefresh = session.getRefreshToken().getToken();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        externalSetSession?.(accessToken, newRefresh);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        externalSignOut?.();
      }
    }
  }

  if (accessToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

export function getApi() {
  validateApiUrl();
  return api;
}
