 timport axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthError } from '../types/auth';
import { extractUserFromToken, isTokenExpired } from './jwt';

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
let isSSO = false;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  isSSO = false;

  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    try {
      const userData = extractUserFromToken(token);
      if (userData && 'authMethod' in userData && userData.authMethod === 'sso') {
        isSSO = true;
        console.debug('SSO token detected and configured for API requests');
      }
    } catch (error) {
      console.warn('Failed to parse token for SSO detection:', error);
    }
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (authToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          }
          return Promise.reject(error);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post('/auth/refresh', {}, {
          withCredentials: true, // Include refresh token cookie
        });

        const { accessToken } = response.data;

        if (accessToken) {
          if (isTokenExpired(accessToken)) {
            throw new Error('Received expired token from refresh endpoint');
          }

          localStorage.setItem('accessToken', accessToken);
          setAuthToken(accessToken);

          if (isSSO) {
            console.debug('SSO token successfully refreshed');
          }

          processQueue(null, accessToken);

          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('No access token received from refresh endpoint');
        }
      } catch (refreshError: any) {
        console.error('Token refresh failed:', refreshError.message);

        if (isSSO) {
          console.error('SSO token refresh failed, redirecting to SSO login');
        }

        processQueue(refreshError, null);
        setAuthToken(null);
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      if (isSSO) {
        console.warn('SSO token unauthorized, clearing authentication state');
      }

      setAuthToken(null);
      localStorage.removeItem('accessToken');
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
