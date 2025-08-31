import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
} from '@chakra-ui/react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  description: string;
  components: Record<string, React.ElementType>;
}

const RouteInfoAccordion: React.FC<Props> = ({ description, components }) => {
  return (
    <Accordion w={['90%', '900px']} defaultIndex={[0]} allowToggle>
      <AccordionItem borderRadius="lg" overflow="hidden">
        <h2>
          <AccordionButton _expanded={{ bg: 'orange.50' }} py={4}>
            <Box flex="1" textAlign="left" fontWeight="bold">
              About this walk
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4} bg="white">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {description}
          </ReactMarkdown>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

export default RouteInfoAccordion;
