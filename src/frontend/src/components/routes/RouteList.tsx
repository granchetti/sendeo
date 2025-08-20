import React from 'react';
import {
  Box,
  Heading,
  Stack,
  HStack,
  Tag,
  Text,
  IconButton,
  Button,
} from '@chakra-ui/react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const COLORS = ['#ff6f00', '#388e3c', '#1976d2', '#d32f2f', '#a839e4ff'];

export interface RouteItem {
  routeId: string;
  path?: string;
  distanceKm?: number;
  duration?: number;
}

interface RouteListProps {
  routes: RouteItem[];
  mode: 'points' | 'distance';
  originText: string;
  destinationText: string;
  distanceKm: string;
  selectedRoute: string | null;
  onSelectRoute: (id: string, path: { lat: number; lng: number }[]) => void;
  favourites: string[];
  onToggleFavourite: (routeId: string) => void;
  onStartClick: (routeId: string, navState?: any) => void;
  startingRouteId?: string | null;
  maxFavourites?: number;
}

const decodePolyline = (encoded?: string): google.maps.LatLngLiteral[] => {
  if (!encoded) return [];
  const raw = google.maps.geometry.encoding.decodePath(encoded);
  return raw.map((p) => ({ lat: p.lat(), lng: p.lng() }));
};

const RouteList: React.FC<RouteListProps> = ({
  routes,
  mode,
  originText,
  destinationText,
  distanceKm,
  selectedRoute,
  onSelectRoute,
  favourites,
  onToggleFavourite,
  onStartClick,
  startingRouteId,
  maxFavourites = 10,
}) => {
  if (routes.length === 0) return null;

  return (
    <Box
      bg="white"
      p={4}
      rounded="lg"
      boxShadow="md"
      w="full"
      maxW="xxl"
      mx="auto"
    >
      <Heading size="lg" mb={4} color="gray.800" letterSpacing="tight">
        Found Routes
      </Heading>
      <Stack spacing={3}>
        {routes.map((r, idx) => {
          const isSelected = selectedRoute === r.routeId;
          const color = COLORS[idx % COLORS.length];
          const labelLine =
            mode === 'points'
              ? `${originText || 'Origin'} → ${
                  destinationText || 'Destination'
                }`
              : `${originText || 'Start'} • ${distanceKm} km`;
          const path = decodePolyline(r.path);
          const isFav = favourites.includes(r.routeId);
          const reachLimit = !isFav && favourites.length >= maxFavourites;
          const navState = {
            displayName: `Route ${idx + 1}`,
            labelLine,
            idx,
          };

          return (
            <Box
              key={r.routeId}
              role="button"
              tabIndex={0}
              data-testid={`route-item-${idx}`}
              onClick={() => onSelectRoute(r.routeId, path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRoute(r.routeId, path);
                }
              }}
              minH={['60px', '80px']}
              w="100%"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              bg="white"
              borderWidth="1px"
              rounded="md"
              px={6}
              py={4}
              cursor="pointer"
              _hover={{ bg: isSelected ? 'orange.100' : 'gray.50' }}
              borderColor={isSelected ? 'orange.300' : 'gray.200'}
              _focusVisible={{
                boxShadow: '0 0 0 3px rgba(66,153,225,.6)',
                borderColor: 'blue.300',
              }}
            >
              <Box textAlign="left">
                <HStack mb={1} spacing={3} align="center">
                  <Tag size="md" colorScheme="gray" variant="subtle">
                    Route {idx + 1}
                  </Tag>
                  <Box
                    w="10px"
                    h="10px"
                    borderRadius="full"
                    bg={color}
                    border="1px solid rgba(0,0,0,0.2)"
                  />
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    {labelLine}
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  {r.distanceKm != null && (
                    <Text fontSize="sm" color="gray.600">
                      {r.distanceKm.toFixed(2)} km
                    </Text>
                  )}
                  {r.duration != null && (
                    <Text fontSize="sm" color="gray.600">
                      {(r.duration / 60).toFixed(1)} min
                    </Text>
                  )}
                </HStack>
              </Box>
              <HStack spacing={2}>
                <IconButton
                  aria-label={isFav ? 'Remove favourite' : 'Add favourite'}
                  aria-pressed={isFav}
                  data-testid={`btn-fav-${r.routeId}`}
                  variant="ghost"
                  colorScheme="yellow"
                  icon={isFav ? <FaStar /> : <FaRegStar />}
                  isDisabled={reachLimit}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavourite(r.routeId);
                  }}
                />
                <Button
                  size="md"
                  colorScheme="green"
                  data-testid={`btn-start-${r.routeId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartClick(r.routeId, navState);
                  }}
                  isDisabled={!r.path}
                  isLoading={startingRouteId === r.routeId}
                  loadingText="Opening…"
                  spinnerPlacement="end"
                >
                  Start
                </Button>
              </HStack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default RouteList;
