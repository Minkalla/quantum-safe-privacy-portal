import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthError } from '../types/auth';
import { authService } from '../services/authService';
import { isTokenExpired, extractUserFromToken } from '../utils/jwt';
import { setAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  error: AuthError | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const clearError = () => setError(null);

  const initializeAuth = () => {
    const token = localStorage.getItem('accessToken');
    
    if (token && !isTokenExpired(token)) {
      const userData = extractUserFromToken(token);
      if (userData) {
        setUser(userData);
        setAuthToken(token);
      } else {
        localStorage.removeItem('accessToken');
      }
    } else {
      localStorage.removeItem('accessToken');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authService.login({ email, password, rememberMe });
      
      const userData = extractUserFromToken(response.accessToken);
      if (userData) {
        setUser(userData);
        localStorage.setItem('accessToken', response.accessToken);
      } else {
        throw new Error('Invalid token received');
      }
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('accessToken');
    authService.logout();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
