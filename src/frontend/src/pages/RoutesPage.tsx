import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Flex,
  Text,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { GoogleMap, Marker, Polyline, useLoadScript } from '@react-google-maps/api';
import { FaLocationArrow } from 'react-icons/fa';
import { api } from '../services/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '16px' };
const center = { lat: 41.3851, lng: 2.1734 };

/**
 * Convert a lat/lng object to the "lat,lng" string that the backend API expects.
 * We keep coordinates as objects for map interactions but serialize them when
 * sending requests.
 */
const toCoordinateString = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;

export default function RoutesPage() {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState('');
  const [maxDeltaKm, setMaxDeltaKm] = useState('');
  const [routesCount, setRoutesCount] = useState('');
  const [mode, setMode] = useState<'points' | 'distance'>('points');
  const [jobId, setJobId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const toast = useToast();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['geometry'],
  });

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (!origin) {
      setOrigin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    } else if (!destination && mode === 'points') {
      setDestination({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin) {
      toast({ title: 'Select an origin on the map.', status: 'warning' });
      return;
    }
    // Serialize coordinates for the backend. The API expects "lat,lng" strings
    // but we store them as objects while interacting with the map.
    const data = {
      origin: toCoordinateString(origin),
      destination:
        mode === 'points' && destination
          ? toCoordinateString(destination)
          : undefined,
      distanceKm: mode === 'distance' ? Number(distanceKm) : undefined,
      maxDeltaKm: maxDeltaKm ? Number(maxDeltaKm) : undefined,
      routesCount: routesCount ? Number(routesCount) : undefined,
    };
    try {
      const { data: resp } = await api.post('/routes', data);
      toast({ title: 'Route request submitted', status: 'success' });
      setJobId(resp.jobId);
      setRoutes([]);
      setLoadingRoutes(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({ title: 'Error requesting routes', status: 'error', description: message });
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const timer = setInterval(async () => {
      try {
        const { data } = await api.get(`/jobs/${jobId}/routes`);
        if (Array.isArray(data) && data.length > 0) {
          setRoutes(data);
          setLoadingRoutes(false);
          clearInterval(timer);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [jobId]);

  if (loadError) return <Box color="red.500">Map cannot be loaded right now.</Box>;
  if (!isLoaded) return <Flex justify="center" mt={12}><Spinner size="xl" /></Flex>;

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" py={10}>
      <Box
        maxW="1000px"
        w="full"
        bg="white"
        p={[4, 8]}
        mx="auto"
        display="flex"
        flexDirection="column"
        gap={6}
      >
        {/* Top controls */}
        <Stack direction="row" justify="center" spacing={2} mb={1}>
          <Button
            colorScheme={mode === 'points' ? 'orange' : 'gray'}
            variant={mode === 'points' ? 'solid' : 'ghost'}
            onClick={() => setMode('points')}
            size="sm"
            borderRadius="lg"
            fontWeight="semibold"
          >
            By Points
          </Button>
          <Button
            colorScheme={mode === 'distance' ? 'orange' : 'gray'}
            variant={mode === 'distance' ? 'solid' : 'ghost'}
            onClick={() => { setMode('distance'); setDestination(null); }}
            size="sm"
            borderRadius="lg"
            fontWeight="semibold"
          >
            By Distance
          </Button>
        </Stack>

        {/* Fields */}
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControl isRequired>
              <FormLabel fontWeight="bold">Origin</FormLabel>
              <Input
                placeholder="Select on map"
                value={origin ? `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}` : ''}
                readOnly
                bg={origin ? "orange.50" : "gray.50"}
              />
            </FormControl>
            {mode === 'points' && (
              <FormControl>
                <FormLabel fontWeight="bold">Destination</FormLabel>
                <Input
                  placeholder="Select on map"
                  value={destination ? `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}` : ''}
                  readOnly
                  bg={destination ? "orange.50" : "gray.50"}
                />
              </FormControl>
            )}
            {mode === 'distance' && (
              <FormControl>
                <FormLabel fontWeight="bold">Distance (km)</FormLabel>
                <Input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 5"
                  bg="gray.50"
                />
              </FormControl>
            )}
            <FormControl>
              <FormLabel fontWeight="bold">Max Delta Km</FormLabel>
              <Input
                type="number"
                value={maxDeltaKm}
                onChange={(e) => setMaxDeltaKm(e.target.value)}
                placeholder="e.g. 0.5"
                bg="gray.50"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontWeight="bold">Routes Count</FormLabel>
              <Input
                type="number"
                value={routesCount}
                onChange={(e) => setRoutesCount(e.target.value)}
                placeholder="e.g. 3"
                bg="gray.50"
              />
            </FormControl>
            <Button
              type="submit"
              colorScheme="orange"
              fontWeight="bold"
              size="lg"
              mt={2}
              leftIcon={<FaLocationArrow />}
            >
              Submit
            </Button>
          </Stack>
        </form>

        {/* Google Map inside card */}
        <Box mt={6} mb={2} borderRadius="xl" overflow="hidden" boxShadow="md">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={13}
            center={origin || center}
            onClick={handleMapClick}
          >
            {origin && <Marker position={origin} label="A" />}
            {mode === 'points' && destination && <Marker position={destination} label="B" />}
            {routes.map((r, idx) => (
              r.path ? (
                <Polyline
                  key={r.routeId}
                  path={google.maps.geometry.encoding.decodePath(r.path)}
                  options={{
                    strokeColor: ['#ff6f00', '#388e3c', '#1976d2'][idx % 3],
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              ) : null
            ))}
          </GoogleMap>
        </Box>
        <Text fontSize="sm" color="gray.500" mt={-1}>
          Click on the map to set {origin ? (mode === 'points' && !destination ? 'destination' : 'origin') : 'origin'}.
        </Text>
        {loadingRoutes && (
          <Flex justify="center" my={4}>
            <Spinner />
          </Flex>
        )}
        {routes.length > 0 && (
          <Stack spacing={3} mt={4}>
            {routes.map((r) => (
              <Box key={r.routeId} p={3} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold">Route {r.routeId}</Text>
                {r.distanceKm != null && (
                  <Text>Distance: {r.distanceKm.toFixed(2)} km</Text>
                )}
                {r.duration != null && (
                  <Text>Duration: {Math.round(r.duration / 60)} min</Text>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Flex>
  );
}
