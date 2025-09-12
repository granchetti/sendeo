import { useState, type ReactNode } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  setSession as storeSetSession,
  clearSession as storeClearSession,
  getIdToken,
  getRefreshToken,
} from './sessionStore';

export let externalSetSession: ((id: string, refresh: string) => void) | null =
  null;
export let externalSignOut: (() => void) | null = null;


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [idToken, setIdToken] = useState<string | null>(() => getIdToken());
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    getRefreshToken(),
  );

  const setSession = (id: string, refresh: string) => {
    setIdToken(id);
    setRefreshToken(refresh);
    storeSetSession(id, refresh);
  };

  const signOut = () => {
    setIdToken(null);
    setRefreshToken(null);
    storeClearSession();
  };

  externalSetSession = setSession;
  externalSignOut = signOut;

  return (
    <AuthContext.Provider
      value={{ idToken, refreshToken, setSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
