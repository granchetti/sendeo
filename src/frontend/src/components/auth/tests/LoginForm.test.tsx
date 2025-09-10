import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import LoginForm from '../LoginForm';
import { AuthContext, type AuthContextType } from '../../../contexts/AuthContext';

vi.mock('../../../auth/cognito', () => ({
  signIn: vi.fn(),
  forgotPassword: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  api: { put: vi.fn() },
}));

import { signIn, forgotPassword } from '../../../auth/cognito';
import { api } from '../../../services/api';

describe('LoginForm', () => {
  const renderForm = (onSuccess = vi.fn()) => {
    const setSession = vi.fn();
    const authValue: AuthContextType = {
      idToken: null,
      refreshToken: null,
      setSession,
      signOut: vi.fn(),
    };
    render(
      <ChakraProvider>
        <AuthContext.Provider value={authValue}>
          <LoginForm onSuccess={onSuccess} />
        </AuthContext.Provider>
      </ChakraProvider>,
    );
    return { onSuccess, setSession };
  };

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('handles successful login', async () => {
    const { onSuccess, setSession } = renderForm();
    (signIn as Mock).mockResolvedValue({
      getIdToken: () => ({ getJwtToken: () => 'id-token' }),
      getRefreshToken: () => ({ getToken: () => 'refresh-token' }),
    });
    (api.put as Mock).mockResolvedValue({});

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'pass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(signIn).toHaveBeenCalledWith('user@example.com', 'pass123');
    expect(api.put).toHaveBeenCalledWith(
      '/v1/profile',
      { email: 'user@example.com' },
      expect.any(Object),
    );
    expect(setSession).toHaveBeenCalledWith('id-token', 'refresh-token');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('handles forgot password flow', async () => {
    renderForm();
    (forgotPassword as Mock).mockResolvedValue(undefined);

    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(forgotPassword).toHaveBeenCalledWith('user@example.com'));
    expect(
      screen.getByText(/check your email for reset instructions!/i),
    ).toBeInTheDocument();
  });
});

