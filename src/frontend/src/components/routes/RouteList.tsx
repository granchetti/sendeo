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
  if (!encoded || !google.maps.geometry?.encoding) return [];
  const raw = google.maps.geometry.encoding.decodePath(encoded);
  return raw.map((p) => ({ lat: p.lat(), lng: p.lng() }));
};

// Badge reutilizable: • + "Route N"
const RouteBadge: React.FC<{ index: number; color: string }> = ({
  index,
  color,
}) => (
  <HStack spacing={2} align="center">
    <Box
      w={{ base: '8px', sm: '10px' }}
      h={{ base: '8px', sm: '10px' }}
      borderRadius="full"
      bg={color}
      border="1px solid rgba(0,0,0,0.2)"
      flex="0 0 auto"
    />
    <Tag colorScheme="gray" variant="subtle">Route {index}</Tag>
  </HStack>
);

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
  const visibleRoutes = routes.filter((r) => !!r.path);
  if (visibleRoutes.length === 0) return null;

  return (
    <Box bg="white" p={4} rounded="lg" boxShadow="md" w="full" maxW="xxl" mx="auto">
      <Heading size="lg" mb={4} color="gray.800" letterSpacing="tight">
        Found Routes
      </Heading>

      <Stack spacing={3}>
        {visibleRoutes.map((r, idx) => {
          const isSelected = selectedRoute === r.routeId;
          const color = COLORS[idx % COLORS.length];
          const labelLine =
            mode === 'points'
              ? `${originText || 'Origin'} → ${destinationText || 'Destination'}`
              : `${originText || 'Start'} • ${distanceKm} km`;
          const path = decodePolyline(r.path);
          const isFav = favourites.includes(r.routeId);
          const reachLimit = !isFav && favourites.length >= maxFavourites;
          const navState = { displayName: `Route ${idx + 1}`, labelLine, idx };

          return (
            <Box
              key={r.routeId}
              role="button"
              tabIndex={0}
              data-testid={`route-item-${idx}`}
              onClick={() => {
                if (path.length) onSelectRoute(r.routeId, path);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (path.length) onSelectRoute(r.routeId, path);
                }
              }}
              minH={{ base: 'auto', md: '80px' }}
              w="100%"
              display="flex"
              flexDir={{ base: 'column', md: 'row' }}
              justifyContent={{ base: 'initial', md: 'space-between' }}
              alignItems={{ base: 'flex-start', md: 'center' }}
              gap={{ base: 3, md: 0 }}
              bg="white"
              borderWidth="1px"
              rounded="md"
              px={6}
              py={4}
              cursor={r.path ? 'pointer' : 'default'}
              _hover={{ bg: isSelected ? 'orange.100' : 'gray.50' }}
              borderColor={isSelected ? 'orange.300' : 'gray.200'}
              _focusVisible={{ boxShadow: '0 0 0 3px rgba(66,153,225,.6)', borderColor: 'blue.300' }}
            >
              {/* Texto */}
              <Box textAlign="left" flex="1" w="100%">
                {/* MOBILE: badge arriba */}
                <Box display={{ base: 'block', sm: 'none' }} mb={2}>
                  <RouteBadge index={idx + 1} color={color} />
                </Box>

                {/* DESKTOP: badge en línea a la izquierda */}
                <HStack spacing={3} align="center" w="100%">
                  <Box display={{ base: 'none', sm: 'block' }}>
                    <RouteBadge index={idx + 1} color={color} />
                  </Box>

                  <Text
                    fontSize={{ base: 'md', sm: 'lg' }}
                    fontWeight="bold"
                    color="gray.800"
                    noOfLines={{ base: 2, md: 1 }}
                    wordBreak="break-word"
                  >
                    {labelLine}
                  </Text>
                </HStack>

                <HStack spacing={3} mt={2}>
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
                   {r.routeId && (
                    <Text fontSize="sm" color="gray.600">
                       ID: {`${r.routeId.slice(0, 8)}…`}
                    </Text>
                  )}
                </HStack>
              </Box>

              {/* Acciones */}
              <HStack
                spacing={2}
                w={{ base: '100%', md: 'auto' }}
                alignSelf={{ base: 'stretch', md: 'auto' }}
                justify={{ base: 'flex-end', md: 'flex-end' }}
              >
                <IconButton
                  aria-label={isFav ? 'Remove favourite' : 'Add favourite'}
                  aria-pressed={isFav}
                  data-testid={`btn-fav-${r.routeId}`}
                  size={{ base: 'sm', md: 'md' }}
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
                  size={{ base: 'sm', md: 'md' }}
                  flex={{ base: 1, md: 0 }}
                  minW={{ base: '120px', md: '96px' }}
                  whiteSpace="nowrap"
                  data-testid={`btn-start-${r.routeId}`}
                  colorScheme="green"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartClick(r.routeId, navState);
                  }}
                  isDisabled={!r.path}
                  isLoading={startingRouteId === r.routeId}
                  loadingText=""
                  spinnerPlacement="end"
                >
                  Open
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
