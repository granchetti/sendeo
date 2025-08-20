import { useState } from 'react';
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
import { signUp } from '../../auth/cognito';

interface Props {
  onSuccess?: (needsConfirmation: boolean) => void;
}

const SignupForm: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      const stage = import.meta.env.VITE_STAGE ?? 'dev';
      const needsConfirmation = stage === 'prod';
      toast({
        title: needsConfirmation
          ? 'Check your email for a confirmation code'
          : 'Account created! You can log in now.',
        status: 'success',
      });
      onSuccess?.(needsConfirmation);
    } catch (err) {
      toast({
        title: 'Sign up error',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
      });
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
              autoComplete="new-password"
              bg="gray.50"
            />
          </InputGroup>
        </FormControl>
        <Button type="submit" colorScheme="orange" size="lg" fontWeight="bold" mt={2}>
          Sign Up
        </Button>
        <Text fontSize="sm" color="gray.600">
          Already have an account?{' '}
          <Link color="brand.700" fontWeight="bold" href="/login">
            Login
          </Link>
        </Text>
      </Stack>
    </form>
  );
};

export default SignupForm;
