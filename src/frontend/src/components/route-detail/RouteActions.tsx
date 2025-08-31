import { Button, HStack } from '@chakra-ui/react';
import React from 'react';

interface Props {
  isTracking: boolean;
  onStart: () => void;
  onFinish: () => void;
  onBack: () => void;
}

const RouteActions: React.FC<Props> = ({ isTracking, onStart, onFinish, onBack }) => {
  return (
    <>
      <HStack spacing={4}>
        <Button colorScheme="green" onClick={onStart} isDisabled={isTracking}>
          Start
        </Button>
        <Button colorScheme="red" onClick={onFinish} isDisabled={!isTracking}>
          Finish
        </Button>
      </HStack>
      <Button variant="link" onClick={onBack} mt={2}>
        ↩ Back to Routes
      </Button>
    </>
  );
};

export default RouteActions;
