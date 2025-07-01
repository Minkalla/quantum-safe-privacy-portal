import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Eye, EyeOff, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode.react';
import ErrorMessage from '../ui/ErrorMessage';
import LoadingSpinner from '../ui/LoadingSpinner';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaData, setMfaData] = useState<{
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      enableMFA: false,
      totpCode: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/\d/, 'Password must contain at least one number')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
      totpCode: Yup.string().when('enableMFA', {
        is: true,
        then: (schema) => schema.matches(/^\d{6}$/, 'TOTP code must be 6 digits').required('TOTP code is required'),
        otherwise: (schema) => schema.notRequired(),
      }),
    }),
    onSubmit: async (values) => {
      try {
        if (values.enableMFA && !mfaVerified) {
          await setupMFA(values.email, values.password);
          return;
        }
        
        await register(values.email, values.password);
        navigate('/login', { 
          state: { message: 'Registration successful! Please log in.' }
        });
      } catch (err) {
      }
    },
  });

  const setupMFA = async (email: string, password: string) => {
    try {
      const registerResponse = await fetch('/portal/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const registerData = await registerResponse.json();
      
      if (registerResponse.ok) {
        const mfaResponse = await fetch('/portal/auth/mfa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: registerData.userId }),
        });

        const mfaSetupData = await mfaResponse.json();
        
        if (mfaResponse.ok) {
          setMfaData({
            qrCodeUrl: mfaSetupData.qrCodeUrl,
            backupCodes: mfaSetupData.backupCodes,
          });
          setShowMFASetup(true);
        }
      }
    } catch (err) {
      console.error('MFA setup failed:', err);
    }
  };

  const verifyMFACode = async () => {
    try {
      const response = await fetch('/portal/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formik.values.email,
          token: formik.values.totpCode,
          enableMFA: true,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.verified) {
        setMfaVerified(true);
        setShowMFASetup(false);
        navigate('/login', { 
          state: { message: 'Registration and MFA setup successful! Please log in.' }
        });
      }
    } catch (err) {
      console.error('MFA verification failed:', err);
    }
  };

  const copyBackupCodes = () => {
    if (mfaData?.backupCodes) {
      navigator.clipboard.writeText(mfaData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join the Quantum-Safe Privacy Portal
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={formik.handleSubmit}>
          {error && <ErrorMessage error={error} />}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`input-field ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : ''
                }`}
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                aria-invalid={formik.touched.email && !!formik.errors.email ? 'true' : 'false'}
                aria-describedby={formik.touched.email && formik.errors.email ? 'email-error' : undefined}
              />
              {formik.touched.email && formik.errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {formik.errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-10 ${
                    formik.touched.password && formik.errors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  aria-invalid={formik.touched.password && !!formik.errors.password ? 'true' : 'false'}
                  aria-describedby={formik.touched.password && formik.errors.password ? 'password-error' : 'password-help'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p id="password-help" className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with one uppercase letter and one number
              </p>
              {formik.touched.password && formik.errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {formik.errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input-field pr-10 ${
                    formik.touched.confirmPassword && formik.errors.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  aria-invalid={formik.touched.confirmPassword && !!formik.errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={formik.touched.confirmPassword && formik.errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
                  {formik.errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="enableMFA"
                  checked={formik.values.enableMFA}
                  onChange={formik.handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Enable Two-Factor Authentication (Recommended)
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Adds an extra layer of security to your account
              </p>
            </div>
          </div>

          {showMFASetup && mfaData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-medium text-blue-900">Setup Two-Factor Authentication</h3>
              
              <div className="text-center">
                <QRCode value={mfaData.qrCodeUrl} size={200} />
                <p className="mt-2 text-sm text-gray-600">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Backup Codes</h4>
                <div className="bg-gray-100 p-3 rounded border text-sm font-mono">
                  {mfaData.backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
                >
                  {copiedCodes ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copiedCodes ? 'Copied!' : 'Copy Backup Codes'}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  Save these codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>
              </div>

              <div>
                <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700">
                  Enter 6-digit code from your authenticator app
                </label>
                <input
                  id="totpCode"
                  name="totpCode"
                  type="text"
                  maxLength={6}
                  className="mt-1 input-field"
                  value={formik.values.totpCode}
                  onChange={formik.handleChange}
                  placeholder="123456"
                />
                {formik.touched.totpCode && formik.errors.totpCode && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {formik.errors.totpCode}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={verifyMFACode}
                disabled={!formik.values.totpCode || formik.values.totpCode.length !== 6}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify and Complete Setup
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !formik.isValid || !formik.dirty || showMFASetup}
              className="btn-primary w-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Account...
                </>
              ) : formik.values.enableMFA && !mfaVerified ? (
                'Setup MFA & Create Account'
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
