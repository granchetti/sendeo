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
  Checkbox,
  Heading,
  Divider,
  Icon,
  HStack,
  Select,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
  useLoadScript,
} from '@react-google-maps/api';
import { FaLocationArrow, FaRedo } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const MotionBox = motion(Box);

const DEFAULT_CENTER = { lat: 41.3851, lng: 2.1734 };
const DEFAULT_DISTANCE_KM = '5';
const DEFAULT_MAX_DELTA_KM = '1';
const DEFAULT_ROUTES_COUNT = '3';

export default function RoutesPage() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    DEFAULT_CENTER,
  );
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [roundTrip, setRoundTrip] = useState(false);
  const [circle, setCircle] = useState(false);
  const [maxDeltaKm, setMaxDeltaKm] = useState(DEFAULT_MAX_DELTA_KM);
  const [routesCount, setRoutesCount] = useState(DEFAULT_ROUTES_COUNT);
  const [preference, setPreference] = useState('');
  const [mode, setMode] = useState<'points' | 'distance'>('points');
  const [jobId, setJobId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
    libraries: ['geometry'],
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(coords);
        setOrigin(coords);
      },
      (err) => {
        console.error('Failed to obtain location', err);
      },
    );
  }, []);

  const toCoord = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    if (!origin) setOrigin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    else if (!destination && mode === 'points')
      setDestination({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin)
      return toast({
        title: 'Select an origin on the map.',
        status: 'warning',
      });

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
    setDistanceKm(DEFAULT_DISTANCE_KM);
    setRoundTrip(false);
    setCircle(false);
    setMaxDeltaKm(DEFAULT_MAX_DELTA_KM);
    setRoutesCount(DEFAULT_ROUTES_COUNT);
    setPreference('');
    setJobId(null);
    setRoutes([]);
    setLoading(false);
  };

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
                    <Input
                      type="number"
                      value={distanceKm}
                      placeholder="Enter distance in km"
                      bg={origin ? 'orange.50' : 'gray.50'}
                      onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </FormControl>

                  <HStack spacing={6} mb={4}>
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
                  bg={origin ? 'orange.50' : 'gray.50'}
                  onChange={(valueString) => setRoutesCount(valueString)}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Max Tolerance (km)</FormLabel>
                <NumberInput
                  min={1}
                  max={10}
                  value={maxDeltaKm}
                  bg={origin ? 'orange.50' : 'gray.50'}
                  onChange={(valueString) => setMaxDeltaKm(valueString)}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl mt={4}>
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

              {/* Map right below the form */}
              <Box mt={4} borderRadius="md" overflow="hidden">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '500px' }}
                  center={origin || center}
                  zoom={13}
                  onClick={handleMapClick}
                >
                  {origin && <Marker position={origin} label="A" />}
                  {mode === 'points' && destination && (
                    <Marker position={destination} label="B" />
                  )}
                  {routes.map((r, i) => (
                    <Polyline
                      key={r.routeId}
                      path={google.maps.geometry.encoding.decodePath(r.path!)}
                      options={{
                        strokeColor: ['#ff6f00', '#388e3c', '#1976d2'][i % 3],
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                      }}
                    />
                  ))}
                </GoogleMap>
              </Box>

              {/* Submit + Reset */}
              <HStack mt={4} spacing={3} justify="flex-end">
                <Button
                  onClick={handleReset}
                  leftIcon={<FaRedo />}
                  size="lg"
                  variant="outline"
                  colorScheme="gray"
                  minW="150px"
                >
                  Reset
                </Button>

                <Button
                  type="submit"
                  colorScheme="orange"
                  leftIcon={<FaLocationArrow />}
                  size="lg"
                  isLoading={loading}
                  loadingText="Requesting…"
                  minW="150px"
                  flex={0.5}
                >
                  Submit
                </Button>
              </HStack>
            </Stack>
          </form>
        </Stack>
      </MotionBox>

      {/* Results */}
      {loading && <Spinner size="lg" mb={4} />}
      {!loading && routes.length > 0 && (
        <Box bg="white" p={4} rounded="lg" boxShadow="md" w={['90%', '900px']}>
          <Heading size="md" mb={2}>
            Found Routes
          </Heading>
          {preference && (
            <Text fontSize="sm" mb={2} color="gray.600">
              Preference: {preference}
            </Text>
          )}
          <Stack spacing={2}>
            {routes.map((r, idx) => (
              <Box key={r.routeId} p={2} borderWidth="1px" rounded="md">
                <Text>Route {idx + 1}</Text>
                <Text fontSize="sm">
                  Distance: {r.distanceKm?.toFixed(2)} km
                </Text>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Flex>
  );
}
