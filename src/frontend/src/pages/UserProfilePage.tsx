import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Avatar,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stack,
  Flex,
  Input,
  Select,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FaUserEdit } from 'react-icons/fa';
import { api } from '../services/api';

export interface UserProfileProps {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  age?: number;
  unit?: 'km' | 'mi';
}

const distanceUnitOptions = [
  { label: 'Kilometers', value: 'km' },
  { label: 'Miles', value: 'mi' },
];

const UserProfilePage = () => {
  const [profile, setProfile] = useState<UserProfileProps | null>(null);
  const [form, setForm] = useState<UserProfileProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile');
        setProfile(data);
        setForm(data);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev!,
      [name]:
        name === 'age' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await api.put('/profile', form);
      setProfile(form);
      toast({
        title: 'Profile updated.',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = JSON.stringify(profile) !== JSON.stringify(form);

  if (loading) {
    return (
      <Text textAlign="center" py={32}>
        Loading...
      </Text>
    );
  }

  return (
    <Box maxW="1000px" mx="auto" pt={12} pb={24} px={[2, 4, 8]} bg="white">
      <Flex align="center" gap={6} mb={8}>
      <Avatar
        size="xl"
        icon={<FaUserEdit fontSize="2.5rem" />}
        bg="brand.600"
        color="white"
      />
      <Box flex="1">
        <Heading size="md" mb={1}>
        {profile?.displayName ||
          profile?.firstName + ' ' + profile?.lastName}
        </Heading>
        <Text color="gray.500" fontSize="md" mb={1}>
        {profile?.email}
        </Text>
      </Box>
      </Flex>

      <Tabs variant="enclosed" colorScheme="brand">
      <TabList>
        <Tab>Profile</Tab>
        <Tab>Settings</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
        <Heading size="sm" mb={6} mt={4}>
          Personal Info
        </Heading>
        <Stack spacing={7} fontSize="md">
          {[
          { label: 'Display Name', field: 'displayName', type: 'text' },
          { label: 'First Name', field: 'firstName', type: 'text' },
          { label: 'Last Name', field: 'lastName', type: 'text' },
          {
            label: 'Email',
            field: 'email',
            type: 'text',
            readonly: true,
          },
          { label: 'Age', field: 'age', type: 'number' },
          { label: 'Distance Unit', field: 'unit', type: 'select' },
          ].map(({ label, field, type, readonly }) => (
          <Box key={field as string}>
            <Text
            mb={2}
            fontWeight="semibold"
            color="gray.600"
            fontSize="sm"
            >
            {label}
            </Text>
            {type === 'select' ? (
            <Select
              name={field}
              value={form?.[field as keyof UserProfileProps] ?? ''}
              onChange={handleChange}
              maxW="full"
              bg="gray.50"
              color="darkGreen.900"
              fontSize="md"
              isDisabled={readonly}
            >
              {distanceUnitOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
              ))}
            </Select>
            ) : (
            <Input
              name={field}
              type={type}
              value={form?.[field as keyof UserProfileProps] ?? ''}
              onChange={handleChange}
              maxW="full"
              bg="gray.50"
              color={readonly ? 'gray.500' : 'darkGreen.900'}
              fontSize="md"
              isReadOnly={!!readonly}
            />
            )}
          </Box>
          ))}
        </Stack>
        <Button
          mt={10}
          colorScheme="brand"
          bg="brand.800"
          color="white"
          size="lg"
          fontSize="lg"
          px={12}
          py={6}
          fontWeight="bold"
          letterSpacing="wide"
          shadow="md"
          onClick={handleSave}
          isLoading={saving}
          isDisabled={!hasChanged || saving}
          _hover={{
          bg: 'brand.900',
          transform: 'scale(1.04)',
          boxShadow: '0 0 24px lime.100',
          }}
        >
          Save
        </Button>
        </TabPanel>
        <TabPanel>
        <Heading size="sm" mb={6} mt={4}>
          Settings
        </Heading>
        <Text color="gray.400">...future settings here...</Text>
        </TabPanel>
      </TabPanels>
      </Tabs>
    </Box>
  );
};

export default UserProfilePage;
