// src/theme.ts
import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50:  '#e3f9f4',
      100: '#c1ece4',
      200: '#9dddce',
      300: '#7ad0b7',
      400: '#56c2a1',
      500: '#3bad89', // PRIMARY
      600: '#2e8e6f',
      700: '#206b53',
      800: '#134736',
      900: '#041f19',
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
})
