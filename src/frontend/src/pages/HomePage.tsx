import { useContext } from 'react';
import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import '../App.css';

const HomePage = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStart = () => {
    if (token) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <Box textAlign="center" py={20}>
      <Heading mb={4}>Welcome to Sendeo</Heading>
      <Text mb={8}>Manage your deliveries with ease.</Text>
      <Button colorScheme="blue" size="lg" onClick={handleStart}>
        Start Now
      </Button>
    </Box>
  );
};

export default HomePage;
