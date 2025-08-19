import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  InputGroup,
  InputLeftElement,
  Link,
  useToast,
} from '@chakra-ui/react';
import { AtSignIcon, LockIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../auth/cognito';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      const stage = import.meta.env.VITE_STAGE ?? 'dev';
      if (stage !== 'prod') {
        toast({
          title: 'Account created! You can log in now.',
          status: 'success',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Check your email for a confirmation code',
          status: 'success',
        });
        navigate('/confirm-signup');
      }
    } catch (err) {
      toast({
        title: 'Sign up error',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
      });
    }
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgGradient="linear(to-br, brand.50, lime.150)"
    >
      <Box
        w="100%"
        maxW="710px"
        mx="auto"
        p={10}
        bg="white"
        minH="600px"
        borderRadius="md"
        boxShadow="lg"
      >
        <Heading mb={2} size="xl" color="brand.700" textAlign="center">
          Create your account
        </Heading>
        <Text mb={8} color="gray.500" textAlign="center">
          Join Sendeo to start discovering new routes!
        </Text>
        <form onSubmit={handleSubmit}>
          <Stack spacing={5}>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <InputGroup>
                <InputLeftElement
                  pointerEvents="none"
                  children={<AtSignIcon color="gray.300" />}
                />
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
                <InputLeftElement
                  pointerEvents="none"
                  children={<LockIcon color="gray.300" />}
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  bg="gray.50"
                />
              </InputGroup>
            </FormControl>
            <Button
              type="submit"
              colorScheme="orange"
              size="lg"
              fontWeight="bold"
              mt={2}
            >
              Sign Up
            </Button>
          </Stack>
        </form>
        <Text mt={4} fontSize="sm" color="gray.600">
          Already have an account?{' '}
          <Link color="brand.700" fontWeight="bold" href="/login">
            Login
          </Link>
        </Text>
      </Box>
    </Box>
  );
};

export default SignupPage;
