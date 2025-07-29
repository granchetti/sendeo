import { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Stack,
  Spinner,
  HStack,
  IconButton,
  Divider,
  useToast,
} from '@chakra-ui/react';
import { FaTrash, FaStar } from 'react-icons/fa';
import { api } from '../services/api';

interface RouteDetails {
  routeId: string;
  distanceKm?: number;
  duration?: number;
}

const FavouritesPage = () => {
  const [favourites, setFavourites] = useState<RouteDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchFavs = async () => {
      try {
        const { data } = await api.get('/favourites');
        const ids: string[] = data.favourites || [];
        const details: RouteDetails[] = await Promise.all(
          ids.map(async (id: string) => {
            try {
              const { data } = await api.get(`/routes/${id}`);
              return data as RouteDetails;
            } catch {
              return { routeId: id };
            }
          }),
        );
        setFavourites(details);
      } catch (err) {
        console.error(err);
        toast({ title: 'Error loading favourites', status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchFavs();
  }, [toast]);

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/favourites/${id}`);
      setFavourites((prev) => prev.filter((f) => f.routeId !== id));
      toast({ title: 'Route removed from favourites', status: 'info' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not remove route', status: 'error' });
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, brand.50, lime.150)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
    >
      <Box
        w={['90%', '900px']}
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        p={{ base: 6, md: 10 }}
      >
        {/* Header */}
        <HStack spacing={3} mb={4} justify="center">
          <FaStar color="#ED8936" size="24" />
          <Heading size="xl" color="brand.700">
            Favourite Routes
          </Heading>
        </HStack>
        <Divider mb={6} />

        {/* Content */}
        {loading ? (
          <Flex justify="center" py={10}>
            <Spinner size="xl" />
          </Flex>
        ) : favourites.length === 0 ? (
          <Text textAlign="center" color="gray.500" fontSize="lg">
            You have no favourite routes yet.
          </Text>
        ) : (
          <Stack spacing={4}>
            {favourites.map((f) => (
              <Flex
                key={f.routeId}
                p={4}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                align="center"
                justify="space-between"
              >
                <Box>
                  <Text fontWeight="bold" color="gray.700">
                    {f.routeId}
                  </Text>
                  {f.distanceKm !== undefined && (
                    <Text fontSize="sm" color="gray.600">
                      Distance: {f.distanceKm.toFixed(2)} km
                    </Text>
                  )}
                </Box>
                <IconButton
                  aria-label="Remove favourite"
                  icon={<FaTrash />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleRemove(f.routeId)}
                />
              </Flex>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default FavouritesPage;
