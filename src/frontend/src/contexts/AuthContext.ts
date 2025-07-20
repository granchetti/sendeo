// src/contexts/AuthContext.ts
import { createContext } from 'react';

export interface AuthContextType {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
});
