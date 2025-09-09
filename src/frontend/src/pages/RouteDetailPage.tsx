import { useEffect, useState, useMemo, type JSX, Children } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Tooltip,
  Editable,
  EditableInput,
  EditablePreview,
  Divider,
  Tag,
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
  FaClock,
  FaRulerCombined,
  FaHashtag,
  FaCopy,
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
  const qc = useQueryClient();
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [watchId, setWatchId] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [positions, setPositions] = useState<{ lat: number; lng: number }[]>(
    [],
  );
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const [timerId, setTimerId] = useState<number | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  const { data: route, isLoading } = useQuery<Route | null>({
    queryKey: ['route', routeId],
    queryFn: async () => {
      if (!routeId) return null;
      const { data } = await api.get(`/v1/routes/${routeId}`);
      return data;
    },
  });

  const { data: favIds = [] } = useQuery<string[]>({
    queryKey: ['favouritesIds'],
    queryFn: async () => {
      const { data } = await api.get('/v1/favourites');
      return data.favourites || [];
    },
    enabled: !!routeId,
  });

  const isFav = routeId ? favIds.includes(routeId) : false;
  const favCount = favIds.length;

  useEffect(() => {
    setAliases(loadAliases());
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', status: 'error' });
      setPosition(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
      },
      (err) => {
        toast({
          title: 'Failed to retrieve location',
          description: err.message,
          status: 'error',
        });
        setPosition(DEFAULT_CENTER);
      },
    );
  }, [toast]);

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timerId !== null) window.clearInterval(timerId);
    };
  }, [watchId, timerId]);

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

  const liveDistanceKm = useMemo(() => {
    if (positions.length > 1) {
      const line = turf.lineString(
        positions.map((p) => [p.lng, p.lat]) as [number, number][],
      );
      return turf.length(line, { units: 'kilometers' });
    }
    return undefined;
  }, [positions]);

  const liveElapsedSec = useMemo(() => {
    if (startedAt == null) return undefined;
    return Math.max(0, Math.round((nowTs - startedAt) / 1000));
  }, [nowTs, startedAt]);

  useEffect(() => {
    if (watchId !== null && startedAt != null && timerId == null) {
      const id = window.setInterval(() => setNowTs(Date.now()), 1000);
      setTimerId(id as unknown as number);
      return () => window.clearInterval(id);
    }
    if (watchId === null && timerId != null) {
      window.clearInterval(timerId);
      setTimerId(null);
    }
  }, [watchId, startedAt, timerId]);

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

  const handleAliasSave = (next: string) => {
    if (!routeId) return;
    const name = (next || '').trim() || tagText;
    const nextAliases = { ...aliases, [routeId]: name };
    setAliases(nextAliases);
    saveAliases(nextAliases);
    toast({ title: 'Name saved', status: 'success' });
  };

  const copyId = async () => {
    if (!routeId) return;
    try {
      await navigator.clipboard.writeText(routeId);
      toast({ title: 'Route ID copied', status: 'success' });
    } catch {
      toast({ title: 'Could not copy', status: 'error' });
    }
  };

  const favMutation = useMutation({
    mutationFn: (isFav: boolean) =>
      isFav
        ? api.delete(`/v1/favourites/${routeId}`)
        : api.post('/v1/favourites', { routeId }),
    onSuccess: (_data, isFav) => {
      if (routeId) {
        qc.setQueryData<string[]>(['favouritesIds'], (old = []) =>
          isFav ? old.filter((id) => id !== routeId) : [...old, routeId],
        );
        qc.invalidateQueries({ queryKey: ['favourites'] });
      }
      if (!isFav && routeId && !aliases[routeId]) {
        const alias = tagText;
        const next = { ...aliases, [routeId]: alias };
        setAliases(next);
        saveAliases(next);
      }
      toast({
        title: isFav ? 'Removed from favourites' : 'Added to favourites',
        status: isFav ? 'info' : 'success',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not update favourites',
        status: 'error',
      });
    },
  });

  const toggleFavourite = () => {
    if (!routeId || favMutation.isPending) return;

    if (!isFav && favCount >= MAX_FAVS) {
      toast({
        title: 'Favourite limit reached',
        description: `You can save up to ${MAX_FAVS} routes. Remove one to add another.`,
        status: 'warning',
      });
      return;
    }

    favMutation.mutate(isFav);
  };
  const startMutation = useMutation({
    mutationFn: (id: string) => api.post('/v1/telemetry/started', { routeId: id }),
    onError: () => {
      toast({ title: 'Failed to start tracking', status: 'error' });
    },
  });

  const handleStart = async () => {
    if (!routeId) return;
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', status: 'error' });
      return;
    }
    try {
      await startMutation.mutateAsync(routeId);
    } catch {
      return;
    }
    setPositions([]);
    setStartedAt(Date.now());
    setNowTs(Date.now());
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
    setWatchId(id);
  };

  const finishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/v1/routes/${id}/finish`);
      let actualDistanceKm: number | undefined;
      if (positions.length > 1) {
        const line = turf.lineString(
          positions.map((p) => [p.lng, p.lat]) as [number, number][],
        );
        actualDistanceKm = turf.length(line, { units: 'kilometers' });
      }
      return { ...data, ...(actualDistanceKm != null ? { actualDistanceKm } : {}) } as RouteSummary;
    },
    onSuccess: (data) => {
      setSummary(data);
      onOpen();
      toast({ title: 'Route finished', status: 'success' });
    },
    onError: () => {
      toast({ title: 'Error finishing', status: 'error' });
    },
  });

  const handleFinish = () => {
    if (!routeId) return;
    finishMutation.mutate(routeId);

    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
    setPosition(null);
    if (timerId !== null) window.clearInterval(timerId);
    setTimerId(null);
    setStartedAt(null);
    setPositions([]);
  };

  if (loadError) return <Text color="red.500">Map cannot load</Text>;
  if (!isLoaded || isLoading)
    return (
      <Flex justify="center" py={10}>
        <Spinner size="xl" />
      </Flex>
    );

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
      {/* Header (siempre centrado) */}
      <Stack spacing={2} mb={3} px={{ base: 2, md: 0 }} align="center">
        <HStack
          spacing={3}
          align="center"
          justify="center"
          wrap="wrap"
          w="full"
        >
          <Box
            w="10px"
            h="10px"
            borderRadius="full"
            bg={dotColor}
            border="1px solid rgba(0,0,0,0.2)"
            flex="0 0 auto"
          />
          <Editable
            defaultValue={tagText}
            onSubmit={handleAliasSave}
            selectAllOnFocus
          >
            <EditablePreview
              as={Tag}
              px={4}
              py={2}
              rounded="full"
              bg="gray.100"
              fontWeight="semibold"
              color="gray.700"
              textAlign="center"
            />
            <EditableInput
              px={2}
              py={1}
              borderRadius="full"
              bg="white"
              border="1px solid"
              borderColor="gray.300"
              textAlign="center"
            />
          </Editable>

          <Tooltip
            label={isFav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <IconButton
              aria-label={
                isFav ? 'Remove from favourites' : 'Add to favourites'
              }
              icon={isFav ? <FaStar /> : <FaRegStar />}
              colorScheme="yellow"
              variant={isFav ? 'solid' : 'outline'}
              size="sm"
              isLoading={favMutation.isPending}
              onClick={toggleFavourite}
            />
          </Tooltip>

          <Text fontSize="sm" color="gray.500">
            ({favCount}/{MAX_FAVS})
          </Text>
        </HStack>

        {/* Fila de detalles: en móviles se envuelve, en pantallas grandes es una sola fila */}
        <Flex
          mt={1}
          align="center"
          justify="center"
          gap={{ base: 3, md: 5, lg: 8 }}
          flexWrap={{ base: 'wrap', lg: 'nowrap' }}
          w="full"
        >
          {coordLabel && (
            <Text
              color="gray.700"
              textAlign="center"
              whiteSpace={{ lg: 'nowrap' }}
            >
              {coordLabel}
            </Text>
          )}

          {(typeof uiDistanceKm === 'number' ||
            typeof approxDistanceKm === 'number') && (
            <HStack spacing={2} justify="center" whiteSpace={{ lg: 'nowrap' }}>
              <Icon as={FaRulerCombined} color="orange.500" />
              <Text color="gray.700">
                Distance:{' '}
                <Text as="span" fontWeight="semibold">
                  {(uiDistanceKm ?? approxDistanceKm)!.toFixed(2)} km
                </Text>
              </Text>
            </HStack>
          )}

          {typeof uiDuration === 'number' && (
            <HStack spacing={2} justify="center" whiteSpace={{ lg: 'nowrap' }}>
              <Icon as={FaClock} color="blue.500" />
              <Text color="gray.700">
                Estimated time:{' '}
                <Text as="span" fontWeight="semibold">
                  {(uiDuration / 60).toFixed(1)} min
                </Text>
              </Text>
            </HStack>
          )}

          {watchId !== null && (
            <HStack spacing={2} justify="center" whiteSpace={{ lg: 'nowrap' }}>
              <Icon as={FaRulerCombined} color="green.500" />
              <Text color="gray.700">
                Progress:{' '}
                <Text as="span" fontWeight="semibold">
                  {(liveDistanceKm ?? 0).toFixed(2)} km
                </Text>
                {typeof liveElapsedSec === 'number' && (
                  <Text as="span" color="gray.600">{`  •  ${(liveElapsedSec / 60).toFixed(1)} min`}</Text>
                )}
              </Text>
            </HStack>
          )}

          {routeId && (
            <HStack spacing={2} justify="center" whiteSpace={{ lg: 'nowrap' }}>
              <Icon as={FaHashtag} color="gray.500" />
              <Text color="gray.700">
                ID:{' '}
                <Text as="span" fontWeight="semibold">
                  {routeId.slice(0, 8)}…
                </Text>
              </Text>
              <IconButton
                aria-label="Copy ID"
                icon={<FaCopy />}
                size="xs"
                variant="ghost"
                onClick={copyId}
              />
            </HStack>
          )}
        </Flex>
      </Stack>

      <Divider my={4} />

      <Stack spacing={6} align="center">
        {route?.description && (
          <RouteInfoAccordion
            description={route.description}
            components={MDcomponents}
          />
        )}

        <RouteDetailMap center={center} path={path} position={position} />

        <RouteActions
          isTracking={watchId !== null}
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
                  <Text>Estimated Time: {(summary.duration / 60).toFixed(1)} min</Text>
                )}
                {summary.actualDuration != null && (
                  <Text>Actual Time: {(summary.actualDuration / 60).toFixed(1)} min</Text>
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
