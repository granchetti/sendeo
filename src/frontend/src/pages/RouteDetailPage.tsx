import { useEffect, useState, useMemo, type JSX, Children } from 'react';
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
  Icon,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { useLoadScript } from '@react-google-maps/api';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import {
  FaInfoCircle,
  FaMapMarkedAlt,
  FaLightbulb,
  FaExclamationTriangle,
  FaStar,
  FaRegStar,
} from 'react-icons/fa';
import RouteDetailMap from '../components/route-detail/RouteDetailMap';
import RouteInfoAccordion from '../components/route-detail/RouteInfoAccordion';
import RouteActions from '../components/route-detail/RouteActions';
import { loadAliases, saveAliases } from '../utils/aliases';

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };
const MAX_FAVS = 10;
const COLORS = ['#ff6f00', '#388e3c', '#1976d2', '#d32f2f', '#a839e4ff'];

const isOnlyStrong = (children: React.ReactNode) => {
  const arr = Children.toArray(children);
  return arr.length === 1 && (arr[0] as any)?.type === 'strong';
};

type NavState = {
  displayName?: string;
  labelLine?: string;
  idx?: number;
  distanceKm?: number;
  duration?: number;
};

type Route = {
  routeId: string;
  path: string;
  description?: string;
  distanceKm?: number;
  duration?: number;
};

type RouteSummary = {
  distanceKm?: number;
  duration?: number;
  actualDuration?: number;
  actualDistanceKm?: number;
};

function shortId(id?: string) {
  return id ? `${id.slice(0, 8)}…` : '';
}
function pickColor(routeId?: string, idx?: number) {
  if (typeof idx === 'number') return COLORS[idx % COLORS.length];
  if (!routeId) return COLORS[0];
  let h = 0;
  for (let i = 0; i < routeId.length; i++)
    h = (h * 31 + routeId.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}
function fmt(n: number) {
  return Number(n).toFixed(5);
}

export default function RouteDetailPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const location = useLocation();
  const navState = (location.state as NavState) || {};
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [favCount, setFavCount] = useState<number>(0);
  const [aliases, setAliases] = useState<Record<string, string>>({});
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
    if (!routeId) return;
    (async () => {
      try {
        const { data } = await api.get('/favourites');
        const ids: string[] = data.favourites || [];
        setFavCount(ids.length);
        setIsFav(ids.includes(routeId));
      } catch {
        /* ignore */
      }
    })();
  }, [routeId]);

  useEffect(() => {
    setAliases(loadAliases());
  }, []);

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  const path = useMemo(() => {
    if (!isLoaded || !route?.path) return [];
    try {
      return google.maps.geometry.encoding
        .decodePath(route.path)
        .map((p) => ({ lat: p.lat(), lng: p.lng() }));
    } catch {
      return [];
    }
  }, [isLoaded, route?.path]);

  const uiDistanceKm =
    typeof route?.distanceKm === 'number'
      ? route.distanceKm
      : typeof navState.distanceKm === 'number'
      ? navState.distanceKm
      : undefined;

  const uiDuration =
    typeof route?.duration === 'number'
      ? route.duration
      : typeof navState.duration === 'number'
      ? navState.duration
      : undefined;

  const approxDistanceKm = useMemo(() => {
    if (typeof uiDistanceKm === 'number') return undefined;
    if (path.length > 1) {
      const line = turf.lineString(
        path.map((p) => [p.lng, p.lat]) as [number, number][],
      );
      return turf.length(line, { units: 'kilometers' });
    }
    return undefined;
  }, [uiDistanceKm, path]);
  
  if (loadError) return <Text color="red.500">Map cannot load</Text>;
  if (!isLoaded || loading)
    return (
      <Flex justify="center" py={10}>
        <Spinner size="xl" />
      </Flex>
    );

  const center = path[Math.floor(path.length / 2)] || DEFAULT_CENTER;

  const coordLabel =
    navState.labelLine ||
    (path.length > 1
      ? `${fmt(path[0].lat)}, ${fmt(path[0].lng)} → ${fmt(
          path[path.length - 1].lat,
        )}, ${fmt(path[path.length - 1].lng)}`
      : '');

  const tagText =
    (routeId && aliases[routeId]) ||
    navState.displayName ||
    (routeId ? `Route ${shortId(routeId)}` : 'Route');

  const dotColor = pickColor(routeId, navState.idx);

  const toggleFavourite = async () => {
    if (!routeId || favBusy) return;

    if (!isFav && favCount >= MAX_FAVS) {
      toast({
        title: 'Favourite limit reached',
        description: `You can save up to ${MAX_FAVS} routes. Remove one to add another.`,
        status: 'warning',
      });
      return;
    }

    setFavBusy(true);
    try {
      if (isFav) {
        await api.delete(`/favourites/${routeId}`);
        setIsFav(false);
        setFavCount((c) => Math.max(0, c - 1));
        toast({ title: 'Removed from favourites', status: 'info' });
      } else {
        await api.post('/favourites', { routeId });
        setIsFav(true);
        setFavCount((c) => c + 1);

        if (!aliases[routeId]) {
          const alias = tagText;
          const next = { ...aliases, [routeId]: alias };
          setAliases(next);
          saveAliases(next);
        }
        toast({ title: 'Added to favourites', status: 'success' });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Could not update favourites',
        status: 'error',
      });
    } finally {
      setFavBusy(false);
    }
  };

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

  // ---- Markdown + estilos de texto
  const iconMap: Record<string, JSX.Element> = {
    Overview: <Icon as={FaInfoCircle} color="orange.500" mr={2} />,
    'Points of Interest': (
      <Icon as={FaMapMarkedAlt} color="orange.500" mr={2} />
    ),
    'Heads-up section': (
      <Icon as={FaExclamationTriangle} color="orange.500" mr={2} />
    ),
    'Practical tips': <Icon as={FaLightbulb} color="orange.500" mr={2} />,
  };

  const MDcomponents = {
    h1: (props: React.ComponentProps<'h1'>) => (
      <Heading size="md" mt={8} mb={2} display="flex" alignItems="center">
        {props.children}
      </Heading>
    ),
    h2: (props: React.ComponentProps<'h2'>) => (
      <Heading size="sm" mt={6} mb={2} display="flex" alignItems="center">
        {props.children}
      </Heading>
    ),
    p: (props: React.ComponentProps<'p'>) => {
      const headingLine = isOnlyStrong(props.children);
      return (
        <Text
          fontSize={headingLine ? 'lg' : 'md'}
          fontWeight={headingLine ? 'bold' : 'normal'}
          mt={headingLine ? 6 : 0}
          mb={headingLine ? 1 : 3}
          lineHeight="1.6"
          {...props}
        />
      );
    },
    strong: (props: React.ComponentProps<'strong'>) => {
      let raw = '';
      if (typeof props.children === 'string') raw = props.children;
      else if (
        Array.isArray(props.children) &&
        typeof props.children[0] === 'string'
      )
        raw = props.children[0];

      const label = raw.replace(/^\d+\.\s*/, '').replace(/:\s*$/, '');
      return (
        <Text
          as="span"
          fontWeight="bold"
          display="inline-flex"
          alignItems="center"
        >
          {iconMap[label]}
          {props.children}
        </Text>
      );
    },
    ul: (props: React.ComponentProps<'ul'>) => (
      <ul
        style={{
          paddingLeft: '1rem',
          marginTop: '0.5rem',
          marginBottom: '1rem',
        }}
        {...props}
      />
    ),
    li: (props: React.ComponentProps<'li'>) => (
      <li
        style={{
          marginLeft: '0.25rem',
          marginBottom: '0.35rem',
          fontSize: '1rem',
          listStyleType: 'disc',
        }}
        {...props}
      />
    ),
  };

  return (
    <Box py={8} minH="100vh" bg="gray.50">
      <Stack spacing={3} align="center" mb={2}>
        <HStack spacing={3} align="center">
          <Box
            w="10px"
            h="10px"
            borderRadius="full"
            bg={dotColor}
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
            <Text fontSize="2xl">{tagText}</Text>
          </HStack>
          <IconButton
            aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
            icon={isFav ? <FaStar /> : <FaRegStar />}
            colorScheme="yellow"
            variant={isFav ? 'solid' : 'outline'}
            isLoading={favBusy}
            onClick={toggleFavourite}
          />
          <Text fontSize="sm" color="gray.500">
            ({favCount}/{MAX_FAVS})
          </Text>
        </HStack>

        {coordLabel && (
          <Text
            fontSize="xl"
            fontWeight="extrabold"
            color="gray.900"
            textAlign="center"
          >
            {coordLabel}
          </Text>
        )}

        <HStack spacing={6}>
          {typeof uiDistanceKm === 'number' ? (
            <Text fontSize="lg" color="gray.700" fontWeight="medium">
              {uiDistanceKm.toFixed(2)} km
            </Text>
          ) : (
            typeof approxDistanceKm === 'number' && (
              <Text fontSize="lg" color="gray.700" fontWeight="medium">
                {approxDistanceKm.toFixed(2)} km
              </Text>
            )
          )}

          {typeof uiDuration === 'number' && (
            <Text fontSize="lg" color="gray.700" fontWeight="medium">
              {(uiDuration / 60).toFixed(1)} min
            </Text>
          )}

          {routeId && (
            <Text fontSize="lg" color="gray.500">
              ID: {`${routeId.slice(0, 8)}…`}
            </Text>
          )}
        </HStack>
      </Stack>

      <Stack spacing={6} align="center">
        {route?.description && (
          <RouteInfoAccordion
            description={route.description}
            components={MDcomponents}
          />
        )}

        <RouteDetailMap center={center} path={path} position={position} />

        <RouteActions
          isTracking={isTracking}
          onStart={handleStart}
          onFinish={handleFinish}
          onBack={() => navigate('/routes')}
        />
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
