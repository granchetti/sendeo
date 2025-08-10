// src/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#fbf7eaff',
      100: '#ffecb3',
      200: '#ffe082',
      300: '#ffd54f',
      400: '#ffca28',
      500: '#ffc107', // PRIMARY (warm yellow-orange)
      600: '#ffb300',
      700: '#ffa000',
      800: '#ff8f00',
      900: '#ff6f00', // Deep orange
    },
    lime: {
      50: '#f9fbe7',
      100: '#f0f4c3',
      200: '#e6ee9c',
      300: '#dce775',
      400: '#d4e157',
      500: '#cddc39', // Lime
      600: '#c0ca33',
      700: '#afb42b',
      800: '#9e9d24',
      900: '#827717',
    },
    darkGreen: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#43a047', // Dark green
      600: '#388e3c',
      700: '#2e7d32',
      800: '#1b5e20',
      900: '#10451a', // Very dark green
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
});
