import { useContext } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Image,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FaRoute,
  FaWalking,
  FaLeaf,
  FaMapMarkedAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const MotionBox = motion(Box);

const HomePage = () => {
  const { idToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(idToken ? '/routes' : '/login');
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, lime.100 0%, brand.300 100%)"
      position="relative"
      overflow="hidden"
    >
      {/* HERO SECTION */}
      <Container maxW="container.lg" py={16}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          gap={12}
        >
          <Stack spacing={6} flex="1">
            <MotionBox
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, type: 'spring' }}
              mb={2}
            ></MotionBox>
            <Heading
              as="h1"
              size="2xl"
              color="darkGreen.700"
              letterSpacing="tight"
              lineHeight="1"
            >
              Welcome to Sendeo
            </Heading>
            <Text fontSize="lg" color="darkGreen.900">
              Discover <b>personalized walking routes</b> through city and
              nature, just for you.
            </Text>
            <Button
              bg="brand.800"
              color="white"
              _hover={{
                bg: 'brand.900',
                transform: 'scale(1.04)',
                boxShadow: '0 0 22px 4px lime.200',
              }}
              size="lg"
              leftIcon={<FaRoute />}
              onClick={handleStart}
              w={{ base: 'full', sm: 'auto' }}
              boxShadow="0 0 18px 2px brand.200"
              transition="all 0.3s"
            >
              Start Now
            </Button>
          </Stack>
          <MotionBox
            flex="1"
            textAlign="center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Image
              src="/undraw_adventure-map_3e4p.svg"
              alt="Map Illustration"
              mx="auto"
              maxW="330px"
              filter="drop-shadow(0 0 30px lime.200)"
              borderRadius="2xl"
            />
          </MotionBox>
        </Flex>
      </Container>

      {/* HOW IT WORKS */}
      <Box py={12} bg="brand.50">
        <Container maxW="container.lg">
          <Heading as="h2" size="lg" textAlign="center" mb={10} color="brand.700">
            How does Sendeo work?
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8}>
            <MotionBox
              p={6}
              borderRadius="2xl"
              bg="lime.50"
              boxShadow="lg"
              textAlign="center"
              whileHover={{ scale: 1.06, boxShadow: '0 0 24px lime.200' }}
              transition={{ duration: 0.25 }}
            >
              <Icon as={FaRoute} w={12} h={12} color="brand.600" mb={4} />
              <Heading size="md" mb={2}>
                Choose origin and destination
              </Heading>
              <Text fontSize="md" color="darkGreen.900">
                Or select how many kilometers you want to walk.
              </Text>
            </MotionBox>
            <MotionBox
              p={6}
              borderRadius="2xl"
              bg="lime.50"
              boxShadow="lg"
              textAlign="center"
              whileHover={{ scale: 1.06, boxShadow: '0 0 24px lime.200' }}
              transition={{ duration: 0.25 }}
            >
              <Icon as={FaLeaf} w={12} h={12} color="lime.500" mb={4} />
              <Heading size="md" mb={2}>
                Wait for your routes
              </Heading>
              <Text fontSize="md" color="darkGreen.900">
                We'll generate the best routes for you in just a few seconds.
              </Text>
            </MotionBox>
            <MotionBox
              p={6}
              borderRadius="2xl"
              bg="lime.50"
              boxShadow="lg"
              textAlign="center"
              whileHover={{ scale: 1.06, boxShadow: '0 0 24px lime.200' }}
              transition={{ duration: 0.25 }}
            >
              <Icon as={FaMapMarkedAlt} w={12} h={12} color="brand.300" mb={4} />
              <Heading size="md" mb={2}>
                Pick your favorite route
              </Heading>
              <Text fontSize="md" color="darkGreen.900">
                Compare the suggested options and select your favorite.
              </Text>
            </MotionBox>
            <MotionBox
              p={6}
              borderRadius="2xl"
              bg="lime.50"
              boxShadow="lg"
              textAlign="center"
              whileHover={{ scale: 1.06, boxShadow: '0 0 24px lime.200' }}
              transition={{ duration: 0.25 }}
            >
              <Icon as={FaWalking} w={12} h={12} color="brand.600" mb={4} />
              <Heading size="md" mb={2}>
                Start your walk!
              </Heading>
              <Text fontSize="md" color="darkGreen.900">
                Enjoy the journey and the Sendeo experience.
              </Text>
            </MotionBox>
          </SimpleGrid>
        </Container>
      </Box>

      {/* BENEFITS */}
      <Box py={16} bg="darkGreen.700">
        <Container maxW="container.lg">
          <Heading as="h2" size="lg" color="lime.200" textAlign="center" mb={8}>
            Why walk with Sendeo?
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {[
              {
                icon: FaWalking,
                iconColor: "brand.500",
                title: 'Healthy Lifestyle',
                desc: 'Walking is one of the best ways to improve your physical and mental health.',
              },
              {
                icon: FaLeaf,
                iconColor: "lime.400",
                title: 'Flexible & Personalized',
                desc: 'Choose routes based on your time, mood, or fitness goals—city, park, or nature.',
              },
              {
                icon: FaMapMarkedAlt,
                iconColor: "brand.400",
                title: 'Discover & Enjoy',
                desc: 'Find new places, enjoy fresh air, and turn every walk into a small adventure.',
              },
            ].map((benefit) => (
              <MotionBox
                key={benefit.title}
                p={6}
                borderRadius="2xl"
                bg="darkGreen.500"
                color="white"
                textAlign="center"
                boxShadow="lg"
                whileHover={{ scale: 1.06, boxShadow: '0 0 18px brand.300' }}
              >
                <Icon as={benefit.icon} w={12} h={12} color={benefit.iconColor} mb={4} />
                <Heading size="md" mb={2}>
                  {benefit.title}
                </Heading>
                <Text fontSize="md" color="gray.100">
                  {benefit.desc}
                </Text>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA FINAL */}
      <Container maxW="container.lg" py={16} textAlign="center">
        <MotionBox
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: 'spring' }}
        >
          <Heading size="xl" mb={8} color="brand.700">
            Ready to walk and explore?
          </Heading>
          <Button
            size="lg"
            bg="brand.800"
            color="white"
            _hover={{
              bg: 'brand.900',
              transform: 'scale(1.05)',
              boxShadow: '0 0 34px lime.200',
            }}
            leftIcon={<FaRoute />}
            px={10}
            onClick={handleStart}
            boxShadow="0 0 22px 2px brand.100"
          >
            Start your journey
          </Button>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default HomePage;
