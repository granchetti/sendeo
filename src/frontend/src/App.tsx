import { useContext } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Box, Button, HStack } from '@chakra-ui/react';
import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import { AuthContext } from './auth/AuthContext';

function App() {
  const { token, setToken } = useContext(AuthContext);

  return (
    <Box p={4}>
      <HStack spacing={4} mb={4}>
        <Link to="/">Home</Link>
        {!token && <Link to="/login">Login</Link>}
        {!token && <Link to="/signup">Sign Up</Link>}
        {token && <Button size="sm" onClick={() => setToken(null)}>Logout</Button>}
      </HStack>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Box>
  );
}

export default App;
