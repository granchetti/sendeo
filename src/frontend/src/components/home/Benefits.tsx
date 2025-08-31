import {
  Box,
  Container,
  SimpleGrid,
  Heading,
  Text,
  Stack,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FaRulerHorizontal,
  FaRoute,
  FaSyncAlt,
  FaInfoCircle,
  FaMapMarkedAlt,
  FaExclamationTriangle,
  FaLightbulb,
} from 'react-icons/fa';
import React from 'react';

const MotionBox = motion(Box);

const Benefits: React.FC = () => {
  return (
    <Box py={{ base: 12, md: 20 }} bg="darkGreen.800" position="relative">
      <Container maxW="container.lg">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={12} alignItems="center">
          <Box>
            <Heading as="h2" size="lg" color="white" mb={3}>
              Why people choose Sendeo
            </Heading>
            <Text color="gray.200" mb={6}>
              Not another map. Sendeo helps you walk more with routes that fit your day.
            </Text>
            <Stack spacing={4}>
              <HStack align="start" spacing={4}>
                <Icon as={FaRulerHorizontal} color="lime.300" boxSize={6} />
                <Box>
                  <Text fontWeight="bold" color="white">
                    Distance-first routes
                  </Text>
                  <Text color="gray.200">Set your kilometers—7 km, 10 km… you choose.</Text>
                </Box>
              </HStack>
              <HStack align="start" spacing={4}>
                <Icon as={FaRoute} color="lime.300" boxSize={6} />
                <Box>
                  <Text fontWeight="bold" color="white">
                    Everyday reliable
                  </Text>
                  <Text color="gray.200">Solid, repeatable paths for daily walks or runs.</Text>
                </Box>
              </HStack>
              <HStack align="start" spacing={4}>
                <Icon as={FaSyncAlt} color="lime.300" boxSize={6} />
                <Box>
                  <Text fontWeight="bold" color="white">
                    Loops & out-and-backs
                  </Text>
                  <Text color="gray.200">Neat loops or straight out-and-back options.</Text>
                </Box>
              </HStack>
            </Stack>
          </Box>
          <Box>
            <Heading as="h3" size="md" color="lime.200" mb={3}>
              What you get on each route (AI-generated)
            </Heading>
            <Text color="gray.200" mb={5}>
              After you pick a route with AI, you’ll see a short area brief so you know what to expect.
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <MotionBox
                p={5}
                borderRadius="xl"
                bg="darkGreen.600"
                color="white"
                whileHover={{ y: -4 }}
                boxShadow="lg"
              >
                <HStack spacing={3} mb={2}>
                  <Icon as={FaInfoCircle} color="lime.300" />
                  <Text fontWeight="bold">Overview</Text>
                </HStack>
                <Text color="gray.200" fontSize="sm">
                  Distance, time and vibe.
                </Text>
              </MotionBox>
              <MotionBox
                p={5}
                borderRadius="xl"
                bg="darkGreen.600"
                color="white"
                whileHover={{ y: -4 }}
                boxShadow="lg"
              >
                <HStack spacing={3} mb={2}>
                  <Icon as={FaMapMarkedAlt} color="lime.300" />
                  <Text fontWeight="bold">Points of Interest</Text>
                </HStack>
                <Text color="gray.200" fontSize="sm">
                  Up to 4 nearby highlights.
                </Text>
              </MotionBox>
              <MotionBox
                p={5}
                borderRadius="xl"
                bg="darkGreen.600"
                color="white"
                whileHover={{ y: -4 }}
                boxShadow="lg"
              >
                <HStack spacing={3} mb={2}>
                  <Icon as={FaExclamationTriangle} color="lime.300" />
                  <Text fontWeight="bold">Heads-up</Text>
                </HStack>
                <Text color="gray.200" fontSize="sm">
                  Surfaces, slopes and busy crossings.
                </Text>
              </MotionBox>
              <MotionBox
                p={5}
                borderRadius="xl"
                bg="darkGreen.600"
                color="white"
                whileHover={{ y: -4 }}
                boxShadow="lg"
              >
                <HStack spacing={3} mb={2}>
                  <Icon as={FaLightbulb} color="lime.300" />
                  <Text fontWeight="bold">Practical tips</Text>
                </HStack>
                <Text color="gray.200" fontSize="sm">
                  Water, shade, cafés and viewpoints.
                </Text>
              </MotionBox>
            </SimpleGrid>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Benefits;
