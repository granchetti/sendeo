import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Spinner,
  Stack,
  Text,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { FaTrash } from 'react-icons/fa';
import { api } from '../services/api';

interface RouteDetails {
  routeId: string;
  distanceKm?: number;
  duration?: number;
}

const FavouritesPage = () => {
  const [favourites, setFavourites] = useState<RouteDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
          })
        );
        setFavourites(details);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavs();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/favourites/${id}`);
      setFavourites((prev) => prev.filter((f) => f.routeId !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Favourite Routes</Heading>
      {favourites.length === 0 ? (
        <Text>No favourites yet.</Text>
      ) : (
        <Stack spacing={3} mt={4}>
          {favourites.map((f) => (
            <Box key={f.routeId} p={2} borderWidth="1px" rounded="md">
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="bold">Route ID: {f.routeId}</Text>
                  {f.distanceKm !== undefined && (
                    <Text fontSize="sm" color="gray.600">
                      Distance: {f.distanceKm.toFixed(2)} km
                    </Text>
                  )}
                </Box>
                <IconButton
                  aria-label="Remove"
                  size="sm"
                  icon={<FaTrash />}
                  onClick={() => handleRemove(f.routeId)}
                />
              </HStack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default FavouritesPage;

