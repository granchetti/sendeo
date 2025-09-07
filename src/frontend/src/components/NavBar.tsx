import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  Spacer,
  Link,
  Image,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import { FaUserCircle } from 'react-icons/fa';
import { useContext } from 'react';
import logoSrc from '../assets/logo.png';
import { AuthContext } from '../contexts/AuthContext';

const NavBar = () => {
  const { accessToken, signOut } = useContext(AuthContext);
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

          {!accessToken && (
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

          {accessToken && (
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="User menu"
                icon={<FaUserCircle />}
                variant="ghost"
                size="lg"
              />
              <MenuList>
                <MenuItem as={RouterLink} to="/profile">Profile Settings</MenuItem>
                <MenuItem as={RouterLink} to="/favourites">Favourite Routes</MenuItem>
                <MenuItem onClick={signOut}>Logout</MenuItem>
              </MenuList>
            </Menu>
          )}
        </HStack>
      </Flex>
    </Box>
    
  );
};

export default NavBar;
