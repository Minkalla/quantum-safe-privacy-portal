import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { isTokenExpired } from '../../utils/jwt';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [isCheckingToken, setIsCheckingToken] = useState(false);

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token && isTokenExpired(token)) {
        setIsCheckingToken(true);
        
        try {
          await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.warn('Token refresh failed:', error);
        } finally {
          setIsCheckingToken(false);
        }
      }
    };

    if (isAuthenticated && user) {
      checkTokenValidity();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleUnauthorized = () => {
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  if (isLoading || isCheckingToken) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
