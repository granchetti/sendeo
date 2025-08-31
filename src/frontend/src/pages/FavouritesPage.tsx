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
  useToast,
} from '@chakra-ui/react';
import { FaTrash, FaStar } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import polyline from '@mapbox/polyline';

interface RouteDetails {
  routeId: string;
  distanceKm?: number;
  duration?: number;
  description?: string;
  path?: string;
}

const COLORS = [
  '#ff6f00',
  '#40ad46ff',
  '#1976d2',
  '#d32f2f',
  '#a839e4ff',
  '#145f20ff',
  '#fcee31ff',
  '#49d4eaff',
  '#bf386eff',
  '#795130ff',
];
const ALIASES_KEY = 'sendeo:routeAliases';

const FavouritesPage = () => {
  const [favourites, setFavourites] = useState<RouteDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALIASES_KEY);
      if (raw) setAliases(JSON.parse(raw));
    } catch {}
  }, []);

  const saveAliases = (next: Record<string, string>) => {
    setAliases(next);
    try {
      localStorage.setItem(ALIASES_KEY, JSON.stringify(next));
    } catch {}
  };

  const setAlias = (routeId: string, name?: string) => {
    const next = { ...aliases };
    const val = (name ?? '').trim();
    if (val) next[routeId] = val;
    else delete next[routeId];
    saveAliases(next);
  };

  const promptRename = (routeId: string, currentLabel: string) => {
    const next = window.prompt('Route name', currentLabel);
    if (next !== null) setAlias(routeId, next);
  };

  const labelFromPath = (p?: string) => {
    if (!p) return null;
    try {
      const coords = polyline.decode(p);
      if (!coords.length) return null;
      const [lat1, lng1] = coords[0];
      const [lat2, lng2] = coords[coords.length - 1];
      const f = (n: number) => Number(n).toFixed(5);
      return `${f(lat1)}, ${f(lng1)} → ${f(lat2)}, ${f(lng2)}`;
    } catch {
      return null;
    }
  };

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
          <Heading size="xl" color="brand.800">
            Favourite Routes ({favourites.length}/10)
          </Heading>
        </HStack>
        <Box borderBottom="1px" borderColor="gray.200" mb={10} />

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
            {favourites.map((f, idx) => {
              const color = COLORS[idx % COLORS.length];
              const defaultTag = `Route ${idx + 1}`;
              const tagText = aliases[f.routeId] ?? defaultTag;
              const mainLabel = labelFromPath(f.path) ?? tagText;
              const short = `${f.routeId.slice(0, 8)}…`;

              return (
                <Box
                  key={f.routeId}
                  position="relative"
                  as="div"
                  role="button"
                  onClick={() =>
                    navigate(`/routes/${f.routeId}`, {
                      state: {
                        displayName: tagText,
                        labelLine: mainLabel,
                        idx,
                      },
                    })
                  }
                  textAlign="left"
                  w="100%"
                  borderWidth="1px"
                  borderColor="gray.200"
                  bg="white"
                  rounded="lg"
                  px={6}
                  py={4}
                  _hover={{ bg: 'gray.50' }}
                >
                  <HStack mb={2} spacing={3} align="center">
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="full"
                      bg={color}
                      border="1px solid rgba(0,0,0,0.2)"
                    />
                    <HStack
                      px={3}
                      py={1}
                      bg="gray.100"
                      rounded="md"
                      fontWeight="semibold"
                      color="gray.700"
                    >
                      <Text fontSize="xl">{tagText}</Text>
                      <IconButton
                        aria-label="Rename route"
                        icon={<MdEdit />}
                        size="xl"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptRename(f.routeId, tagText);
                        }}
                      />
                    </HStack>

                    <Text fontSize="xl" fontWeight="extrabold" color="gray.900">
                      {mainLabel}
                    </Text>
                  </HStack>

                  <HStack spacing={6}>
                    {typeof f.distanceKm === 'number' && (
                      <Text
                        fontSize="lg"
                        color="gray.700"
                        fontWeight="medium"
                        ml={6}
                      >
                        {f.distanceKm.toFixed(2)} km
                      </Text>
                    )}
                    {typeof f.duration === 'number' && (
                      <Text fontSize="lg" color="gray.700" fontWeight="medium">
                        {(f.duration / 60).toFixed(1)} min
                      </Text>
                    )}
                    <Text fontSize="lg" color="gray.500">
                      ID: {short}
                    </Text>
                  </HStack>

                  <IconButton
                    aria-label="Remove favourite"
                    icon={<FaTrash />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(f.routeId);
                    }}
                    position="absolute"
                    top="8px"
                    right="8px"
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default FavouritesPage;
