import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export let externalSetSession: ((id: string, refresh: string) => void) | null =
  null;
export let externalSignOut: (() => void) | null = null;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [idToken, setIdToken] = useState<string | null>(
    () => localStorage.getItem('idToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem('refreshToken')
  );

  const setSession = (id: string, refresh: string) => {
    setIdToken(id);
    setRefreshToken(refresh);
  };

  const signOut = () => {
    setIdToken(null);
    setRefreshToken(null);
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
  };

  externalSetSession = setSession;
  externalSignOut = signOut;

  useEffect(() => {
    if (idToken) {
      localStorage.setItem('idToken', idToken);
    } else {
      localStorage.removeItem('idToken');
    }
  }, [idToken]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  return (
    <AuthContext.Provider
      value={{ idToken, refreshToken, setSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
