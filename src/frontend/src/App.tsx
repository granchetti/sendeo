import { useContext } from 'react';
import { Link as RouterLink, Route, Routes } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  HStack,
  Spacer,
  Link,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';
import HomePage from './pages/HomePage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import { AuthContext } from './contexts/AuthContext';
import logoSrc from './assets/logo.png';

function App() {
  const { token, setToken } = useContext(AuthContext);
  const linkColor = useColorModeValue('gray.600', 'gray.300');
  const linkHover = useColorModeValue('brand.600', 'brand.400');

  return (
    <Box>
      {/* NAVBAR */}
      <Flex
        as="nav"
        px={{ base: 4, md: 8 }}
        py={3}
        align="center"
        borderBottom="1px"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <Box fontWeight="bold" color="brand.500">
          <Link as={RouterLink} to="/">
            <Image
              src={logoSrc}
              alt="Sendeo Logo"
              h={100}
              objectFit="contain"
            />
          </Link>
        </Box>

        <Spacer />

        <HStack spacing={6}>
          <Link
            as={RouterLink}
            to="/"
            _hover={{ color: linkHover }}
            color={linkColor}
          >
            Home
          </Link>

          {!token && (
            <>
              <Link
                as={RouterLink}
                to="/login"
                _hover={{ color: linkHover }}
                color={linkColor}
              >
                Login
              </Link>
              <Link
                as={RouterLink}
                to="/signup"
                _hover={{ color: linkHover }}
                color={linkColor}
              >
                Sign Up
              </Link>
            </>
          )}

          {token && (
            <Button
              size="sm"
              colorScheme="brand"
              variant="outline"
              onClick={() => setToken(null)}
            >
              Logout
            </Button>
          )}
        </HStack>
      </Flex>

      {/* RUTAS */}
      <Box as="main" p={{ base: 4, md: 8 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
