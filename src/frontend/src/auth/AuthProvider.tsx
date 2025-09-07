import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export let externalSetSession:
  | ((access: string, refresh: string) => void)
  | null = null;
export let externalSignOut: (() => void) | null = null;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem('refreshToken')
  );

  const setSession = (access: string, refresh: string) => {
    setAccessToken(access);
    setRefreshToken(refresh);
  };

  const signOut = () => {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  externalSetSession = setSession;
  externalSignOut = signOut;

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, [refreshToken]);

  return (
    <AuthContext.Provider
      value={{ accessToken, refreshToken, setSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
