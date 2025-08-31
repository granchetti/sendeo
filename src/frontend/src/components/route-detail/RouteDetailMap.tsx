import { Box } from '@chakra-ui/react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import React from 'react';

interface Props {
  center: google.maps.LatLngLiteral;
  path: { lat: number; lng: number }[];
  position?: { lat: number; lng: number } | null;
}

const RouteDetailMap: React.FC<Props> = ({ center, path, position }) => {
  return (
    <Box w={['90%', '900px']} h="700px" borderRadius="md" overflow="hidden" boxShadow="md">
      <GoogleMap mapContainerStyle={{ width: '100%', height: '700px' }} center={center} zoom={14}>
        {path.length > 0 && (
          <Polyline
            path={path}
            options={{ strokeColor: '#ff6f00', strokeOpacity: 1, strokeWeight: 4 }}
          />
        )}
        {position && <Marker position={position} label="You" />}
      </GoogleMap>
    </Box>
  );
};

export default RouteDetailMap;
