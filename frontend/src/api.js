
import axios from 'axios';

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 12000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vutto_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
