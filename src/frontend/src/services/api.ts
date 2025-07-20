import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ej: https://…/prod
  headers: { 'Content-Type': 'application/json' },
});
