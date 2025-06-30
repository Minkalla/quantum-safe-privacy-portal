import { AxiosError } from 'axios';
import apiClient, { handleApiError, setAuthToken } from '../utils/api';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth';

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      const { accessToken } = response.data;
      
      setAuthToken(accessToken);
      
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error as AxiosError);
    }
  }

  async logout(): Promise<void> {
    try {
      setAuthToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { accessToken } = response.data;
      setAuthToken(accessToken);
      return accessToken;
    } catch (error) {
      setAuthToken(null);
      return null;
    }
  }
}

export const authService = new AuthService();
