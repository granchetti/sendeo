import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Stack,
} from '@chakra-ui/react';
import { api } from '../services/api';

interface Profile {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  age?: number;
  unit?: string;
}

const UserProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile');
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Box textAlign="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!profile) return null;

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Profile</Heading>
      <Stack spacing={2}>
        <Text>
          <b>Email:</b> {profile.email}
        </Text>
        {profile.displayName && (
          <Text>
            <b>Display Name:</b> {profile.displayName}
          </Text>
        )}
        {profile.firstName && (
          <Text>
            <b>First Name:</b> {profile.firstName}
          </Text>
        )}
        {profile.lastName && (
          <Text>
            <b>Last Name:</b> {profile.lastName}
          </Text>
        )}
        {profile.age != null && (
          <Text>
            <b>Age:</b> {profile.age}
          </Text>
        )}
        {profile.unit && (
          <Text>
            <b>Unit:</b> {profile.unit}
          </Text>
        )}
      </Stack>
    </Box>
  );
};

export default UserProfilePage;

