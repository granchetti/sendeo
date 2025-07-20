import { createContext, useState, useEffect, ReactNode } from 'react';

export interface AuthContextType {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({ token: null, setToken: () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
};
