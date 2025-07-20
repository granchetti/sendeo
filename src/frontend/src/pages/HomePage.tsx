import { useContext } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Circle,
  Image,
} from '@chakra-ui/react';
import { FaRoute } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const HomePage = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(token ? '/routes' : '/login');
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, brand.50, brand.100)"
      position="relative"
      overflow="hidden"
    >
      {/* Formas decorativas */}
      <Circle
        size="600px"
        bg="blue.100"
        opacity={0.3}
        position="absolute"
        top="-200px"
        left="-200px"
      />
      <Circle
        size="400px"
        bg="teal.100"
        opacity={0.3}
        position="absolute"
        bottom="-150px"
        right="-150px"
      />

      <Container maxW="container.xl" py={20}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={8}
        >
          <Stack spacing={6} flex="1">
            <Heading
              as="h1"
              size="2xl"
              lineHeight="short"
              position="relative"
              zIndex={2}
            >
              <Text as="span" color="black">
              Welcome to Sendeo
              </Text>
            </Heading>
            <Text fontSize="xl" color="black">
              Find personalized routes tailored to you in just seconds.
            </Text>
            <Button
              colorScheme="orange"
              size="lg"
              leftIcon={<FaRoute />}
              onClick={handleStart}
              w={{ base: 'full', sm: 'auto' }}
            >
              Start Now
            </Button>
          </Stack>

          <Box flex="1" textAlign="center">
            <Image
              src="/undraw_adventure-map_3e4p.svg"
              alt="Delivery Illustration"
              mx="auto"
              maxW="300px"
            />
          </Box>
        </Flex>
      </Container>ac
    </Box>
  );
};

export default HomePage;
