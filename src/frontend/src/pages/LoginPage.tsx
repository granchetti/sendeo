import { useState, useContext } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../auth/cognito';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';

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
      localStorage.setItem('token', token);
      //await api.get('/profile');
      navigate('/routes');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          alert('Invalid email or password');
        } else {
          console.error(err);
          alert('An unexpected error occurred');
        }
      } else if (err instanceof Error) {
        console.error(err);
        alert(err.message);
      } else {
        console.error(err);
        alert('Error signing in');
      }
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Login</Heading>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormControl>
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormControl>
          <Button type="submit" colorScheme="blue">
            Login
          </Button>
        </Stack>
      </form>
      <Text mt={4}>
        Haven’t you registered yet?{' '}
        <Link to="/signup">
          <b>
        <u>Register now</u>
          </b>
        </Link>
      </Text>
    </Box>
  );
};

export default LoginPage;
