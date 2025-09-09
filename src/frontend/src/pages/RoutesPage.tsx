import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Flex,
  Text,
  useToast,
  Spinner,
  Heading,
  Container,
  Tag,
  Wrap,
  WrapItem,
  Stack,
} from '@chakra-ui/react';
import { useLoadScript } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import RouteSearchForm from '../components/routes/RouteSearchForm';
import RouteMap from '../components/routes/RouteMap';
import RouteList from '../components/routes/RouteList';
import {
  DEFAULT_CENTER,
  parseLatLng,
  geocodeAddress,
  ensureCoords,
} from '../utils/geocoding';
import { api } from '../services/api';
import { API, graphqlOperation } from '../services/appsync';
import { onRoutesGenerated } from '../graphql/subscriptions';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

const CACHE_KEY = 'sendeo:lastResults';
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_FAVS = 10;

export default function RoutesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);

  // Autocomplete refs
  const originAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<'points' | 'distance'>('distance');
  const [distanceKm, setDistanceKm] = useState('5');
  const [roundTrip, setRoundTrip] = useState(false);
  const [circle, setCircle] = useState(false);
  const [routesCount, setRoutesCount] = useState('1');
  const [preference, setPreference] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  interface Route {
    routeId: string;
    path?: string;
    distanceKm?: number;
    duration?: number;
    [key: string]: unknown;
  }

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [startingRouteId, setStartingRouteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: favourites = [] } = useQuery<string[]>({
    queryKey: ['favouritesIds'],
    queryFn: async () => {
      const { data } = await api.get('/v1/favourites');
      return data.favourites || [];
    },
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry', 'places'],
  });

  const getUserLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setOrigin(coords);
        setOriginText(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        setLocating(false);
      },
      () => {
        setCenter(DEFAULT_CENTER);
        setOrigin(DEFAULT_CENTER);
        setOriginText(
          `${DEFAULT_CENTER.lat.toFixed(5)}, ${DEFAULT_CENTER.lng.toFixed(5)}`,
        );
        setLocating(false);
        toast({
          title: 'Location unavailable',
          description: 'Enable location or type an address.',
          status: 'warning',
        });
      },
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);


  useEffect(() => {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    try {
      const cached = JSON.parse(raw);
      const fresh = Date.now() - (cached.createdAt ?? 0) < CACHE_TTL_MS;
      if (fresh && Array.isArray(cached.routes) && cached.routes.length) {
        setRoutes(cached.routes);
        setJobId(cached.jobId ?? null);

        if (cached.origin) setOrigin(cached.origin);
        if (cached.destination) setDestination(cached.destination);
        if (cached.originText) setOriginText(cached.originText);
        if (cached.destinationText) setDestinationText(cached.destinationText);
        if (cached.mode) setMode(cached.mode);
        if (cached.distanceKm) setDistanceKm(String(cached.distanceKm));
        if (cached.roundTrip != null) setRoundTrip(!!cached.roundTrip);
        if (cached.circle != null) setCircle(!!cached.circle);
        if (cached.routesCount != null)
          setRoutesCount(String(cached.routesCount));
      } else {
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const subscription = API.graphql(
      graphqlOperation(onRoutesGenerated, { jobId })
    ).subscribe({
      next: ({ value }) => {
        const data = (value as any).data.onRoutesGenerated;
        if (data?.length) {
          setRoutes(data);
          setLoading(false);
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              createdAt: Date.now(),
              jobId,
              routes: data,
              origin,
              destination,
              originText,
              destinationText,
              mode,
              distanceKm,
              roundTrip,
              circle,
              routesCount,
            }),
          );
        }
      },
      error: console.error,
    });
    return () => subscription.unsubscribe();
  }, [
    jobId,
    origin,
    destination,
    originText,
    destinationText,
    mode,
    distanceKm,
    roundTrip,
    circle,
    routesCount,
  ]);

  const toCoord = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    if (!origin) {
      setOrigin(pt);
      setOriginText(`${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`);
    } else if (!destination && mode === 'points') {
      setDestination(pt);
      setDestinationText(`${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const o = await ensureCoords(origin, originText, setOrigin, 'Origin');
    if (!o) return;

    let d: { lat: number; lng: number } | null = null;
    if (mode === 'points') {
      d = await ensureCoords(
        destination,
        destinationText,
        setDestination,
        'Destination',
      );
      if (!d) return;
    }

    const payload = {
      origin: toCoord(o),
      destination: mode === 'points' && d ? toCoord(d) : undefined,
      distanceKm: mode === 'distance' ? +distanceKm : undefined,
      roundTrip: mode === 'distance' ? roundTrip : undefined,
      circle: mode === 'distance' ? circle : undefined,
      routesCount: +routesCount,
      preference: preference || undefined,
    };

    setLoading(true);
    try {
      const { data } = await api.post('/v1/routes', payload);
      setJobId(data.jobId);
      toast({ title: 'Route request submitted.', status: 'success' });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      toast({ title: 'Error', description: errorMessage, status: 'error' });
      setLoading(false);
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem(CACHE_KEY);
    setOrigin(center);
    setDestination(null);
    setOriginText(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    setDestinationText('');
    setDistanceKm('5');
    setRoundTrip(false);
    setCircle(false);
    setRoutesCount('1');
    setPreference('');
    setJobId(null);
    setRoutes([]);
    setLoading(false);
    setSelectedRoute(null);
  };

  const handleSelectRoute = (
    routeId: string,
    rawPath: google.maps.LatLngLiteral[],
  ) => {
    setSelectedRoute(routeId);
    if (mapRef.current) {
      const mid = rawPath[Math.floor(rawPath.length / 2)];
      mapRef.current.panTo(mid);
      mapRef.current.setZoom(15);
    }
  };

  const handleOriginBlur = async () => {
    if (!originText.trim()) return;
    if (origin) return;
    const parsed = parseLatLng(originText);
    if (parsed) {
      setOrigin(parsed);
      setCenter(parsed);
      return;
    }
    const geo = await geocodeAddress(originText);
    if (geo) {
      setOrigin(geo);
      setCenter(geo);
    }
  };
  const handleDestinationBlur = async () => {
    if (!destinationText.trim()) return;
    if (destination) return;
    const parsed = parseLatLng(destinationText);
    if (parsed) {
      setDestination(parsed);
      return;
    }
    const geo = await geocodeAddress(destinationText);
    if (geo) setDestination(geo);
  };

  const favMutation = useMutation({
    mutationFn: ({ routeId, isFav }: { routeId: string; isFav: boolean }) =>
      isFav
        ? api.delete(`/v1/favourites/${routeId}`)
        : api.post('/v1/favourites', { routeId }),
    onSuccess: (_data, { routeId, isFav }) => {
      qc.setQueryData<string[]>(['favouritesIds'], (old = []) =>
        isFav ? old.filter((id) => id !== routeId) : [...old, routeId],
      );
      qc.invalidateQueries({ queryKey: ['favourites'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update favourites',
        status: 'error',
      });
    },
  });

  if (loadError)
    return <Text color="red.500">Map cannot be loaded right now.</Text>;
  if (!isLoaded)
    return (
      <Flex justify="center">
        <Spinner size="xl" />
      </Flex>
    );

  const toggleFavourite = (routeId: string) => {
    const isFav = favourites.includes(routeId);

    if (!isFav && favourites.length >= MAX_FAVS) {
      toast({
        title: 'Favorites limit reached',
        description: `You can save up to ${MAX_FAVS} routes. Remove one to add another.`,
        status: 'warning',
      });
      return;
    }

    favMutation.mutate({ routeId, isFav });
  };

  const handleStartClick = async (routeId: string, navState?: any) => {
    setStartingRouteId(routeId);
    try {
      await api.get(`/v1/routes/${routeId}`);
    } catch {}
    navigate(`/routes/${routeId}`, { state: navState });
  };

  return (
    <Box
      position="relative"
      minH="100vh"
      bg="brand.50"
      boxShadow="2xl"
      borderWidth={2}
      borderColor="brand.300"
    >
      <Container maxW="container.xl" py={10}>
        {/* Header */}
        <Stack align="center" spacing={3} mb={6}>
          <Heading
            size="2xl"
            color="brand.800"
            letterSpacing="tight"
            textAlign="center"
          >
            Plan Your Perfect Route
          </Heading>
          <Text color="gray.700" textAlign="center">
            Set your start, type a street/city or click the map, and pick the
            kilometers.
          </Text>
          <Wrap justify="center">
            <WrapItem>
              <Tag colorScheme="orange" variant="subtle">
                Distance-first
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag colorScheme="green" variant="subtle">
                Loops & out-and-backs
              </Tag>
            </WrapItem>
            <WrapItem>
              <Tag colorScheme="gray" variant="subtle">
                AI route description
              </Tag>
            </WrapItem>
          </Wrap>
        </Stack>

        {/* Card */}
        <Box
          p="1px"
          rounded="xl"
          bg="white"
          mb={8}
          w="full"
          maxW="xxl"
          mx="auto"
        >
          <MotionBox
            bg="white"
            p={6}
            rounded="xl"
            boxShadow="lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RouteSearchForm
              mode={mode}
              setMode={setMode}
              originText={originText}
              setOriginText={setOriginText}
              setOrigin={setOrigin}
              destinationText={destinationText}
              setDestinationText={setDestinationText}
              setDestination={setDestination}
              distanceKm={distanceKm}
              setDistanceKm={setDistanceKm}
              roundTrip={roundTrip}
              setRoundTrip={setRoundTrip}
              circle={circle}
              setCircle={setCircle}
              routesCount={routesCount}
              setRoutesCount={setRoutesCount}
              onSubmit={handleSubmit}
              onReset={handleReset}
              loading={loading}
              originAutoRef={originAutoRef}
              destAutoRef={destAutoRef}
              getUserLocation={getUserLocation}
              locating={locating}
              onOriginBlur={handleOriginBlur}
              onDestinationBlur={handleDestinationBlur}
              setCenter={setCenter}
              mapRef={mapRef}
            >
              <RouteMap
                center={center}
                origin={origin}
                destination={destination}
                mode={mode}
                routes={routes}
                selectedRoute={selectedRoute}
                onSelectRoute={handleSelectRoute}
                onMapClick={handleMapClick}
                mapRef={mapRef}
              />
            </RouteSearchForm>
          </MotionBox>
        </Box>
        {!loading && routes.length > 0 && (
          <RouteList
            routes={routes}
            mode={mode}
            originText={originText}
            destinationText={destinationText}
            distanceKm={distanceKm}
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
            favourites={favourites}
            onToggleFavourite={toggleFavourite}
            onStartClick={handleStartClick}
            startingRouteId={startingRouteId}
            maxFavourites={MAX_FAVS}
          />
        )}
      </Container>
    </Box>
  );
}
