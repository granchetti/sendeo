import React from 'react';
import {
  Box,
  Heading,
  Stack,
  HStack,
  Tag,
  Text,
} from '@chakra-ui/react';

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
}

const RouteList: React.FC<RouteListProps> = ({
  routes,
  mode,
  originText,
  destinationText,
  distanceKm,
  selectedRoute,
  onSelectRoute,
}) => {
  if (routes.length === 0) return null;
  return (
    <Box bg="white" p={4} rounded="lg" boxShadow="md" w="full" maxW="xxl" mx="auto">
      <Heading size="lg" mb={4}>
        Found Routes
      </Heading>
      <Stack spacing={3}>
        {routes.map((r, idx) => {
          const isSelected = selectedRoute === r.routeId;
          const color = COLORS[idx % COLORS.length];
          const labelLine =
            mode === 'points'
              ? `${originText || 'Origin'} → ${destinationText || 'Destination'}`
              : `${originText || 'Start'} • ${distanceKm} km`;
          return (
            <Box
              key={r.routeId}
              role="button"
              tabIndex={0}
              onClick={() => {
                const rawPath = google.maps.geometry.encoding.decodePath(r.path!);
                const path = rawPath.map((p) => ({ lat: p.lat(), lng: p.lng() }));
                onSelectRoute(r.routeId, path);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const rawPath = google.maps.geometry.encoding.decodePath(r.path!);
                  const path = rawPath.map((p) => ({ lat: p.lat(), lng: p.lng() }));
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
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default RouteList;
