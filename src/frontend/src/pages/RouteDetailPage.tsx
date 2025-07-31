import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

interface RouteData {
  routeId: string;
  distanceKm?: number;
  duration?: number;
  path?: string;
}

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };

const RouteDetailPage = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  useEffect(() => {
    if (!routeId) return;
    (async () => {
      try {
        const { data } = await api.get(`/routes/${routeId}`);
        setRoute(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId]);

  const startRoute = async () => {
    if (!routeId) return;
    try {
      await api.post('/telemetry/started', { routeId });
      const id = navigator.geolocation.watchPosition(
        (pos) =>
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('watchPosition error', err),
      );
      setWatchId(id);
      setActive(true);
    } catch (err) {
      console.error(err);
    }
  };

  const finishRoute = async () => {
    if (!routeId) return;
    try {
      await api.post(`/routes/${routeId}/finish`);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setActive(false);
      setPosition(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  if (loadError)
    return <Text color="red.500">Map cannot be loaded right now.</Text>;

  if (!isLoaded || loading)
    return (
      <Flex justify="center" py={10}>
        <Spinner size="xl" />
      </Flex>
    );

  const path = route?.path
    ? google.maps.geometry.encoding
        .decodePath(route.path)
        .map((p) => ({ lat: p.lat(), lng: p.lng() }))
    : [];
  const center = path[Math.floor(path.length / 2)] || DEFAULT_CENTER;

  return (
    <Box py={8} minH="100vh" bg="gray.50">
      <Stack spacing={6} align="center">
        <Heading>Route {routeId}</Heading>
        <Box w={['90%', '800px']} h="500px">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={13}
          >
            {path.length > 0 && (
              <Polyline
                path={path}
                options={{ strokeColor: '#ff6f00', strokeOpacity: 1, strokeWeight: 4 }}
              />
            )}
            {position && <Marker position={position} label="You" />}
          </GoogleMap>
        </Box>
        <Stack direction="row" spacing={4}>
          {!active ? (
            <Button colorScheme="green" onClick={startRoute}>
              Start
            </Button>
          ) : (
            <Button colorScheme="red" onClick={finishRoute}>
              Finish
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default RouteDetailPage;
