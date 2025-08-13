import { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
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
  Checkbox,
  Heading,
  Divider,
  HStack,
  IconButton,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Container,
  Tag,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
  Autocomplete,
} from '@react-google-maps/api';
import { FaLocationArrow, FaRedo, FaStar, FaRegStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { MdMyLocation } from 'react-icons/md';

const MotionBox = motion(Box);

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };
const COLORS = ['#ff6f00', '#388e3c', '#1976d2'];
const OFFSET_STEP_KM = 0.005; // ~15 m

export default function RoutesPage() {
  const toast = useToast();
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
  const [mode, setMode] = useState<'points' | 'distance'>('points');
  const [distanceKm, setDistanceKm] = useState('5');
  const [roundTrip, setRoundTrip] = useState(false);
  const [circle, setCircle] = useState(false);
  const [maxDeltaKm, setMaxDeltaKm] = useState('1');
  const [routesCount, setRoutesCount] = useState('1');
  const [preference, setPreference] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  interface Route {
    routeId: string;
    path?: string;
    distanceKm?: number;
    description?: string;
    [key: string]: unknown;
  }

  const [routes, setRoutes] = useState<Route[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [startingRouteId, setStartingRouteId] = useState<string | null>(null);

  const navigate = useNavigate();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry', 'places'], // 👈 importante
  });

  // --- helpers de geocoding ---
  const parseLatLng = (text: string): { lat: number; lng: number } | null => {
    const m = text
      .trim()
      .match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[3]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  };

  const geocodeAddress = async (address: string) => {
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          resolve(null);
        }
      });
    });
  };

  const applyPlaceToState = (
    place: google.maps.places.PlaceResult,
    setter: (p: { lat: number; lng: number }) => void,
    setText: (t: string) => void,
  ) => {
    const loc = place.geometry?.location;
    if (!loc) return;
    const coords = { lat: loc.lat(), lng: loc.lng() };
    setter(coords);
    setText(
      place.formatted_address || place.name || `${coords.lat}, ${coords.lng}`,
    );
    setCenter(coords);
    if (mapRef.current) {
      mapRef.current.panTo(coords);
      mapRef.current.setZoom(14);
    }
  };

  const ensureCoords = async (
    current: { lat: number; lng: number } | null,
    text: string,
    setter: (p: { lat: number; lng: number }) => void,
    label: 'Origin' | 'Destination',
  ): Promise<{ lat: number; lng: number } | null> => {
    if (current) return current;
    if (!text.trim()) return null;

    const parsed = parseLatLng(text);
    if (parsed) {
      setter(parsed);
      return parsed;
    }

    const geo = await geocodeAddress(text);
    if (geo) {
      setter(geo);
      return geo;
    }
    toast({
      title: `${label} not found`,
      description: 'Try a more precise address.',
      status: 'warning',
    });
    return null;
  };

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
    (async () => {
      try {
        const { data } = await api.get('/favourites');
        setFavourites(data.favourites || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      const { data } = await api.get(`/jobs/${jobId}/routes`);
      if (data.length) {
        setRoutes(data);
        setLoading(false);
        clearInterval(iv);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [jobId]);

  if (loadError)
    return <Text color="red.500">Map cannot be loaded right now.</Text>;
  if (!isLoaded)
    return (
      <Flex justify="center">
        <Spinner size="xl" />
      </Flex>
    );

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

    // Asegurar coords desde texto si aún no hay
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
      maxDeltaKm: +maxDeltaKm,
      routesCount: +routesCount,
      preference: preference || undefined,
    };

    setLoading(true);
    try {
      const { data } = await api.post('/routes', payload);
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
    setOrigin(center);
    setDestination(null);
    setOriginText(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`);
    setDestinationText('');
    setDistanceKm('5');
    setRoundTrip(false);
    setCircle(false);
    setMaxDeltaKm('1');
    setRoutesCount('1');
    setPreference('');
    setJobId(null);
    setRoutes([]);
    setLoading(false);
    setSelectedRoute(null);
  };

  const toggleFavourite = async (routeId: string) => {
    const isFav = favourites.includes(routeId);
    try {
      if (isFav) {
        await api.delete(`/favourites/${routeId}`);
        setFavourites(favourites.filter((id) => id !== routeId));
      } else {
        await api.post('/favourites', { routeId });
        setFavourites([...favourites, routeId]);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update favourites',
        status: 'error',
      });
    }
  };

  const handleStartClick = async (routeId: string) => {
    setStartingRouteId(routeId);
    try {
      await api.get(`/routes/${routeId}`);
    } catch {}
    navigate(`/routes/${routeId}`);
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

  // onBlur geocode si el user no seleccionó del Autocomplete
  const handleOriginBlur = async () => {
    if (!originText.trim()) return;
    if (origin) return; // ya tenemos coords
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
            color="orange.600"
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
            <Stack spacing={4}>
              {/* Mode Toggle */}
              <Flex>
                <Button
                  flex={1}
                  mr={2}
                  colorScheme={mode === 'points' ? 'orange' : 'gray'}
                  onClick={() => setMode('points')}
                >
                  By Points
                </Button>
                <Button
                  flex={1}
                  colorScheme={mode === 'distance' ? 'orange' : 'gray'}
                  onClick={() => {
                    setMode('distance');
                    setDestination(null);
                    setDestinationText('');
                  }}
                >
                  By Distance
                </Button>
              </Flex>

              <Divider />

              <form onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  {/* ORIGIN with Autocomplete */}
                  <FormControl isRequired>
                    <FormLabel>Origin (address or lat,lng)</FormLabel>
                    <Autocomplete
                      onLoad={(ac) => (originAutoRef.current = ac)}
                      onPlaceChanged={() => {
                        const place = originAutoRef.current?.getPlace();
                        if (place)
                          applyPlaceToState(place, setOrigin, setOriginText);
                      }}
                    >
                      <Input
                        placeholder="e.g. Gran Via 580, Barcelona"
                        value={originText}
                        onChange={(e) => {
                          setOriginText(e.target.value);
                          setOrigin(null);
                        }}
                        onBlur={handleOriginBlur}
                        bg={origin ? 'orange.50' : 'gray.50'}
                      />
                    </Autocomplete>
                    <Button
                      size="sm"
                      mt={2}
                      onClick={getUserLocation}
                      leftIcon={<MdMyLocation />}
                      colorScheme="blue"
                      variant="solid"
                      rounded="full"
                      px={3}
                      isLoading={locating}
                      loadingText="Locating…"
                      _hover={{
                        transform: 'translateY(-1px)',
                        boxShadow: 'md',
                      }}
                    >
                      Use my location
                    </Button>
                  </FormControl>

                  {/* DESTINATION only in points mode */}
                  {mode === 'points' && (
                    <FormControl isRequired>
                      <FormLabel>Destination (address or lat,lng)</FormLabel>
                      <Autocomplete
                        onLoad={(ac) => (destAutoRef.current = ac)}
                        onPlaceChanged={() => {
                          const place = destAutoRef.current?.getPlace();
                          if (place)
                            applyPlaceToState(
                              place,
                              setDestination,
                              setDestinationText,
                            );
                        }}
                      >
                        <Input
                          placeholder="e.g. Plaça Catalunya, Barcelona"
                          value={destinationText}
                          onChange={(e) => {
                            setDestinationText(e.target.value);
                            setDestination(null);
                          }}
                          onBlur={handleDestinationBlur}
                          bg={destination ? 'orange.50' : 'gray.50'}
                        />
                      </Autocomplete>
                    </FormControl>
                  )}

                  {mode === 'distance' && (
                    <>
                      <FormControl>
                        <FormLabel>Distance (km)</FormLabel>
                        <NumberInput
                          min={1}
                          max={50}
                          value={distanceKm}
                          onChange={(v) => setDistanceKm(v)}
                        >
                          <NumberInputField bg="gray.50" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <HStack spacing={6}>
                        <Checkbox
                          isChecked={roundTrip}
                          onChange={(e) => setRoundTrip(e.target.checked)}
                        >
                          Round Trip
                        </Checkbox>
                        <Checkbox
                          isChecked={circle}
                          onChange={(e) => setCircle(e.target.checked)}
                        >
                          Circular Loop
                        </Checkbox>
                      </HStack>
                    </>
                  )}

                  <FormControl>
                    <FormLabel>Routes Count</FormLabel>
                    <NumberInput
                      min={1}
                      max={3}
                      value={routesCount}
                      onChange={(v) => setRoutesCount(v)}
                    >
                      <NumberInputField bg="gray.50" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Max Tolerance (km)</FormLabel>
                    <NumberInput
                      min={0}
                      max={5}
                      value={maxDeltaKm}
                      onChange={(v) => setMaxDeltaKm(v)}
                    >
                      <NumberInputField bg="gray.50" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  {/* Map */}
                  <Box
                    mt={4}
                    borderRadius="lg"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <GoogleMap
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      onUnmount={() => {
                        mapRef.current = null;
                      }}
                      mapContainerStyle={{ width: '100%', height: '700px' }}
                      center={origin || center}
                      zoom={13}
                      onClick={handleMapClick}
                      options={{ tilt: 45, heading: 90 }}
                    >
                      {origin && <Marker position={origin} label="A" />}
                      {mode === 'points' && destination && (
                        <Marker position={destination} label="B" />
                      )}

                      {routes.map((r, i) => {
                        const rawPath =
                          google.maps.geometry.encoding.decodePath(r.path!);
                        const coords = rawPath.map((p) => [
                          p.lng(),
                          p.lat(),
                        ]) as [number, number][];
                        const line = turf.lineString(coords);
                        const offsetDist =
                          (i - (routes.length - 1) / 2) * OFFSET_STEP_KM;
                        const offsetLine = turf.lineOffset(line, offsetDist, {
                          units: 'kilometers',
                        });
                        const path = offsetLine.geometry.coordinates.map(
                          ([lng, lat]) => ({ lat, lng }),
                        );

                        return (
                          <Polyline
                            key={r.routeId}
                            path={path}
                            options={{
                              strokeColor: COLORS[i % COLORS.length],
                              strokeOpacity: 1,
                              strokeWeight: selectedRoute === r.routeId ? 6 : 4,
                              zIndex: selectedRoute === r.routeId ? 10 : i + 1,
                            }}
                            onClick={() => handleSelectRoute(r.routeId, path)}
                          />
                        );
                      })}
                    </GoogleMap>
                  </Box>

                  {/* Submit + Reset */}
                  <HStack mt={4} spacing={3} justify="flex-end">
                    <Button
                      onClick={handleReset}
                      leftIcon={<FaRedo />}
                      variant="outline"
                      colorScheme="gray"
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="orange"
                      leftIcon={<FaLocationArrow />}
                      isLoading={loading}
                    >
                      Submit
                    </Button>
                  </HStack>
                </Stack>
              </form>
            </Stack>
          </MotionBox>
        </Box>

        {/* Results */}
        {!loading && routes.length > 0 && (
          <Box
            bg="white"
            p={4}
            rounded="lg"
            boxShadow="md"
            w="full"
            maxW="xxl"
            mx="auto"
          >
            <Heading size="lg" mb={4}>
              Found Routes
            </Heading>
            <Stack spacing={3}>
              {routes.map((r, idx) => {
                const isSelected = selectedRoute === r.routeId;
                return (
                  <Button
                    minH={['60px', '80px']}
                    key={r.routeId}
                    w="100%"
                    justifyContent="space-between"
                    alignItems="center"
                    variant={isSelected ? 'solid' : 'outline'}
                    colorScheme={isSelected ? 'orange' : 'gray'}
                    bg="white"
                    borderWidth="1px"
                    rounded="md"
                    px={6}
                    py={4}
                    _hover={{ bg: isSelected ? 'orange.100' : 'gray.50' }}
                    onClick={() => {
                      const rawPath = google.maps.geometry.encoding.decodePath(
                        r.path!,
                      );
                      const path = rawPath.map((p) => ({
                        lat: p.lat(),
                        lng: p.lng(),
                      }));
                      handleSelectRoute(r.routeId, path);
                    }}
                  >
                    <Box textAlign="left">
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color="gray.800"
                        mb={1}
                      >
                        Route {idx + 1}
                      </Text>
                      <Text fontSize="lg" color="gray.600">
                        Distance: {r.distanceKm?.toFixed(2)} km
                      </Text>
                      {r.description && (
                        <Text fontSize="sm" color="gray.500" noOfLines={1}>
                          {r.description}
                        </Text>
                      )}
                    </Box>

                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Toggle favourite"
                        variant="ghost"
                        colorScheme="yellow"
                        icon={
                          favourites.includes(r.routeId) ? (
                            <FaStar />
                          ) : (
                            <FaRegStar />
                          )
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavourite(r.routeId);
                        }}
                      />
                      <Button
                        size="md"
                        colorScheme="green"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartClick(r.routeId);
                        }}
                        isDisabled={!r.path}
                        isLoading={startingRouteId === r.routeId}
                        loadingText="Opening…"
                        spinnerPlacement="end"
                      >
                        Start
                      </Button>
                    </HStack>
                  </Button>
                );
              })}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
}
