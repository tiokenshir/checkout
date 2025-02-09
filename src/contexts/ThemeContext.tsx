import { createContext, useContext, useEffect, useState } from 'react'
import { useColorMode } from '@chakra-ui/react'

type Theme = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  borderRadius: string
  fontFamily: string
}

type ThemeContextType = {
  theme: Theme
  updateTheme: (newTheme: Partial<Theme>) => void
  isDark: boolean
  toggleColorMode: () => void
}

const defaultTheme: Theme = {
  primaryColor: 'brand.500',
  secondaryColor: 'teal.500',
  accentColor: 'purple.500',
  borderRadius: 'md',
  fontFamily: 'system-ui, sans-serif',
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  updateTheme: () => {},
  isDark: false,
  toggleColorMode: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme')
    return saved ? JSON.parse(saved) : defaultTheme
  })
  const { colorMode, toggleColorMode } = useColorMode()

  useEffect(() => {
    localStorage.setItem('app-theme', JSON.stringify(theme))

    // Update CSS variables
    const root = document.documentElement
    root.style.setProperty('--primary-color', theme.primaryColor)
    root.style.setProperty('--secondary-color', theme.secondaryColor)
    root.style.setProperty('--accent-color', theme.accentColor)
    root.style.setProperty('--border-radius', theme.borderRadius)
    root.style.setProperty('--font-family', theme.fontFamily)
  }, [theme])

  function updateTheme(newTheme: Partial<Theme>) {
    setTheme(prev => ({ ...prev, ...newTheme }))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        isDark: colorMode === 'dark',
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)