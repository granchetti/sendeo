import { Box, Button, Container, Flex, Heading, Text, Stack, Image } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaRoute } from 'react-icons/fa';
import React from 'react';

const MotionBox = motion(Box);

interface HeroSectionProps {
  onStart: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart }) => {
  return (
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
            Discover <b>personalized walking routes</b> through city and nature, just
            for you.
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
            onClick={onStart}
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
  );
};

export default HeroSection;
