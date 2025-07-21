import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
} from '@chakra-ui/react';
import { api } from '../services/api';

const RoutesPage = () => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [maxDeltaKm, setMaxDeltaKm] = useState('');
  const [routesCount, setRoutesCount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: {
      origin: string;
      destination?: string;
      distanceKm?: number;
      maxDeltaKm?: number;
      routesCount?: number;
    } = { origin };
    if (destination) data.destination = destination;
    if (distanceKm) data.distanceKm = Number(distanceKm);
    if (maxDeltaKm) data.maxDeltaKm = Number(maxDeltaKm);
    if (routesCount) data.routesCount = parseInt(routesCount, 10);
    try {
      await api.post('/routes', data);
      alert('Route request submitted');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Error requesting routes');
      }
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={4} borderWidth="1px" borderRadius="lg">
      <Heading mb={4}>Request Routes</Heading>
      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <FormControl isRequired>
            <FormLabel>Origin</FormLabel>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Destination</FormLabel>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Distance (km)</FormLabel>
            <Input
              type="number"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Max Delta Km</FormLabel>
            <Input
              type="number"
              value={maxDeltaKm}
              onChange={(e) => setMaxDeltaKm(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Routes Count</FormLabel>
            <Input
              type="number"
              value={routesCount}
              onChange={(e) => setRoutesCount(e.target.value)}
            />
          </FormControl>
          <Button type="submit" colorScheme="orange">
            Submit
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default RoutesPage;
