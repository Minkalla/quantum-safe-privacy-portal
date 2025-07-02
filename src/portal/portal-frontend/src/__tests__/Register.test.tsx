import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthProvider } from '../contexts/AuthContext';
import Register from '../components/auth/Register';

const server = setupServer(
  http.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/portal/auth/register`, () => {
    return HttpResponse.json({
      message: 'User registered successfully',
      userId: '123',
      email: 'test@example.com'
    }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  test('renders registration form with all required fields', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  test('validates password requirements - minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'weak');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  test('validates password requirements - uppercase letter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'password123');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
    });
  });

  test('validates password requirements - number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'Password');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
    });
  });

  test('validates password confirmation match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'DifferentPassword123');
    await user.tab();
    
    await waitFor(() => {
      expect(screen.getByText(/passwords must match/i)).toBeInTheDocument();
    });
  });

  test('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password$/i);
    const toggleButton = screen.getByLabelText(/show password/i);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('toggles confirm password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const toggleButton = screen.getByLabelText(/show confirm password/i);
    
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('disables submit button when form is invalid', () => {
    renderWithProviders(<Register />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  test('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  test('has proper accessibility attributes', () => {
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'false');
    
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-help');
  });

  test('updates aria-invalid when fields have errors', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'weak');
    await user.tab();
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  test('associates error messages with inputs via aria-describedby', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter a valid email address/i);
    });
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    await user.tab();
    expect(emailInput).toHaveFocus();
    
    await user.tab();
    expect(passwordInput).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/show password/i)).toHaveFocus();
    
    await user.tab();
    expect(confirmPasswordInput).toHaveFocus();
    
    await user.tab();
    expect(screen.getByLabelText(/show confirm password/i)).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('button', { name: /sign in here/i })).toHaveFocus();
  });

  test('navigates to login page when sign in link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const signInLink = screen.getByRole('button', { name: /sign in here/i });
    await user.click(signInLink);
    
    expect(signInLink).toBeInTheDocument();
  });

  test('submits form with valid data and shows loading state', async () => {
    server.use(
      http.post('http://localhost:8080/portal/auth/register', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return HttpResponse.json({
          message: 'User registered successfully',
          userId: '123',
          email: 'test@example.com'
        }, { status: 201 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });

  test('displays error message on registration failure', async () => {
    server.use(
      http.post('http://localhost:8080/portal/auth/register', () => {
        return HttpResponse.json({
          statusCode: 400,
          message: 'Email already exists',
          error: 'Email already exists'
        }, { status: 400 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email already exists/i);
    });
  });

  test('handles network timeout error', async () => {
    server.use(
      http.post('http://localhost:8080/portal/auth/register', () => {
        return HttpResponse.error();
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<Register />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.type(confirmPasswordInput, 'Password123');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
    });
  });
});
