import { createContext } from 'react';

export interface AuthContextType {
  idToken: string | null;
  refreshToken: string | null;
  setSession: (idToken: string, refreshToken: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  idToken: null,
  refreshToken: null,
  setSession: () => {},
  signOut: () => {},
});
