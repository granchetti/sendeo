import { Box, Heading, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const navigate = useNavigate();
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
          Sign in to Sendeo
        </Heading>
        <Text mb={8} color="gray.500" textAlign="center">
          Welcome back! Log in to start your next walk.
        </Text>
        <LoginForm onSuccess={() => navigate('/routes')} />
      </Box>
    </Box>
  );
};

export default LoginPage;
