import { Box } from '@chakra-ui/react';
import {
  GoogleMap,
  Marker,
  Polyline,
} from '@react-google-maps/api';
import React from 'react';
import * as turf from '@turf/turf';

const COLORS = ['#ff6f00', '#388e3c', '#1976d2', '#d32f2f', '#a839e4ff'];
const OFFSET_STEP_KM = 0.005;

export interface Route {
  routeId: string;
  path?: string;
}

interface RouteMapProps {
  center: google.maps.LatLngLiteral;
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  mode: 'points' | 'distance';
  routes: Route[];
  selectedRoute: string | null;
  onSelectRoute: (id: string, path: { lat: number; lng: number }[]) => void;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  mapRef: React.RefObject<google.maps.Map | null>;
}

const RouteMap: React.FC<RouteMapProps> = ({
  center,
  origin,
  destination,
  mode,
  routes,
  selectedRoute,
  onSelectRoute,
  onMapClick,
  mapRef,
}) => {
  return (
    <Box h={{ base: '300px', md: '400px' }} borderRadius="md" overflow="hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        center={origin || center}
        zoom={13}
        onClick={onMapClick}
        options={{ tilt: 45, heading: 90 }}
      >
        {origin && <Marker position={origin} label="A" />}
        {mode === 'points' && destination && (
          <Marker position={destination} label="B" />
        )}
        {routes.map((r, i) => {
          const rawPath = google.maps.geometry.encoding.decodePath(r.path!);
          const coords = rawPath.map((p) => [p.lng(), p.lat()]) as [number, number][];
          const line = turf.lineString(coords);
          const offsetDist = (i - (routes.length - 1) / 2) * OFFSET_STEP_KM;
          const offsetLine = turf.lineOffset(line, offsetDist, { units: 'kilometers' });
          const path = offsetLine.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
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
              onClick={() => onSelectRoute(r.routeId, path)}
            />
          );
        })}
      </GoogleMap>
    </Box>
  );
};

export default RouteMap;
