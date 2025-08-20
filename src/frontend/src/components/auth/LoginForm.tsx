import { useState, useContext } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Stack,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Text,
  useToast,
} from '@chakra-ui/react';
import { AtSignIcon, LockIcon } from '@chakra-ui/icons';
import { signIn, forgotPassword } from '../../auth/cognito';
import { AuthContext } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface Props {
  onSuccess?: () => void;
}

const LoginForm: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { setSession } = useContext(AuthContext);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotMode) {
      try {
        await forgotPassword(email);
        setForgotSent(true);
        toast({
          title: 'Check your email for reset instructions',
          status: 'info',
        });
      } catch {
        toast({
          title: 'Error',
          description: 'Could not send reset email',
          status: 'error',
        });
      }
      return;
    }
    try {
      const session = await signIn(email, password);
      const id = session.getIdToken().getJwtToken();
      const refresh = session.getRefreshToken().getToken();
      localStorage.setItem('idToken', id);
      localStorage.setItem('refreshToken', refresh);
      setSession(id, refresh);
      await api.put(
        '/profile',
        { email },
        {
          headers: { Authorization: `Bearer ${id}` },
        },
      );
      onSuccess?.();
    } catch {
      toast({ title: 'Invalid email or password', status: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={5}>
        <FormControl isRequired>
          <FormLabel>Email</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <AtSignIcon color="gray.300" />
            </InputLeftElement>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              bg="gray.50"
            />
          </InputGroup>
        </FormControl>
        {!forgotMode && (
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <LockIcon color="gray.300" />
              </InputLeftElement>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                bg="gray.50"
              />
            </InputGroup>
          </FormControl>
        )}
        <Button type="submit" colorScheme="orange" size="lg" fontWeight="bold" mt={2}>
          {forgotMode ? 'Send Reset Link' : 'Login'}
        </Button>
        <Stack direction="row" justify="space-between" align="center">
          <Link
            color="brand.700"
            fontSize="sm"
            onClick={() => {
              setForgotMode(!forgotMode);
              setForgotSent(false);
            }}
          >
            {forgotMode ? 'Back to login' : 'Forgot password?'}
          </Link>
          <Text fontSize="sm">
            No account?{' '}
            <Link color="brand.700" fontWeight="bold" href="/signup">
              Register
            </Link>
          </Text>
        </Stack>
        {forgotSent && (
          <Text mt={4} fontSize="sm" color="green.600">
            Check your email for reset instructions!
          </Text>
        )}
      </Stack>
    </form>
  );
};

export default LoginForm;
