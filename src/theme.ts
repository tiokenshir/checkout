import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

export const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.900',
      },
    }),
  },
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'brand.600' : 'brand.600',
          },
        }),
        ghost: (props: any) => ({
          color: props.colorMode === 'dark' ? 'gray.200' : 'gray.700',
          _hover: {
            bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.50',
          },
        }),
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
      }),
    },
    Modal: {
      baseStyle: (props: any) => ({
        dialog: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        },
      }),
    },
    Table: {
      variants: {
        simple: (props: any) => ({
          th: {
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            color: props.colorMode === 'dark' ? 'gray.200' : 'gray.700',
          },
          td: {
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          },
        }),
      },
    },
    Input: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.300',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: `0 0 0 1px ${props.colorMode === 'dark' ? '#0ea5e9' : '#0ea5e9'}`,
            },
          },
        }),
      },
    },
    Select: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.300',
            },
          },
        }),
      },
    },
  },
  transitions: {
    easing: {
      easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    duration: {
      normal: '0.2s',
      fast: '0.1s',
      slow: '0.3s',
    },
  },
})