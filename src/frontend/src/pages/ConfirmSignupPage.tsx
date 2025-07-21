import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { confirmSignUp } from '../auth/cognito';

const ConfirmSignupPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignUp(email, code);
      alert('Account confirmed. You can now log in.');
      navigate('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error confirming sign up');
      }
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Confirm Sign Up</Heading>
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
            <FormLabel>Confirmation Code</FormLabel>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </FormControl>
          <Button type="submit" colorScheme="blue">
            Confirm
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default ConfirmSignupPage;
