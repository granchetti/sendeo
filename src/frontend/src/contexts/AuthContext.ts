import { createContext } from 'react';

export interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (accessToken: string, refreshToken: string) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  refreshToken: null,
  setSession: () => {},
  signOut: () => {},
});
