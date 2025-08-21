import { Box, Heading, Text } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmSignupForm from '../components/auth/ConfirmSignupForm';

const ConfirmSignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailPrefill = (location.state as any)?.emailPrefill as string | undefined;

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
        <Heading mb={2} size="xl" color="brand.800" textAlign="center">
          Confirm your account
        </Heading>
        <Text mb={8} color="gray.500" textAlign="center">
          Enter the code we sent to your email to finish setting up your account.
        </Text>

        <ConfirmSignupForm
          initialEmail={emailPrefill}
          onSuccess={() => navigate('/login')}
        />
      </Box>
    </Box>
  );
};

export default ConfirmSignupPage;
