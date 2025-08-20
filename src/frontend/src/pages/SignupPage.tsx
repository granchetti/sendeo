import { Box, Heading, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import SignupForm from '../components/auth/SignupForm';

const SignupPage = () => {
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
          Create your account
        </Heading>
        <Text mb={8} color="gray.500" textAlign="center">
          Join Sendeo to start discovering new routes!
        </Text>
        <SignupForm
          onSuccess={(needsConfirmation, email) =>
            navigate(needsConfirmation ? '/confirm-signup' : '/login', {
              state: needsConfirmation
                ? { emailPrefill: email }
                : undefined,
            })
          }
        />
      </Box>
    </Box>
  );
};

export default SignupPage;
