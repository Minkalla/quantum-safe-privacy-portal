import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { isTokenExpired, extractUserFromToken } from '../../utils/jwt';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isSSO, setIsSSO] = useState(false);

  useEffect(() => {
    const checkTokenValidity = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        try {
          const userData = extractUserFromToken(token);
          const isSSOToken = !!(userData && 'authMethod' in userData && userData.authMethod === 'sso');
          setIsSSO(isSSOToken);
          
          if (isSSOToken) {
            console.debug('SSO token detected in ProtectedRoute');
          }
        } catch (error) {
          console.warn('Failed to parse token in ProtectedRoute:', error);
          setIsSSO(false);
        }
        
        if (isTokenExpired(token)) {
          setIsCheckingToken(true);
          
          try {
            const response = await fetch('/portal/auth/refresh', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`Token refresh failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.accessToken) {
              localStorage.setItem('accessToken', data.accessToken);
              
              if (isSSO) {
                console.debug('SSO token successfully refreshed in ProtectedRoute');
              }
            }
          } catch (error: any) {
            console.warn('Token refresh failed:', error.message);
            
            if (isSSO) {
              console.warn('SSO token refresh failed, may need to re-authenticate via SSO');
            }
            
            localStorage.removeItem('accessToken');
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          } finally {
            setIsCheckingToken(false);
          }
        }
      }
    };

    if (isAuthenticated && user) {
      checkTokenValidity();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isSSO) {
        console.warn('SSO session unauthorized, redirecting to login');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [isSSO]);

  if (isLoading || isCheckingToken) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
