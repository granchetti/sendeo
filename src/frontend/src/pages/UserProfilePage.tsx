import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Stack,
  Avatar,
  Flex,
  Icon,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FaUserCircle } from 'react-icons/fa';
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
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile');
        setProfile(data);
        setError(false);
      } catch {
        setError(true);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Flex minH="50vh" align="center" justify="center">
        <Spinner size="xl" color="brand.800" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box maxW="md" mx="auto" mt={14} p={6}>
        <Alert status="error" variant="left-accent" borderRadius="lg">
          <AlertIcon />
          Failed to load profile information. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box maxW="md" mx="auto" mt={14} p={6}>
        <Alert status="info" variant="left-accent" borderRadius="lg">
          <AlertIcon />
          Profile not found.
        </Alert>
      </Box>
    );
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (profile.displayName) return profile.displayName[0];
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`;
    }
    return profile.email[0];
  };

  return (
    <Flex align="center" justify="center" minH="70vh" bg="brand.50">
      <Box
        w="100%"
        maxW="md"
        bg="white"
        borderRadius="2xl"
        boxShadow="lg"
        p={{ base: 6, md: 8 }}
      >
        <Flex direction="column" align="center" mb={4}>
          <Avatar
            size="xl"
            bg="brand.700"
            color="white"
            name={profile.displayName || profile.firstName || profile.email}
            icon={<Icon as={FaUserCircle} boxSize={14} />}
            mb={2}
          >
            {getInitials()}
          </Avatar>
          <Heading size="lg" color="brand.700" mb={1}>
            {profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User'}
          </Heading>
          <Text color="darkGreen.700">{profile.email}</Text>
        </Flex>

        <Divider my={4} borderColor="brand.100" />

        <Stack spacing={3} px={2}>
          {profile.firstName && (
            <Flex>
              <Text w={28} color="brand.600" fontWeight="bold">
                First Name:
              </Text>
              <Text color="darkGreen.900">{profile.firstName}</Text>
            </Flex>
          )}
          {profile.lastName && (
            <Flex>
              <Text w={28} color="brand.600" fontWeight="bold">
                Last Name:
              </Text>
              <Text color="darkGreen.900">{profile.lastName}</Text>
            </Flex>
          )}
          {profile.age != null && (
            <Flex>
              <Text w={28} color="brand.600" fontWeight="bold">
                Age:
              </Text>
              <Text color="darkGreen.900">{profile.age}</Text>
            </Flex>
          )}
          {profile.unit && (
            <Flex>
              <Text w={28} color="brand.600" fontWeight="bold">
                Unit:
              </Text>
              <Text color="darkGreen.900">{profile.unit}</Text>
            </Flex>
          )}
        </Stack>
      </Box>
    </Flex>
  );
};

export default UserProfilePage;
