import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormValues {
  email: string;
  password: string;
  totpCode?: string;
}

const passwordValidationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(1, 'Password is required')
    .required('Password is required'),
});

const mfaValidationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(1, 'Password is required')
    .required('Password is required'),
  totpCode: Yup.string()
    .matches(/^\d{6}$/, 'TOTP code must be 6 digits')
    .required('TOTP code is required'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, isLoading, clearError } = useAuth();
  const [showMFA, setShowMFA] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [mfaError, setMfaError] = useState<string>('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string>('');

  const initialValues: LoginFormValues = {
    email: '',
    password: '',
    totpCode: '',
  };

  const handlePasswordSubmit = async (values: LoginFormValues) => {
    try {
      clearError();
      setMfaError('');
      
      const response = await fetch('/portal/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.mfaRequired) {
          setUserId(data.userId);
          setShowMFA(true);
        } else {
          await login(values.email, values.password);
          navigate('/dashboard');
        }
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
    }
  };

  const handleMFASubmit = async (values: LoginFormValues) => {
    try {
      setMfaError('');
      
      const response = await fetch('/portal/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          token: values.totpCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        await login(values.email, values.password);
        navigate('/dashboard');
      } else {
        setMfaError(data.message || 'Invalid TOTP code');
      }
    } catch (err: any) {
      setMfaError('MFA verification failed. Please try again.');
    }
  };

  const handleSSOLogin = async () => {
    try {
      setSsoLoading(true);
      setSsoError('');
      clearError();
      
      const response = await fetch('/portal/auth/sso/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          relayState: '/dashboard',
        }),
      });

      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.message || 'SSO login failed');
      }
    } catch (err: any) {
      setSsoError(err.message || 'SSO login failed. Please try again.');
      console.error('SSO login error:', err);
    } finally {
      setSsoLoading(false);
    }
  };

  const handleSubmit = showMFA ? handleMFASubmit : handlePasswordSubmit;

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
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Sign In
          </Typography>

          <Stepper activeStep={showMFA ? 1 : 0} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Enter Credentials</StepLabel>
            </Step>
            <Step>
              <StepLabel>Two-Factor Authentication</StepLabel>
            </Step>
          </Stepper>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              role="alert"
              aria-live="polite"
            >
              {error.message || 'Login failed. Please try again.'}
            </Alert>
          )}

          {mfaError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              role="alert"
              aria-live="polite"
            >
              {mfaError}
            </Alert>
          )}

          {ssoError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              role="alert"
              aria-live="polite"
            >
              {ssoError}
            </Alert>
          )}

          {!showMFA && (
            <Box sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSSOLogin}
                disabled={ssoLoading}
                sx={{ 
                  mb: 2,
                  py: 1.5,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                  },
                  '&:focus': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '2px',
                  }
                }}
                aria-label={ssoLoading ? "Signing in with SSO..." : "Sign in with Single Sign-On"}
                role="button"
                tabIndex={0}
              >
                {ssoLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Signing in with SSO...
                  </Box>
                ) : (
                  'Sign in with SSO'
                )}
              </Button>
              
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  or
                </Typography>
              </Divider>
            </Box>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={showMFA ? mfaValidationSchema : passwordValidationSchema}
            onSubmit={handleSubmit}
          >
            {({ isValid, dirty }) => (
              <Form>
                <Box sx={{ mt: 1 }}>
                  <Field name="email">
                    {({ field, meta }: any) => (
                      <TextField
                        {...field}
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        error={meta.touched && !!meta.error}
                        helperText={meta.touched && meta.error}
                        aria-invalid={meta.touched && !!meta.error}
                        aria-describedby={meta.touched && meta.error ? "email-error" : undefined}
                      />
                    )}
                  </Field>

                  <Field name="password">
                    {({ field, meta }: any) => (
                      <TextField
                        {...field}
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        disabled={showMFA}
                        error={meta.touched && !!meta.error}
                        helperText={meta.touched && meta.error}
                        aria-invalid={meta.touched && !!meta.error}
                        aria-describedby={meta.touched && meta.error ? "password-error" : undefined}
                      />
                    )}
                  </Field>

                  {showMFA && (
                    <Field name="totpCode">
                      {({ field, meta }: any) => (
                        <TextField
                          {...field}
                          margin="normal"
                          required
                          fullWidth
                          name="totpCode"
                          label="6-Digit TOTP Code"
                          type="text"
                          id="totpCode"
                          autoComplete="one-time-code"
                          autoFocus
                          inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error || 'Enter the 6-digit code from your authenticator app'}
                          aria-invalid={meta.touched && !!meta.error}
                          aria-describedby={meta.touched && meta.error ? "totp-error" : "totp-help"}
                        />
                      )}
                    </Field>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={!isValid || !dirty || isLoading}
                    aria-label={isLoading ? "Signing in..." : "Sign in"}
                  >
                    {isLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Signing In...
                      </Box>
                    ) : showMFA ? (
                      'Verify TOTP Code'
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
