import { Box, Container, Heading, SimpleGrid, Icon, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaRoute, FaLeaf, FaMapMarkedAlt, FaWalking } from 'react-icons/fa';
import React from 'react';

const MotionBox = motion(Box);

const HowItWorks: React.FC = () => {
  return (
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
  );
};

export default HowItWorks;
