import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

/**
 * Ensure that the VITE_API_URL environment variable is present.
 * It should contain the base URL of the backend API.
 */
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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Retrieve the configured API instance, validating that the base URL is set.
 */
export function getApi() {
  validateApiUrl();
  return api;
}
