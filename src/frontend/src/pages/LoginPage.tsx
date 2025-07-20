import { useState, useContext } from 'react';
import { Box, Button, FormControl, FormLabel, Heading, Input, Stack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../auth/cognito';
import { AuthContext } from '../auth/AuthContext';
import { api } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await signIn(email, password);
      setToken(token);
      await api.get('/profile');
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Error signing in');
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Login</Heading>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormControl>
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormControl>
          <Button type="submit" colorScheme="blue">Login</Button>
        </Stack>
      </form>
    </Box>
  );
};

export default LoginPage;
