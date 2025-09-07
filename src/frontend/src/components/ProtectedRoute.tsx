import { useContext, type JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken } = useContext(AuthContext);
  if (!accessToken) {
    return <Navigate to="/login" />;
  }
  return children;
};

export default ProtectedRoute;
