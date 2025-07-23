import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Spinner,
} from '@chakra-ui/react';
import { api } from '../services/api';

const FavouritesPage = () => {
  const [, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavs = async () => {
      try {
        const { data } = await api.get('/favourites');
        setFavourites(data.favourites || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavs();
  }, []);

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
    </Box>
  );
};

export default FavouritesPage;

