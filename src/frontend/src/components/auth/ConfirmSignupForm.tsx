import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Stack,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Link,
  useToast,
} from '@chakra-ui/react';
import { AtSignIcon, LockIcon, RepeatIcon } from '@chakra-ui/icons';
import { confirmSignUp, resendConfirmationCode } from '../../auth/cognito';

interface Props {
  onSuccess?: () => void;
  initialEmail?: string;
}

const COOLDOWN_SECONDS = 30;

const ConfirmSignupForm: React.FC<Props> = ({ onSuccess, initialEmail }) => {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const toast = useToast();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const canResend = useMemo(
    () => !!email && !isResending && cooldown <= 0,
    [email, isResending, cooldown],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmSignUp(email, code);
      toast({
        title: 'Account confirmed! You can log in now.',
        status: 'success',
      });
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error confirming sign up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email to resend the code.');
      return;
    }
    setError(null);
    setIsResending(true);
    try {
      await resendConfirmationCode(email);
      toast({
        title: 'Confirmation code sent',
        description: `Check ${email}`,
        status: 'info',
      });
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err?.message ?? 'Could not resend the confirmation code');
    } finally {
      setIsResending(false);
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
          <FormLabel>Confirmation Code</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <LockIcon color="gray.300" />
            </InputLeftElement>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              bg="gray.50"
            />
          </InputGroup>
        </FormControl>

        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}

        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
          <Button
            type="submit"
            colorScheme="orange"
            size="lg"
            fontWeight="bold"
            isLoading={isSubmitting}
          >
            Confirm
          </Button>

          <Button
            onClick={handleResend}
            leftIcon={<RepeatIcon />}
            variant="outline"
            isLoading={isResending}
            isDisabled={!canResend}
            title={!email ? 'Enter your email first' : undefined}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </Button>
        </Stack>

        <Text fontSize="sm" color="gray.600">
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
