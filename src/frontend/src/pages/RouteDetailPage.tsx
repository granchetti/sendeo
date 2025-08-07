import { useEffect, useState, useMemo, type JSX } from 'react';
import * as turf from '@turf/turf';
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Icon,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FaInfoCircle,
  FaMapMarkedAlt,
  FaLightbulb,
  FaExclamationTriangle,
} from 'react-icons/fa';

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };

export default function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  type Route = {
    routeId: string;
    path: string;
    description?: string;
  };

  type RouteSummary = {
    distanceKm?: number;
    duration?: number;
    actualDuration?: number;
    actualDistanceKm?: number;
  };

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [positions, setPositions] = useState<{ lat: number; lng: number }[]>(
    [],
  );

  const [summary, setSummary] = useState<RouteSummary | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  useEffect(() => {
    if (!routeId) return;
    api
      .get(`/routes/${routeId}`)
      .then(({ data }) => setRoute(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [routeId]);


  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  const path = useMemo(() => {
    return route?.path
      ? google.maps.geometry.encoding
          .decodePath(route.path)
          .map((p) => ({ lat: p.lat(), lng: p.lng() }))
      : [];
  }, [route?.path]);

  if (loadError) return <Text color="red.500">Map cannot load</Text>;
  if (!isLoaded || loading)
    return (
      <Flex justify="center" py={10}>
        <Spinner size="xl" />
      </Flex>
    );

  const center = path[Math.floor(path.length / 2)] || DEFAULT_CENTER;

  const handleStart = async () => {
    if (!routeId) return;
    try {
      await api.post('/telemetry/started', { routeId });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to start tracking', status: 'error' });
      return;
    }
    setPositions([]);
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };
    let started = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        setPositions((prev) => [...prev, coords]);
        if (!started) {
          started = true;
          setWatchId(id);
          toast({ title: 'Route started', status: 'success' });
        }
      },
      (err) => {
        toast({
          title: 'Failed to retrieve location',
          description: err.message,
          status: 'error',
        });
        navigator.geolocation.clearWatch(id);
        setWatchId(null);
        if (err.code === err.POSITION_UNAVAILABLE) {
          setPosition(DEFAULT_CENTER);
          toast({
            title: 'Location unavailable',
            description: 'Using default position',
            status: 'warning',
          });
        }
      },
      geoOptions,
    );
  };

  const handleFinish = async () => {
    if (!routeId) return;
    try {
      const { data } = await api.post(`/routes/${routeId}/finish`);
      // stop watcher
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setPosition(null);
      let actualDistanceKm: number | undefined;
      if (positions.length > 1) {
        const line = turf.lineString(
          positions.map((p) => [p.lng, p.lat]) as [number, number][],
        );
        actualDistanceKm = turf.length(line, { units: 'kilometers' });
      }
      setPositions([]);
      setSummary({
        ...data,
        ...(actualDistanceKm != null ? { actualDistanceKm } : {}),
      });
      onOpen();
      toast({ title: 'Route finished', status: 'success' });
    } catch (err: unknown) {
      console.error(err);
      toast({ title: 'Error finishing', status: 'error' });
    }
  };

  const isTracking = watchId !== null;

  const iconMap: Record<string, JSX.Element> = {
    Overview: <Icon as={FaInfoCircle} color="orange.500" mr={1} />,
    'Points of Interest': (
      <Icon as={FaMapMarkedAlt} color="orange.500" mr={1} />
    ),
    'Heads-up section': (
      <Icon as={FaExclamationTriangle} color="orange.500" mr={1} />
    ),
    'Practical tips': <Icon as={FaLightbulb} color="orange.500" mr={1} />,
    'Add an encouraging sentence': (
      <Icon as={FaInfoCircle} color="orange.500" mr={1} />
    ),
  };

  const MDcomponents = {
    h1: (props: React.ComponentProps<'h1'>) => (
      <Heading size="md" mt={6} mb={2} display="flex" alignItems="center">
        {props.children}
      </Heading>
    ),
    h2: (props: React.ComponentProps<'h2'>) => (
      <Heading size="sm" mt={4} mb={1} display="flex" alignItems="center">
        {props.children}
      </Heading>
    ),
    p: (props: React.ComponentProps<'p'>) => <Text mb={2} fontSize="md" {...props} />,
    strong: (props: React.ComponentProps<'strong'>) => {
      let raw = '';
      if (typeof props.children === 'string') {
        raw = props.children;
      } else if (Array.isArray(props.children) && typeof props.children[0] === 'string') {
        raw = props.children[0];
      }
      const label = raw.replace(/^\d+\.\s*/, '');
      return (
        <Text as="span" fontWeight="bold" display="flex" alignItems="center">
          {iconMap[label]}
          {props.children}
        </Text>
      );
    },
    ul: (props: React.ComponentProps<'ul'>) => (
      <ul style={{ paddingLeft: '1rem' }} {...props} />
    ),
    li: (props: React.ComponentProps<'li'>) => (
      <li style={{ marginLeft: '0.25rem', fontSize: '1rem', listStyleType: 'disc' }} {...props} />
    ),
  };

  return (
    <Box py={8} minH="100vh" bg="gray.50">
      <Stack spacing={6} align="center">
        <Heading color="orange.600">Route {routeId}</Heading>

        {route?.description && (
          <Accordion w={['90%', '900px']} defaultIndex={[0]} allowToggle>
            <AccordionItem borderRadius="lg" overflow="hidden">
              <h2>
                <AccordionButton _expanded={{ bg: 'orange.50' }} py={4}>
                  <Box flex="1" textAlign="left" fontWeight="bold">
                    About this walk
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} bg="white">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MDcomponents}
                >
                  {route.description ?? ''}
                </ReactMarkdown>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        )}

        <Box
          w={['90%', '900px']}
          h="700px"
          borderRadius="md"
          overflow="hidden"
          boxShadow="md"
        >
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '700px' }}
            center={center}
            zoom={14}
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

        <Button variant="link" onClick={() => navigate('/routes')}>
          ↩ Back to Routes
        </Button>
      </Stack>

      {/* Summary Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
                {summary.actualDistanceKm != null && (
                  <Text>
                    Actual Distance: {summary.actualDistanceKm.toFixed(2)} km
                  </Text>
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
