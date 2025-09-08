import React from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Flex,
  Divider,
  HStack,
  Checkbox,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { Autocomplete } from '@react-google-maps/api';
import { FaLocationArrow, FaRedo } from 'react-icons/fa';
import { MdMyLocation } from 'react-icons/md';
import { applyPlaceToState } from '../../utils/geocoding';

interface RouteSearchFormProps {
  mode: 'points' | 'distance';
  setMode: (m: 'points' | 'distance') => void;
  originText: string;
  setOriginText: (s: string) => void;
  setOrigin: (p: { lat: number; lng: number } | null) => void;
  destinationText: string;
  setDestinationText: (s: string) => void;
  setDestination: (p: { lat: number; lng: number } | null) => void;
  distanceKm: string;
  setDistanceKm: (v: string) => void;
  roundTrip: boolean;
  setRoundTrip: (v: boolean) => void;
  circle: boolean;
  setCircle: (v: boolean) => void;
  maxDeltaKm: string;
  setMaxDeltaKm: (v: string) => void;
  routesCount: string;
  setRoutesCount: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  loading: boolean;
  originAutoRef: React.MutableRefObject<google.maps.places.Autocomplete | null>;
  destAutoRef: React.MutableRefObject<google.maps.places.Autocomplete | null>;
  getUserLocation: () => void;
  locating: boolean;
  onOriginBlur: () => void;
  onDestinationBlur: () => void;
  setCenter: (p: { lat: number; lng: number }) => void;
  mapRef: React.RefObject<google.maps.Map | null>;
  children?: React.ReactNode;
}

const RouteSearchForm: React.FC<RouteSearchFormProps> = ({
  mode,
  setMode,
  originText,
  setOriginText,
  setOrigin,
  destinationText,
  setDestinationText,
  setDestination,
  distanceKm,
  setDistanceKm,
  roundTrip,
  setRoundTrip,
  circle,
  setCircle,
  maxDeltaKm,
  setMaxDeltaKm,
  routesCount,
  setRoutesCount,
  onSubmit,
  onReset,
  loading,
  originAutoRef,
  destAutoRef,
  getUserLocation,
  locating,
  onOriginBlur,
  onDestinationBlur,
  setCenter,
  mapRef,
  children,
}) => {
  return (
    <Box p={6} rounded="xl" bg="white">
      <Stack spacing={4}>
        <Flex>
          <Button
            flex={1}
            colorScheme={mode === 'distance' ? 'orange' : 'gray'}
            onClick={() => {
              setMode('distance');
              setDestinationText('');
            }}
          >
            By Distance
          </Button>
          <Button
            flex={1}
            mr={2}
            colorScheme={mode === 'points' ? 'orange' : 'gray'}
            onClick={() => setMode('points')}
          >
            By Points
          </Button>
        </Flex>
        <Divider />
        <form onSubmit={onSubmit}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Origin (address or lat,lng)</FormLabel>
              <Autocomplete
                onLoad={(ac) => (originAutoRef.current = ac)}
                onPlaceChanged={() => {
                  const place = originAutoRef.current?.getPlace();
                  if (place)
                    applyPlaceToState(
                      place,
                      setOrigin,
                      setOriginText,
                      setCenter,
                      mapRef,
                    );
                }}
              >
                <Input
                  placeholder="e.g. Gran Via 580, Barcelona"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  onBlur={onOriginBlur}
                  bg="gray.50"
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
              >
                Use my location
              </Button>
            </FormControl>
            {mode === 'distance' && (
              <>
                <FormControl>
                  <FormLabel>Distance (km)</FormLabel>
                  <NumberInput
                    min={1}
                    max={100}
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
                    onChange={(e) => {
                      setRoundTrip(e.target.checked);
                      if (!e.target.checked) setCircle(false);
                    }}
                  >
                    Round Trip
                  </Checkbox>
                  <Checkbox
                    isChecked={circle}
                    onChange={(e) => setCircle(e.target.checked)}
                    isDisabled={!roundTrip}
                  >
                    Circular Loop
                  </Checkbox>
                </HStack>
              </>
            )}
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
                        setCenter,
                        mapRef,
                      );
                  }}
                >
                  <Input
                    placeholder="e.g. Plaça Catalunya, Barcelona"
                    value={destinationText}
                    onChange={(e) => setDestinationText(e.target.value)}
                    onBlur={onDestinationBlur}
                    bg="gray.50"
                  />
                </Autocomplete>
              </FormControl>
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
            {children}
            <HStack mt={4} spacing={3} justify="flex-end">
              <Button
                onClick={onReset}
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
    </Box>
  );
};

export default RouteSearchForm;
