import { useContext, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaUserEdit } from 'react-icons/fa';
import { api } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

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
  const [form, setForm] = useState<UserProfileProps | null>(null);
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useContext(AuthContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const { data: profile, isLoading } = useQuery<UserProfileProps>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/v1/profile');
      return data;
    },
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

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

  const saveProfile = useMutation({
    mutationFn: (p: UserProfileProps) => api.put('/v1/profile', p),
    onSuccess: (_data, vars) => {
      qc.setQueryData(['profile'], vars);
      toast({
        title: 'Profile updated.',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/v1/profile'),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['profile'] });
      signOut();
      navigate('/login');
    },
  });

  const handleSave = () => {
    if (!form) return;
    saveProfile.mutate(form);
  };

  const handleDelete = () => {
    deleteAccount.mutate();
    onClose();
  };

  const hasChanged = JSON.stringify(profile) !== JSON.stringify(form);

  if (isLoading) {
    return (
      <Text textAlign="center" py={32}>
        Loading...
      </Text>
    );
  }

  return (
    <Box
      maxW="1000px"
      mx="auto"
      pt={12}
      pb={24}
      px={[2, 4, 8]}
      bg="white"
      borderRadius="md"
      boxShadow="lg"
    >
      <Heading size="xl" color="brand.800" textAlign="center" mb={10}>
        Profile Settings
      </Heading>
      <Box borderBottom="1px" borderColor="gray.200" mb={10} />
      <Flex align="center" gap={6} mb={8}>
        <Avatar
          size="xl"
          icon={<FaUserEdit fontSize="2.5rem" />}
          bg="brand.400"
          color="white"
        />
        <Box flex="1">
          <Heading size="md" mb={1}>
            {profile?.displayName && profile.displayName.trim() !== ''
              ? profile.displayName
              : profile?.email}
          </Heading>
          <Text color="gray.500" fontSize="md" mb={1}>
            {profile?.email}
          </Text>
        </Box>
      </Flex>

      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab _selected={{ color: 'brand.800', bg: 'gray.100' }}>Personal Info</Tab>
          <Tab _selected={{ color: 'brand.800', bg: 'gray.100' }}>Account</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Stack spacing={7} fontSize="md" mb={6} mt={4}>
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
              isLoading={saveProfile.isPending}
              isDisabled={!hasChanged || saveProfile.isPending}
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
            <Stack spacing={4} mt={4}>
              <Heading size="md" color="red.600">
                Delete Account
              </Heading>
              <Text color="gray.600">
                This action is permanent and will remove all your data.
              </Text>
              <Button
                colorScheme="red"
                alignSelf="start"
                onClick={onOpen}
                isLoading={deleteAccount.isPending}
              >
                Delete Account
              </Button>
            </Stack>

            <AlertDialog
              isOpen={isOpen}
              leastDestructiveRef={cancelRef}
              onClose={onClose}
            >
              <AlertDialogOverlay>
                <AlertDialogContent>
                  <AlertDialogHeader fontSize="lg" fontWeight="bold">
                    Delete Account
                  </AlertDialogHeader>

                  <AlertDialogBody>
                    Are you sure? You can't undo this action afterwards.
                  </AlertDialogBody>

                  <AlertDialogFooter>
                    <Button ref={cancelRef} onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      colorScheme="red"
                      onClick={handleDelete}
                      ml={3}
                      isLoading={deleteAccount.isPending}
                    >
                      Delete
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialogOverlay>
            </AlertDialog>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default UserProfilePage;
