import { useContext } from 'react';
import { Box } from '@chakra-ui/react';
import {
  HeroSection,
  HowItWorks,
  Benefits,
  FinalCTA,
} from '../components/home';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const HomePage = () => {
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(accessToken ? '/routes' : '/login');
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, lime.100 0%, brand.300 100%)"
      position="relative"
      overflow="hidden"
      boxShadow="2xl"
      borderWidth={2}
      borderColor="brand.400"
    >
      <HeroSection onStart={handleStart} />
      <HowItWorks />
      <Benefits />
      <FinalCTA onStart={handleStart} />
    </Box>
  );
};

export default HomePage;
