import { useEffect, useState } from "react";
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
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { FaEdit, FaCheck, FaTimes, FaUserEdit } from "react-icons/fa";
import { api } from "../services/api";

export interface UserProfileProps {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  age?: number;
  unit?: "km" | "mi";
}

const distanceUnitOptions = [
  { label: "Kilometers", value: "km" },
  { label: "Miles", value: "mi" },
];

const UserProfilePage = () => {
  const [profile, setProfile] = useState<UserProfileProps | null>(null);
  const [editField, setEditField] = useState<keyof UserProfileProps | null>(null);
  const [editValue, setEditValue] = useState<string | number>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/profile");
        setProfile(data);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const startEdit = (field: keyof UserProfileProps) => {
    setEditField(field);
    setEditValue(profile?.[field] ?? "");
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!profile || editField === null) return;
    const updated = { ...profile, [editField]: editField === "age" ? Number(editValue) : editValue };
    setSaving(true);
    try {
      await api.put("/profile", updated);
      setProfile(updated);
      toast({
        title: "Profile updated.",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setSaving(false);
      setEditField(null);
    }
  };

  if (loading) {
    return (
      <Text textAlign="center" py={32}>
        Loading...
      </Text>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" pt={12} pb={24} px={4}>
      <Flex align="center" gap={6}>
        <Avatar
          size="xl"
          icon={<FaUserEdit fontSize="2.5rem" />}
          bg="brand.600"
          color="white"
        />
        <Box flex="1">
          <Heading size="md" mb={1}>
            {profile?.displayName ||
              profile?.firstName + " " + profile?.lastName}
          </Heading>
          <Text color="gray.500" fontSize="md" mb={1}>
            {profile?.email}
          </Text>
        </Box>
      </Flex>

      <Tabs variant="enclosed" mt={10} colorScheme="brand">
        <TabList>
          <Tab>Profile</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Heading size="sm" mb={6} mt={4}>
              Personal Info
            </Heading>
            <Stack spacing={4} fontSize="md">
              {[
                {
                  label: "Display Name",
                  field: "displayName",
                  type: "text",
                },
                {
                  label: "First Name",
                  field: "firstName",
                  type: "text",
                },
                {
                  label: "Last Name",
                  field: "lastName",
                  type: "text",
                },
                {
                  label: "Email",
                  field: "email",
                  type: "text",
                  readonly: true,
                },
                {
                  label: "Age",
                  field: "age",
                  type: "number",
                },
                {
                  label: "Distance Unit",
                  field: "unit",
                  type: "select",
                },
              ].map(({ label, field, type, readonly }) => (
                <Flex key={field as string} align="center">
                  <Box w={44} fontWeight="semibold" color="gray.600">
                    {label}
                  </Box>
                  {editField === field ? (
                    <>
                      {type === "select" ? (
                        <Select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          size="sm"
                          maxW={48}
                          isDisabled={saving}
                        >
                          {distanceUnitOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={editValue}
                          type={type}
                          size="sm"
                          maxW={48}
                          onChange={(e) => setEditValue(e.target.value)}
                          isDisabled={saving}
                        />
                      )}
                      <IconButton
                        aria-label="Save"
                        icon={<FaCheck />}
                        colorScheme="green"
                        size="sm"
                        ml={2}
                        isLoading={saving}
                        onClick={saveEdit}
                      />
                      <IconButton
                        aria-label="Cancel"
                        icon={<FaTimes />}
                        size="sm"
                        ml={1}
                        onClick={cancelEdit}
                        isDisabled={saving}
                      />
                    </>
                  ) : (
                    <Flex align="center" gap={2}>
                      <Text color={readonly ? "gray.500" : "darkGreen.900"}>
                        {type === "select"
                          ? profile?.[field as keyof UserProfileProps] === "km"
                            ? "Kilometers"
                            : profile?.[field as keyof UserProfileProps] === "mi"
                            ? "Miles"
                            : "—"
                          : profile?.[field as keyof UserProfileProps] ?? <span style={{ color: "#aaa" }}>—</span>}
                      </Text>
                      {!readonly && (
                        <IconButton
                          aria-label="Edit"
                          icon={<FaEdit />}
                          size="xs"
                          variant="ghost"
                          color="brand.700"
                          onClick={() => startEdit(field as keyof UserProfileProps)}
                        />
                      )}
                    </Flex>
                  )}
                </Flex>
              ))}
            </Stack>
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
