import { Box, Heading } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import ConfirmSignupForm from '../components/auth/ConfirmSignupForm';

const ConfirmSignupPage = () => {
  const navigate = useNavigate();

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Confirm Sign Up</Heading>
      <ConfirmSignupForm onSuccess={() => navigate('/login')} />
    </Box>
  );
};

export default ConfirmSignupPage;
