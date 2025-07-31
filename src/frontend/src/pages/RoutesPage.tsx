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
  Icon,
  HStack,
  IconButton,
  Select,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { FaLocationArrow, FaRedo, FaStar, FaRegStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const MotionBox = motion(Box);

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };
const COLORS = ['#ff6f00', '#388e3c', '#1976d2'];
const OFFSET_STEP_KM = 0.005; // 15 meters approx

export default function RoutesPage() {
  const toast = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mode, setMode] = useState<'points' | 'distance'>('points');
  const [distanceKm, setDistanceKm] = useState('5');
  const [roundTrip, setRoundTrip] = useState(false);
  const [circle, setCircle] = useState(false);
  const [maxDeltaKm, setMaxDeltaKm] = useState('1');
  const [routesCount, setRoutesCount] = useState('3');
  const [preference, setPreference] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [summary, setSummary] = useState<any | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        setOrigin(coords);
      },
      (err) => console.error('Failed to obtain location', err),
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/favourites');
        setFavourites(data.favourites || []);
      } catch (err) {
        console.error(err);
      }
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
    if (!origin) setOrigin(pt);
    else if (!destination && mode === 'points') setDestination(pt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin) {
      toast({ title: 'Select an origin on the map.', status: 'warning' });
      return;
    }
    const payload = {
      origin: toCoord(origin),
      destination:
        mode === 'points' && destination ? toCoord(destination) : undefined,
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, status: 'error' });
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOrigin(center);
    setDestination(null);
    setDistanceKm('5');
    setRoundTrip(false);
    setCircle(false);
    setMaxDeltaKm('1');
    setRoutesCount('3');
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
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message ?? 'Failed to update favourites',
        status: 'error',
      });
    }
  };

  const startRoute = async (routeId: string) => {
    try {
      await api.post('/telemetry/started', { routeId });
      const id = navigator.geolocation.watchPosition(
        (pos) =>
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('watchPosition error', err),
      );
      setWatchId(id);
      setActiveRouteId(routeId);
      toast({ title: 'Route started', status: 'success' });
    } catch (err: any) {
      toast({
        title: 'Error starting route',
        description: err.message,
        status: 'error',
      });
    }
  };

  const finishRoute = async () => {
    if (!activeRouteId) return;
    try {
      const { data } = await api.post(`/routes/${activeRouteId}/finish`);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setActiveRouteId(null);
      setPosition(null);
      setSummary(data);
      onOpen();
      toast({ title: 'Route finished', status: 'success' });
    } catch (err: any) {
      toast({
        title: 'Error finishing route',
        description: err.message,
        status: 'error',
      });
    }
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

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  return (
    <Flex direction="column" align="center" py={8} bg="gray.50" minH="100vh">
      {/* Header */}
      <Flex align="center" mb={6}>
        <Icon as={FaLocationArrow} boxSize={8} color="orange.500" mr={2} />
        <Heading size="xl" color="orange.500">
          Plan Your Perfect Route
        </Heading>
      </Flex>

      {/* Unified Card */}
      <MotionBox
        bg="white"
        p={6}
        rounded="lg"
        boxShadow="md"
        w={['90%', '900px']}
        mb={6}
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
              }}
            >
              By Distance
            </Button>
          </Flex>

          <Divider />

          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Origin</FormLabel>
                <Input
                  readOnly
                  placeholder="Click on map"
                  value={
                    origin
                      ? `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`
                      : ''
                  }
                  bg={origin ? 'orange.50' : 'gray.50'}
                />
              </FormControl>

              {mode === 'points' && (
                <FormControl>
                  <FormLabel>Destination</FormLabel>
                  <Input
                    readOnly
                    placeholder="Click on map"
                    value={
                      destination
                        ? `${destination.lat.toFixed(
                            5,
                          )}, ${destination.lng.toFixed(5)}`
                        : ''
                    }
                    bg={destination ? 'orange.50' : 'gray.50'}
                  />
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
                  max={5}
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
                  max={10}
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

              <FormControl>
                <FormLabel>Preference</FormLabel>
                <Select
                  placeholder="Select preference"
                  value={preference}
                  onChange={(e) => setPreference(e.target.value)}
                >
                  <option value="park">Park</option>
                  <option value="countryside">Countryside</option>
                  <option value="scenic">Scenic</option>
                </Select>
              </FormControl>

              {/* Mapa */}
              <Box mt={4} borderRadius="md" overflow="hidden">
                <GoogleMap
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  onUnmount={() => {
                    mapRef.current = null;
                  }}
                  mapContainerStyle={{ width: '100%', height: '500px' }}
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
                    const rawPath = google.maps.geometry.encoding.decodePath(
                      r.path!,
                    );
                    const coords = rawPath.map((p) => [p.lng(), p.lat()]) as [
                      number,
                      number,
                    ][];
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

                  {position && <Marker position={position} label="You" />}
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

      {/* Results */}
      {!loading && routes.length > 0 && (
        <Box bg="white" p={4} rounded="lg" boxShadow="md" w={['90%', '900px']}>
          <Heading size="lg" mb={4}>
            Found Routes
          </Heading>
          <Stack spacing={3} >
            {routes.map((r, idx) => {
              const isSelected = selectedRoute === r.routeId;
              return (
                <Button
                  key={r.routeId}
                  w="100%"
                  size=""
                  justifyContent="space-between"
                  alignItems="center"
                  variant={isSelected ? 'solid' : 'outline'}
                  colorScheme={isSelected ? 'orange' : 'gray'}
                  bg="white"
                  borderWidth="1px"
                  rounded="md"
                  px={6}
                  py={4} // padding vertical
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
                      size="md" // botón Start un poco más pequeño que la fila
                      colorScheme="green"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRoute(r.routeId);
                      }}
                      isDisabled={
                        !!activeRouteId && activeRouteId !== r.routeId
                      }
                    >
                      Start
                    </Button>
                  </HStack>
                </Button>
              );
            })}

            {activeRouteId && (
              <Button
                mt={4}
                size="lg"
                colorScheme="red"
                w="full"
                onClick={finishRoute}
              >
                Finish Route
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setSummary(null);
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Route Summary</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {summary && (
              <Stack spacing={2}>
                {summary.distanceKm != null && (
                  <Text>Distance: {summary.distanceKm} km</Text>
                )}
                {summary.duration != null && (
                  <Text>Estimated Time: {summary.duration} seconds</Text>
                )}
                {summary.actualDuration != null && (
                  <Text>Actual Time: {summary.actualDuration} seconds</Text>
                )}
              </Stack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={() => {
                onClose();
                setSummary(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
