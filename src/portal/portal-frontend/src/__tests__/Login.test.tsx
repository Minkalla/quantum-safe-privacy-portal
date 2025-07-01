import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import Login from '../pages/Login';
import { AuthProvider } from '../contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockJWT = () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    userId: '1',
    email: 'test@example.com',
    role: 'user',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
};

const server = setupServer(
  rest.post('http://localhost:8080/portal/auth/login', (_req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        accessToken: createMockJWT(),
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'user'
        }
      })
    );
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

describe('Login Component', () => {
  describe('Rendering', () => {
    test('renders email and password inputs correctly', () => {
      renderLogin();
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('renders sign in heading', () => {
      renderLogin();
      
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });

    test('submit button is initially disabled', () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    test('validates invalid email format', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    test('validates empty email field', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.click(emailInput);
      await user.tab();
      await user.type(passwordInput, 'password123');
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test('validates empty password field', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.click(passwordInput);
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test('enables submit button when form is valid', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe('API Integration', () => {
    test('sends correct data to backend on successful login', async () => {
      const user = userEvent.setup();
      let requestBody: any;
      
      server.use(
        rest.post('http://localhost:8080/portal/auth/login', async (req, res, ctx) => {
          requestBody = await req.json();
          return res(
            ctx.status(200),
            ctx.json({
              accessToken: createMockJWT(),
              refreshToken: 'mock-refresh-token',
              user: {
                id: '1',
                email: 'test@example.com',
                role: 'user'
              }
            })
          );
        })
      );
      
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(requestBody).toEqual({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    test('redirects to dashboard on successful login', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('stores token in localStorage on successful login', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        const storedToken = localStorage.getItem('accessToken');
        expect(storedToken).toBeTruthy();
        expect(storedToken).toMatch(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9-_]+$/); // JWT format with base64
      });
    });

    test('displays error message on 401 failure', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('http://localhost:8080/portal/auth/login', (_req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              message: 'Invalid credentials',
              error: 'Unauthorized'
            })
          );
        })
      );
      
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials|login failed/i)).toBeInTheDocument();
      });
    });

    test('shows loading state during form submission', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('http://localhost:8080/portal/auth/login', (_req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.status(200),
            ctx.json({
              accessToken: createMockJWT(),
              refreshToken: 'mock-refresh-token',
              user: {
                id: '1',
                email: 'test@example.com',
                role: 'user'
              }
            })
          );
        })
      );
      
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for inputs', () => {
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('sets aria-invalid to true for invalid fields', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.tab();
      
      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    test('error alert has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      server.use(
        rest.post('http://localhost:8080/portal/auth/login', (_req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              message: 'Invalid credentials',
              error: 'Unauthorized'
            })
          );
        })
      );
      
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      emailInput.blur();
      emailInput.focus();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Behavior', () => {
    test('prevents double submission during loading', async () => {
      const user = userEvent.setup();
      let requestCount = 0;
      
      server.use(
        rest.post('http://localhost:8080/portal/auth/login', (_req, res, ctx) => {
          requestCount++;
          return res(
            ctx.delay(500),
            ctx.status(200),
            ctx.json({
              accessToken: createMockJWT(),
              refreshToken: 'mock-refresh-token',
              user: {
                id: '1',
                email: 'test@example.com',
                role: 'user'
              }
            })
          );
        })
      );
      
      renderLogin();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
      
      expect(requestCount).toBe(1);
    });
  });
});
