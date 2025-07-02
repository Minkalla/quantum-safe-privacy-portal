import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Container,
  Paper,
  Button
} from '@mui/material';
import { setAuthToken } from '../../utils/api';
import { extractUserFromToken } from '../../utils/jwt';

interface SsoCallbackState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

const SsoCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<SsoCallbackState>({
    loading: true,
    error: null,
    success: false,
  });

  useEffect(() => {
    const processSamlResponse = async () => {
      try {
        const samlResponse = searchParams.get('SAMLResponse');
        const relayState = searchParams.get('RelayState');

        if (!samlResponse) {
          throw new Error('Missing SAML response from Identity Provider');
        }

        const response = await fetch('/portal/auth/sso/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            SAMLResponse: samlResponse,
            RelayState: relayState,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.accessToken) {
            const userData = extractUserFromToken(data.accessToken);
            if (userData) {
              localStorage.setItem('accessToken', data.accessToken);
              setAuthToken(data.accessToken);

              setState({
                loading: false,
                error: null,
                success: true,
              });

              const redirectPath = relayState || '/dashboard';
              setTimeout(() => {
                navigate(redirectPath, { replace: true });
              }, 1500);
            } else {
              throw new Error('Invalid token received from server');
            }
          } else {
            throw new Error('No access token received from server');
          }
        } else {
          throw new Error(data.message || 'SSO authentication failed');
        }
      } catch (err: any) {
        console.error('SSO callback error:', err);
        setState({
          loading: false,
          error: err.message || 'SSO authentication failed. Please try again.',
          success: false,
        });
      }
    };

    processSamlResponse();
  }, [searchParams, navigate]);

  const handleRetryLogin = () => {
    navigate('/login', { replace: true });
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
          {state.loading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
              role="status"
              aria-live="polite"
              aria-label="Processing SSO authentication"
            >
              <CircularProgress size={48} />
              <Typography variant="h6" component="h1">
                Processing SSO Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we verify your credentials...
              </Typography>
            </Box>
          )}

          {state.error && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
              role="alert"
              aria-live="assertive"
            >
              <Alert 
                severity="error" 
                sx={{ width: '100%', mb: 2 }}
                role="alert"
              >
                <Typography variant="h6" component="h1" gutterBottom>
                  Authentication Failed
                </Typography>
                {state.error}
              </Alert>
              
              <Button
                variant="contained"
                onClick={handleRetryLogin}
                sx={{ mt: 2 }}
                aria-label="Return to login page to try again"
                autoFocus
              >
                Return to Login
              </Button>
            </Box>
          )}

          {state.success && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
              role="status"
              aria-live="polite"
            >
              <Alert 
                severity="success" 
                sx={{ width: '100%', mb: 2 }}
                role="alert"
              >
                <Typography variant="h6" component="h1" gutterBottom>
                  Authentication Successful
                </Typography>
                You have been successfully authenticated via SSO. Redirecting to your dashboard...
              </Alert>
              
              <Button
                variant="outlined"
                onClick={handleGoToDashboard}
                sx={{ mt: 2 }}
                aria-label="Go to dashboard immediately"
              >
                Go to Dashboard Now
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SsoCallback;
