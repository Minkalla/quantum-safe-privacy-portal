import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';
import Login from '../pages/Login';
import SsoCallback from '../components/auth/SsoCallback';
import { AuthProvider } from '../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockSSOJWT = () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    userId: 'sso-user@example.com',
    email: 'sso-user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['user', 'admin'],
    authMethod: 'sso',
    idpIssuer: 'https://idp.example.com',
    sessionId: '_abc123def456',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64');
  const signature = 'mock-sso-signature';
  return `${header}.${payload}.${signature}`;
};


const server = setupServer(
  http.post('/portal/auth/sso/login', () => {
    return HttpResponse.json({
      success: true,
      redirectUrl: 'https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard',
      requestId: '_abc123def456'
    });
  }),
  
  http.post('/portal/auth/sso/callback', async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body.SAMLResponse) {
      return HttpResponse.json({
        success: false,
        message: 'Missing SAML response'
      }, { status: 400 });
    }
    
    return HttpResponse.json({
      success: true,
      accessToken: createMockSSOJWT(),
      refreshToken: 'mock-sso-refresh-token',
      user: {
        id: 'sso-user@example.com',
        email: 'sso-user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user', 'admin'],
        authMethod: 'sso'
      }
    });
  }),
  
  http.post('/portal/auth/refresh', () => {
    return HttpResponse.json({
      accessToken: createMockSSOJWT(),
      user: {
        id: 'sso-user@example.com',
        email: 'sso-user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['user', 'admin'],
        authMethod: 'sso'
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockNavigate.mockClear();
  localStorage.clear();
});
afterAll(() => server.close());

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

const renderSsoCallback = (searchParams = '?SAMLResponse=mock-response&RelayState=%2Fdashboard') => {
  return render(
    <MemoryRouter initialEntries={[`/auth/sso/callback${searchParams}`]}>
      <AuthProvider>
        <SsoCallback />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('SSO Integration Tests', () => {
  describe('SSO Login Flow', () => {
    test('renders SSO login button on login page', () => {
      renderLogin();
      
      expect(screen.getByRole('button', { name: /sign in with single sign-on/i })).toBeInTheDocument();
    });

    test('SSO button has proper accessibility attributes', () => {
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      expect(ssoButton).toHaveAttribute('aria-label', 'Sign in with Single Sign-On');
      expect(ssoButton).toHaveAttribute('role', 'button');
      expect(ssoButton).toHaveAttribute('tabIndex', '0');
    });

    test('initiates SSO login flow when SSO button is clicked', async () => {
      const user = userEvent.setup();
      let requestBody: any;
      
      server.use(
        http.post('/portal/auth/sso/login', async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            success: true,
            redirectUrl: 'https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard',
            requestId: '_abc123def456'
          });
        })
      );

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });
      
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      await user.click(ssoButton);
      
      await waitFor(() => {
        expect(requestBody).toEqual({
          relayState: '/dashboard'
        });
      });
    });

    test('calls SSO login endpoint with correct payload', async () => {
      const user = userEvent.setup();
      let requestBody: any;
      
      server.use(
        http.post('/portal/auth/sso/login', async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            success: true,
            redirectUrl: 'https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard',
            requestId: '_abc123def456'
          });
        })
      );
      
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      await user.click(ssoButton);
      
      await waitFor(() => {
        expect(requestBody).toEqual({
          relayState: '/dashboard'
        });
      });
    });

    test('shows loading state during SSO login', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post('/portal/auth/sso/login', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return HttpResponse.json({
            success: true,
            redirectUrl: 'https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard',
            requestId: '_abc123def456'
          });
        })
      );

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });
      
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      await user.click(ssoButton);
      
      expect(screen.getByText(/signing in with sso/i)).toBeInTheDocument();
      expect(ssoButton).toBeDisabled();
    });

    test('displays error message when SSO login fails', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post('/portal/auth/sso/login', () => {
          return HttpResponse.json({
            success: false,
            message: 'SSO configuration error'
          }, { status: 500 });
        })
      );
      
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      await user.click(ssoButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/sso configuration error|sso login failed/i)).toBeInTheDocument();
      });
    });

    test('prevents double submission during SSO login', async () => {
      const user = userEvent.setup();
      let requestCount = 0;
      
      server.use(
        http.post('/portal/auth/sso/login', async () => {
          requestCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({
            success: true,
            redirectUrl: 'https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard',
            requestId: '_abc123def456'
          });
        })
      );

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });
      
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      
      await user.click(ssoButton);
      
      await waitFor(() => {
        expect(screen.getByText(/signing in with sso/i)).toBeInTheDocument();
        expect(ssoButton).toBeDisabled();
      });
      
      expect(requestCount).toBe(1);
    });
  });

  describe('SSO Callback Flow', () => {
    test('processes valid SAML response successfully', async () => {
      let requestBody: any;
      
      server.use(
        http.post('/portal/auth/sso/callback', async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            success: true,
            accessToken: createMockSSOJWT(),
            refreshToken: 'mock-sso-refresh-token',
            user: {
              id: 'sso-user@example.com',
              email: 'sso-user@example.com',
              firstName: 'John',
              lastName: 'Doe',
              roles: ['user', 'admin'],
              authMethod: 'sso'
            }
          });
        })
      );
      
      renderSsoCallback();
      
      await waitFor(() => {
        expect(requestBody).toEqual({
          SAMLResponse: 'mock-response',
          RelayState: '/dashboard'
        });
      });
    });

    test('stores SSO token in localStorage on successful callback', async () => {
      renderSsoCallback();
      
      await waitFor(() => {
        const storedToken = localStorage.getItem('accessToken');
        expect(storedToken).toBeTruthy();
        expect(storedToken).toMatch(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9-_]+$/);
        
        const tokenPayload = JSON.parse(atob(storedToken!.split('.')[1]));
        expect(tokenPayload.authMethod).toBe('sso');
        expect(tokenPayload.email).toBe('sso-user@example.com');
      });
    });

    test('redirects to dashboard after successful SSO authentication', async () => {
      renderSsoCallback();
      
      await waitFor(() => {
        expect(screen.getByText(/authentication successful/i)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      }, { timeout: 2000 });
    });

    test('redirects to custom RelayState after successful authentication', async () => {
      renderSsoCallback('?SAMLResponse=mock-response&RelayState=%2Fprofile');
      
      await waitFor(() => {
        expect(screen.getByText(/authentication successful/i)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });
      }, { timeout: 2000 });
    });

    test('shows loading state during SAML response processing', () => {
      renderSsoCallback();
      
      expect(screen.getByText(/processing sso authentication/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing SSO authentication');
    });

    test('displays error when SAML response is missing', async () => {
      renderSsoCallback('?RelayState=%2Fdashboard');
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/missing saml response/i)).toBeInTheDocument();
      });
    });

    test('displays error when SSO callback fails', async () => {
      server.use(
        http.post('http://localhost:8080/portal/auth/sso/callback', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid SAML response'
          }, { status: 400 });
        })
      );
      
      renderSsoCallback();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/invalid saml response|sso authentication failed/i)).toBeInTheDocument();
      });
    });

    test('provides retry option when authentication fails', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post('http://localhost:8080/portal/auth/sso/callback', () => {
          return HttpResponse.json({
            success: false,
            message: 'Authentication failed'
          }, { status: 401 });
        })
      );
      
      renderSsoCallback();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /return to login/i })).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /return to login/i });
      await user.click(retryButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    test('has proper accessibility attributes for error states', async () => {
      server.use(
        http.post('http://localhost:8080/portal/auth/sso/callback', () => {
          return HttpResponse.json({
            success: false,
            message: 'Authentication failed'
          }, { status: 401 });
        })
      );
      
      renderSsoCallback();
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('role', 'alert');
        
        const retryButton = screen.getByRole('button', { name: /return to login/i });
        expect(retryButton).toHaveAttribute('aria-label', 'Return to login page to try again');
        expect(retryButton).toHaveAttribute('autoFocus');
      });
    });

    test('has proper accessibility attributes for success states', async () => {
      renderSsoCallback();
      
      await waitFor(() => {
        const successAlert = screen.getByRole('alert');
        expect(successAlert).toHaveAttribute('role', 'alert');
        
        const dashboardButton = screen.getByRole('button', { name: /go to dashboard/i });
        expect(dashboardButton).toHaveAttribute('aria-label', 'Go to dashboard immediately');
      });
    });
  });

  describe('SSO Token Management', () => {
    test('handles SSO token refresh correctly', async () => {
      localStorage.setItem('accessToken', createMockSSOJWT());
      
      const response = await fetch('/portal/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.accessToken).toBeTruthy();
      expect(data.user.authMethod).toBe('sso');
    });

    test('validates SSO token structure', () => {
      const ssoToken = createMockSSOJWT();
      const tokenPayload = JSON.parse(atob(ssoToken.split('.')[1]));
      
      expect(tokenPayload).toHaveProperty('authMethod', 'sso');
      expect(tokenPayload).toHaveProperty('idpIssuer', 'https://idp.example.com');
      expect(tokenPayload).toHaveProperty('sessionId');
      expect(tokenPayload).toHaveProperty('email');
      expect(tokenPayload).toHaveProperty('roles');
      expect(tokenPayload.roles).toContain('user');
    });

    test('handles SSO token expiration gracefully', async () => {
      const expiredToken = (() => {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const payload = Buffer.from(JSON.stringify({
          userId: 'sso-user@example.com',
          email: 'sso-user@example.com',
          authMethod: 'sso',
          exp: Math.floor(Date.now() / 1000) - 3600,
          iat: Math.floor(Date.now() / 1000) - 7200
        })).toString('base64');
        const signature = 'mock-expired-signature';
        return `${header}.${payload}.${signature}`;
      })();
      
      localStorage.setItem('accessToken', expiredToken);
      
      const response = await fetch('/portal/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.accessToken).toBeTruthy();
      
      const newTokenPayload = JSON.parse(atob(data.accessToken.split('.')[1]));
      expect(newTokenPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('SSO Security Features', () => {
    test('validates SAML response structure', async () => {
      let requestBody: any;
      
      server.use(
        http.post('/portal/auth/sso/callback', async ({ request }) => {
          requestBody = await request.json();
          
          if (!requestBody.SAMLResponse || typeof requestBody.SAMLResponse !== 'string') {
            return HttpResponse.json({
              success: false,
              message: 'Invalid SAML response format'
            }, { status: 400 });
          }
          
          return HttpResponse.json({
            success: true,
            accessToken: createMockSSOJWT(),
            refreshToken: 'mock-sso-refresh-token',
            user: {
              id: 'sso-user@example.com',
              email: 'sso-user@example.com',
              authMethod: 'sso'
            }
          });
        })
      );
      
      renderSsoCallback('?SAMLResponse=valid-base64-response&RelayState=%2Fdashboard');
      
      await waitFor(() => {
        expect(requestBody.SAMLResponse).toBe('valid-base64-response');
        expect(typeof requestBody.SAMLResponse).toBe('string');
      });
    });

    test('includes request ID in SSO login response', async () => {
      const mockRequestId = '_unique123request456id';
      let responseData: any;
      
      server.use(
        http.post('/portal/auth/sso/login', () => {
          responseData = {
            success: true,
            redirectUrl: `https://idp.example.com/sso?SAMLRequest=mock-request&RelayState=%2Fdashboard&RequestID=${mockRequestId}`,
            requestId: mockRequestId
          };
          return HttpResponse.json(responseData);
        })
      );
      
      const user = userEvent.setup();
      renderLogin();
      
      const ssoButton = screen.getByRole('button', { name: /sign in with single sign-on/i });
      await user.click(ssoButton);
      
      await waitFor(() => {
        expect(responseData.requestId).toBe(mockRequestId);
        expect(responseData.redirectUrl).toContain(`RequestID=${mockRequestId}`);
      });
    });

    test('validates RelayState parameter in callback', async () => {
      const validRelayState = '/dashboard';
      
      renderSsoCallback(`?SAMLResponse=mock-response&RelayState=${encodeURIComponent(validRelayState)}`);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(validRelayState, { replace: true });
      });
    });
  });
});
