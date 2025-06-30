import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthError } from '../types/auth';

const API_BASE_URL = 'http://localhost:8080/portal';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

apiClient.interceptors.request.use(
  (config) => {
    if (authToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      // Emit custom event for components to handle navigation
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: AxiosError): AuthError => {
  if (error.response?.data) {
    return error.response.data as AuthError;
  }
  
  return {
    statusCode: error.response?.status || 500,
    message: error.message || 'An unexpected error occurred',
    error: 'Network Error',
  };
};

export default apiClient;
