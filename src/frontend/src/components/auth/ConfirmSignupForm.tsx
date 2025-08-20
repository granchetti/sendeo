import { useState } from 'react';
import { Button, FormControl, FormLabel, Stack, Input, Text, Link } from '@chakra-ui/react';
import { confirmSignUp } from '../../auth/cognito';

interface Props {
  onSuccess?: () => void;
}

const ConfirmSignupForm: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignUp(email, code);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error confirming sign up');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <FormControl>
          <FormLabel>Email</FormLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormControl>
        <FormControl>
          <FormLabel>Confirmation Code</FormLabel>
          <Input value={code} onChange={(e) => setCode(e.target.value)} required />
        </FormControl>
        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}
        <Button type="submit" colorScheme="blue">
          Confirm
        </Button>
        <Text fontSize="sm">
          Need an account?{' '}
          <Link color="brand.700" fontWeight="bold" href="/signup">
            Sign up
          </Link>
        </Text>
      </Stack>
    </form>
  );
};

export default ConfirmSignupForm;
