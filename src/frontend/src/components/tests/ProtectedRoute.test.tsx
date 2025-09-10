/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthContext, type AuthContextType } from '../../contexts/AuthContext';
import { describe, it, expect } from 'vitest';

const renderWithAuth = (idToken: string | null) => {
  const authContextValue: AuthContextType = {
    idToken,
    refreshToken: null,
    setSession: () => {},
    signOut: () => {},
  };

  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter initialEntries={['/']}> 
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Private</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('ProtectedRoute', () => {
  it('navigates to /login when idToken is null', () => {
    renderWithAuth(null);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Private')).toBeNull();
  });

  it('renders children when idToken is present', () => {
    renderWithAuth('token');
    expect(screen.getByText('Private')).toBeInTheDocument();
  });
});
