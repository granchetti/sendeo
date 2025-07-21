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
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const MotionCircle = motion(Circle);

const HomePage = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(token ? '/routes' : '/login');
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, lime.50, lime.100)"
      position="relative"
      overflow="hidden"
    >

      <MotionCircle
        size="600px"
        bg="darkGreen.200"
        opacity={0.3}
        position="absolute"
        top="-250px"
        left="-250px"
        animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <MotionCircle
        size="500px"
        bg="darkGreen.500"
        opacity={0.3}
        position="absolute"
        bottom="-200px"
        right="-200px"
        animate={{ x: [0, -15, 0], y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Container maxW="container.xl" py={20}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={8}
        >
          <Stack spacing={8} flex="1">

            <Heading as="h1" size="2xl" color="brand.500">
              Welcome to Sendeo
            </Heading>
            <Text fontSize="xl" color="gray.700">
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
      </Container>
    </Box>
  );
};

export default HomePage;
