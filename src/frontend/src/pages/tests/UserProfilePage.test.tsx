import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import UserProfilePage from '../UserProfilePage';
import { AuthContext, type AuthContextType } from '../../contexts/AuthContext';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../../services/api';

describe('UserProfilePage', () => {
  const renderPage = () => {
    const qc = new QueryClient();
    const signOut = vi.fn();
    const authValue: AuthContextType = {
      idToken: 'token',
      refreshToken: 'refresh',
      setSession: () => {},
      signOut,
    };

    render(
      <ChakraProvider>
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter initialEntries={['/profile']}>
              <Routes>
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      </ChakraProvider>,
    );

    return { signOut, qc };
  };

  beforeEach(() => {
    (api.get as Mock).mockResolvedValue({ data: { email: 'user@example.com' } });
    (api.delete as Mock).mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends delete request and signs out on success', async () => {
    const { signOut } = renderPage();
    await screen.findByRole('tab', { name: /account/i });
    fireEvent.click(screen.getByRole('tab', { name: /account/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/v1/profile'));
    expect(signOut).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('Login Page')).toBeInTheDocument(),
    );
  });
});

