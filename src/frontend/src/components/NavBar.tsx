import { Flex, HStack, Link, Box, Button, Image, useColorModeValue } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import logoSrc from '../assets/logo.svg'

export const NavBar = () => {
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      as="nav"
      w="100%"
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      px={{ base: 4, md: 8 }}
      py={3}
    >
      <Flex maxW="7xl" mx="auto" align="center" justify="space-between">
        {/* Logo a la izquierda */}
        <Link as={RouterLink} to="/">
          <Image
            src={logoSrc}
            alt="Sendeo Logo"
            h={8}               
            objectFit="contain"
          />
        </Link>

        {/* Enlaces a la derecha */}
        <HStack spacing={6}>
          <Link as={RouterLink} to="/" _hover={{ color: 'brand.600' }}>
            Home
          </Link>
          <Link as={RouterLink} to="/login" _hover={{ color: 'brand.600' }}>
            Login
          </Link>
          <Button
            as={RouterLink}
            to="/signup"
            size="sm"
            colorScheme="brand"
            variant="solid"
          >
            Sign Up
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}
