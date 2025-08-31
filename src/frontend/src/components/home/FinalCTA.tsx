import { Container, Heading, Button, Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaRoute } from 'react-icons/fa';
import React from 'react';

const MotionBox = motion(Box);

interface FinalCTAProps {
  onStart: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onStart }) => {
  return (
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
          onClick={onStart}
          boxShadow="0 0 22px 2px brand.100"
        >
          Start your journey
        </Button>
      </MotionBox>
    </Container>
  );
};

export default FinalCTA;
