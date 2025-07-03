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
import { useBranding } from '../contexts/BrandingContext';

interface LoginFormValues {
  email: string;
  password: string;
  totpCode?: string;
  deviceVerificationCode?: string;
}

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
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
  const { branding } = useBranding();
  const [showMFA, setShowMFA] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [mfaError, setMfaError] = useState<string>('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string>('');
  const [showDeviceVerification, setShowDeviceVerification] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [deviceError, setDeviceError] = useState<string>('');

  const initialValues: LoginFormValues = {
    email: '',
    password: '',
    totpCode: '',
    deviceVerificationCode: '',
  };

  const generateDeviceFingerprint = (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height}`;
    const fingerprint = btoa(userAgent + screenInfo + navigator.platform);
    
    const deviceType: 'desktop' | 'mobile' | 'tablet' = 
      /Mobile|Android|iPhone|iPad/.test(userAgent) ? 
        (/iPad/.test(userAgent) ? 'tablet' : 'mobile') : 'desktop';
    
    return {
      fingerprint,
      userAgent,
      deviceName: `${navigator.platform} ${deviceType}`,
      deviceType,
    };
  };

  const handlePasswordSubmit = async (values: LoginFormValues) => {
    try {
      clearError();
      setMfaError('');
      setDeviceError('');
      
      const deviceInfo = generateDeviceFingerprint();
      setDeviceInfo(deviceInfo);
      
      const response = await fetch('/portal/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceInfo.fingerprint,
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
        } else if (data.deviceTrustRequired) {
          await handleDeviceRegistration(deviceInfo, data.userId);
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
          'X-Device-Fingerprint': deviceInfo?.fingerprint || '',
        },
        body: JSON.stringify({
          userId: userId,
          token: values.totpCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        if (data.deviceTrustRequired && deviceInfo) {
          await handleDeviceRegistration(deviceInfo, userId);
        } else {
          await login(values.email, values.password);
          navigate('/dashboard');
        }
      } else {
        setMfaError(data.message || 'Invalid TOTP code');
      }
    } catch (err: any) {
      setMfaError('MFA verification failed. Please try again.');
    }
  };

  const handleDeviceRegistration = async (deviceInfo: DeviceInfo, userId: string) => {
    try {
      const response = await fetch('/portal/auth/device/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceInfo.fingerprint,
        },
        body: JSON.stringify({
          userId: userId,
          userAgent: deviceInfo.userAgent,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeviceVerification(true);
      } else {
        setDeviceError(data.message || 'Device registration failed');
      }
    } catch (err: any) {
      setDeviceError('Device registration failed. Please try again.');
    }
  };

  const handleDeviceVerificationSubmit = async (values: LoginFormValues) => {
    try {
      setDeviceError('');
      
      const response = await fetch('/portal/auth/device/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceInfo?.fingerprint || '',
          verificationCode: values.deviceVerificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        await login(values.email, values.password);
        navigate('/dashboard');
      } else {
        setDeviceError(data.message || 'Invalid device verification code');
      }
    } catch (err: any) {
      setDeviceError('Device verification failed. Please try again.');
    }
  };

  const handleSSOLogin = async () => {
    try {
      setSsoLoading(true);
      setSsoError('');
      clearError();
      
      const deviceInfo = generateDeviceFingerprint();
      setDeviceInfo(deviceInfo);
      
      const response = await fetch('/portal/auth/sso/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceInfo.fingerprint,
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

  const handleSubmit = showDeviceVerification ? handleDeviceVerificationSubmit : 
                    showMFA ? handleMFASubmit : handlePasswordSubmit;

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
          {branding?.logoUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <img 
                src={branding.logoUrl} 
                alt={`${branding.companyName || 'Company'} Logo`}
                style={{ maxHeight: '60px', maxWidth: '200px' }}
              />
            </Box>
          )}
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            {branding?.companyName ? `Sign In to ${branding.companyName}` : 'Sign In'}
          </Typography>

          <Stepper activeStep={showDeviceVerification ? 2 : showMFA ? 1 : 0} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Enter Credentials</StepLabel>
            </Step>
            <Step>
              <StepLabel>Two-Factor Authentication</StepLabel>
            </Step>
            <Step>
              <StepLabel>Device Verification</StepLabel>
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

          {deviceError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              role="alert"
              aria-live="polite"
            >
              {deviceError}
            </Alert>
          )}

          {!showMFA && !showDeviceVerification && (
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
                        disabled={showMFA || showDeviceVerification}
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

                  {showDeviceVerification && (
                    <Field name="deviceVerificationCode">
                      {({ field, meta }: any) => (
                        <TextField
                          {...field}
                          margin="normal"
                          required
                          fullWidth
                          name="deviceVerificationCode"
                          label="Device Verification Code"
                          type="text"
                          id="deviceVerificationCode"
                          autoComplete="one-time-code"
                          autoFocus
                          inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                          error={meta.touched && !!meta.error}
                          helperText={meta.touched && meta.error || 'Enter the 6-digit code to verify this device'}
                          aria-invalid={meta.touched && !!meta.error}
                          aria-describedby={meta.touched && meta.error ? "device-error" : "device-help"}
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
                    ) : showDeviceVerification ? (
                      'Verify Device'
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
