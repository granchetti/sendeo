import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };

export default function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  type Route = {
    id: string;
    path: string;
    // Add other route properties as needed
  };

  type RouteSummary = {
    distanceKm?: number;
    duration?: number;
    actualDuration?: number;
    // Add other summary properties as needed
  };
  
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [summary, setSummary] = useState<RouteSummary | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  // fetch route
  useEffect(() => {
    if (!routeId) return;
    api
      .get(`/routes/${routeId}`)
      .then(({ data }) => setRoute(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [routeId]);

  // cleanup geolocation watcher
  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  if (loadError) return <Text color="red.500">Map cannot load</Text>;
  if (!isLoaded || loading)
    return (
      <Flex justify="center" py={10}>
        <Spinner size="xl" />
      </Flex>
    );

  // decode polyline
  const path = route?.path
    ? google.maps.geometry.encoding
        .decodePath(route.path)
        .map((p) => ({ lat: p.lat(), lng: p.lng() }))
    : [];
  const center = path[Math.floor(path.length / 2)] || DEFAULT_CENTER;

  // Start tracking
  const handleStart = async () => {
    if (!routeId) return;
    try {
      await api.post('/telemetry/started', { routeId });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to start tracking', status: 'error' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
    );
    setWatchId(id);
    toast({ title: 'Route started', status: 'success' });
  };

  // Finish tracking
  const handleFinish = async () => {
    if (!routeId) return;
    try {
      const { data } = await api.post(`/routes/${routeId}/finish`);
      // stop watcher
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setPosition(null);
      setSummary(data);
      onOpen();
      toast({ title: 'Route finished', status: 'success' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Error finishing', status: 'error' });
    }
  };

  const isTracking = watchId !== null;

  return (
    <Box py={8} minH="100vh" bg="gray.50">
      <Stack spacing={6} align="center">
        <Heading>Route {routeId}</Heading>

        <Box w={['90%', '800px']} h="500px" borderRadius="md" overflow="hidden">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={13}
          >
            {path.length > 0 && (
              <Polyline
                path={path}
                options={{
                  strokeColor: '#ff6f00',
                  strokeOpacity: 1,
                  strokeWeight: 4,
                }}
              />
            )}
            {position && <Marker position={position} label="You" />}
          </GoogleMap>
        </Box>

        <Stack direction="row" spacing={4}>
          <Button
            colorScheme="green"
            onClick={handleStart}
            isDisabled={isTracking}
          >
            Start
          </Button>
          <Button
            colorScheme="red"
            onClick={handleFinish}
            isDisabled={!isTracking}
          >
            Finish
          </Button>
        </Stack>

        <Button variant="link" onClick={() => navigate('/')}>
          ← Back to Home
        </Button>
      </Stack>

      {/* Summary Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Route Summary</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {summary && (
              <Stack spacing={2}>
                {summary.distanceKm != null && (
                  <Text>Distance: {summary.distanceKm.toFixed(2)} km</Text>
                )}
                {summary.duration != null && (
                  <Text>Estimated Time: {summary.duration} s</Text>
                )}
                {summary.actualDuration != null && (
                  <Text>Actual Time: {summary.actualDuration} s</Text>
                )}
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
