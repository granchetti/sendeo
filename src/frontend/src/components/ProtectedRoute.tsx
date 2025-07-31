import { useContext, type JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { idToken } = useContext(AuthContext);
  if (!idToken) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default ProtectedRoute;
