import axios from 'axios';
import { getCurrentUser, refreshSession } from '../auth/cognito';
import { externalSetSession, externalSignOut } from '../auth/AuthProvider';
import {
  getIdToken,
  getRefreshToken,
  setSession as storeSetSession,
  clearSession as storeClearSession,
} from '../auth/sessionStore';

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
  let idToken = getIdToken();
  const refreshToken = getRefreshToken();

  if (idToken && refreshToken && isTokenExpired(idToken)) {
    const user = getCurrentUser();
    if (user) {
      try {
        const session = await refreshSession(user, refreshToken);
        idToken = session.getIdToken().getJwtToken();
        const newRefresh = session.getRefreshToken().getToken();
        storeSetSession(idToken, newRefresh);
        externalSetSession?.(idToken, newRefresh);
      } catch {
        storeClearSession();
        externalSignOut?.();
      }
    }
  }

  if (idToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${idToken}`;
  }
  return config;
});

export function getApi() {
  validateApiUrl();
  return api;
}
